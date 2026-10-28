/**
 * Admin "View as client" impersonation.
 *
 * Flow:
 *   1. Admin calls POST /api/admin/impersonate { clientId }
 *   2. Server signs an impersonation token and sets a short-lived httpOnly cookie.
 *   3. auth.ts resolveUser() reads the cookie; when valid and real user is admin,
 *      sets clientId, effectiveClientId, and isImpersonating on ATGUser.
 *   4. Portal routes read clientId, so the admin sees that client's view.
 *   5. Mutations are blocked by default (blockIfImpersonating middleware).
 *   6. Admin can toggle allowEdits in the banner (PATCH /api/admin/impersonate).
 *   7. EXIT: DELETE /api/admin/impersonate clears the cookie.
 *
 * Security invariants:
 *   - Cookie is httpOnly + sameSite=lax; signed with COOKIE_SECRET.
 *   - Token is only honoured when the real Clerk user is admin.
 *   - AI assist quota is never counted against the client when impersonating.
 *   - All impersonation events are written to the AuditLog.
 */

import { createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";
import type { AuthedRequest } from "./auth";

export const IMP_COOKIE = "atg-imp";
const IMP_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function getSecret(): string {
  return process.env.COOKIE_SECRET ?? "dev-cookie-secret-change-in-production";
}

export interface ImpToken {
  clientId: string;
  adminId: string;       // our internal User.id
  allowEdits: boolean;
  expiresAt: number;     // Date.now() + TTL
}

function sign(payload: ImpToken): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verify(raw: string): ImpToken | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  // Constant-time comparison
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const token = JSON.parse(Buffer.from(encoded, "base64url").toString()) as ImpToken;
    if (Date.now() > token.expiresAt) return null;
    return token;
  } catch { return null; }
}

export function createImpToken(clientId: string, adminId: string, allowEdits = false): string {
  return sign({ clientId, adminId, allowEdits, expiresAt: Date.now() + IMP_TTL_MS });
}

export function setImpCookie(res: Response, value: string): void {
  res.cookie(IMP_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: IMP_TTL_MS,
    path: "/",
  });
}

export function clearImpCookie(res: Response): void {
  res.clearCookie(IMP_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

/**
 * Middleware: blocks mutations when impersonating without allowEdits.
 * Always allows GET/HEAD.
 */
export function blockIfImpersonating(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).atgUser;
  if (!user?.isImpersonating) { next(); return; }
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") { next(); return; }
  if (user.impersonateAllowEdits) { next(); return; }
  res.status(403).json({
    error: "Mutations are blocked while viewing as a client. Enable 'Allow edits' in the admin banner to proceed.",
    impersonating: true,
    allowEditsToggleUrl: "/api/admin/impersonate",
  });
}
