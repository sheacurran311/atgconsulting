/**
 * Auth adapter — wraps Clerk for the Express API server.
 *
 * Clerk is the auth provider installed by Replit Agent. This thin adapter keeps
 * role logic and user-identity mapping in one place so swapping providers later
 * only requires updating this file and the AuthIdentity table wiring.
 *
 * Server-side Clerk API: getAuth(req) from @clerk/express
 *   → returns { userId: string | null }
 *   → clerkClient.users.getUser(userId) for the full user record
 *
 * ADMIN_EMAILS (comma-separated, env var): any verified email in this list gets
 * role=ADMIN on every authenticated request. Removing an email immediately demotes.
 * Default: shea@atgconsulting.io
 */

import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "./db";
import { IMP_COOKIE } from "./impersonate";

export interface ATGUser {
  id: string;          // our internal User.id (cuid)
  clerkId: string;     // Clerk user id
  email: string | null;
  name: string | null;
  imageUrl: string | null;
  role: "CLIENT" | "ADMIN";
  clientId: string | null; // Client.id if exists

  // Impersonation fields — set when admin uses "View as client"
  isImpersonating: boolean;
  /** When impersonating: the client's id the admin is viewing as */
  effectiveClientId: string | null;
  /** Whether edits are allowed during this impersonation session */
  impersonateAllowEdits: boolean;
}

// ── Admin email list ──────────────────────────────────────────────────────────

const ADMIN_EMAILS_RAW = process.env.ADMIN_EMAILS ?? "shea@atgconsulting.io";
function isAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const list = ADMIN_EMAILS_RAW.split(",").map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}

// ── Identity upsert ──────────────────────────────────────────────────────────

export async function resolveUser(req: Request): Promise<ATGUser | null> {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) return null;

  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress?.toLowerCase() ?? null;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
  const imageUrl = clerkUser.imageUrl ?? null;
  const role = isAdminEmail(email) ? "ADMIN" : "CLIENT";

  // Upsert User via AuthIdentity (provider=clerk, providerUserId=clerkId)
  let identity = await prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider: "clerk", providerUserId: clerkId } },
    include: { user: { include: { client: true } } },
  });

  if (!identity) {
    // Try to find existing User by email (plan-claim link)
    const existingUser = email
      ? await prisma.user.findUnique({ where: { email }, include: { client: true } })
      : null;

    if (existingUser) {
      identity = await prisma.authIdentity.create({
        data: { provider: "clerk", providerUserId: clerkId, userId: existingUser.id },
        include: { user: { include: { client: true } } },
      });
    } else {
      identity = await prisma.authIdentity.create({
        data: {
          provider: "clerk",
          providerUserId: clerkId,
          user: {
            create: { email, name, imageUrl, role, lastLoginAt: new Date() },
          },
        },
        include: { user: { include: { client: true } } },
      });
    }
  }

  // Keep User fields fresh on every login
  await prisma.user.update({
    where: { id: identity.userId },
    data: { email, name, imageUrl, role, lastLoginAt: new Date() },
  });

  const user = identity.user;
  const baseUser: ATGUser = {
    id: user.id,
    clerkId,
    email,
    name,
    imageUrl,
    role: role as "CLIENT" | "ADMIN",
    clientId: user.client?.id ?? null,
    isImpersonating: false,
    effectiveClientId: null,
    impersonateAllowEdits: false,
  };

  // ── Impersonation cookie check ──────────────────────────────────────────────
  // Only honored when the real Clerk user is admin.
  if (role === "ADMIN") {
    const rawCookie = (req.cookies as Record<string, string> | undefined)?.[IMP_COOKIE];
    if (rawCookie) {
      const { verify: verifyImp } = await import("./impersonate");
      const token = verifyImp(rawCookie);
      if (token && token.adminId === user.id) {
        return {
          ...baseUser,
          isImpersonating: true,
          effectiveClientId: token.clientId,
          impersonateAllowEdits: token.allowEdits,
          // clientId stays the admin's own clientId for identity; routes use effectiveClientId
        };
      }
    }
  }

  return baseUser;
}

// ── Express middleware helpers ────────────────────────────────────────────────

/** Resolves the current user and attaches it to req. Does not block unauthenticated requests. */
export async function withUser(req: Request, _res: Response, next: NextFunction) {
  try {
    (req as AuthedRequest).atgUser = await resolveUser(req);
  } catch {
    (req as AuthedRequest).atgUser = null;
  }
  next();
}

/** Blocks if not authenticated. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).atgUser;
  if (!user) { res.status(401).json({ error: "Sign in to continue." }); return; }
  next();
}

/** Blocks if not ADMIN. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).atgUser;
  if (!user) { res.status(401).json({ error: "Sign in to continue." }); return; }
  if (user.role !== "ADMIN") { res.status(403).json({ error: "Admin access required." }); return; }
  next();
}

export interface AuthedRequest extends Request {
  atgUser?: ATGUser | null;
}
