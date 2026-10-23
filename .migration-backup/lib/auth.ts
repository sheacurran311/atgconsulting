// ── Auth adapter boundary ─────────────────────────────────────────────────────
//
// ATG Consulting uses Replit Auth for registration and login.
// Replit Auth injects the authenticated user via the `X-Replit-User-*` HTTP headers
// when the app is deployed on Replit (it is a no-op in local dev unless mocked).
//
// TODO (next phase): implement the client portal, admin view, and per-user submission
// history by consuming these headers in Server Components / Route Handlers.
//
// References:
//   https://docs.replit.com/additional-resources/repl-auth
//   Replit injects:  X-Replit-User-Id, X-Replit-User-Name, X-Replit-User-Roles,
//                    X-Replit-User-Bio, X-Replit-User-Profile-Image, X-Replit-User-Url
//
// To swap in a different auth provider later, update only this file and the Prisma
// User model — no route handlers or components need to change.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextRequest } from "next/server";

export interface ATGUser {
  id: string;       // Replit user ID
  name: string;     // Replit display name
  isAdmin: boolean; // true if user is Shea (ADMIN_REPLIT_ID env var)
}

// ── Server-side helpers (for use in Route Handlers and Server Components) ────

/**
 * Returns the authenticated Replit user from request headers, or null if not signed in.
 * In local dev (headers absent) always returns null unless MOCK_USER is set.
 */
export function getCurrentUser(req: NextRequest): ATGUser | null {
  // Local dev mock: set MOCK_USER=1 and MOCK_USER_ID / MOCK_USER_NAME in .env.local
  if (process.env.MOCK_USER === "1") {
    return {
      id: process.env.MOCK_USER_ID ?? "dev-user",
      name: process.env.MOCK_USER_NAME ?? "Dev User",
      isAdmin: process.env.MOCK_USER_ADMIN === "1",
    };
  }

  const id = req.headers.get("x-replit-user-id");
  const name = req.headers.get("x-replit-user-name");
  if (!id || !name) return null;

  const adminId = process.env.ADMIN_REPLIT_ID ?? "";
  return {
    id,
    name,
    isAdmin: !!adminId && id === adminId,
  };
}

/**
 * Returns the user or throws a 401-shaped error object if not authenticated.
 * Use in Route Handlers that require login.
 */
export function requireUser(req: NextRequest): ATGUser {
  const user = getCurrentUser(req);
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }
  return user;
}

/**
 * Returns the user or throws a 403-shaped error object if not an admin.
 * Use in Route Handlers that are Shea-only (admin view, submission export, etc.).
 */
export function requireAdmin(req: NextRequest): ATGUser {
  const user = requireUser(req);
  if (!user.isAdmin) {
    throw Object.assign(new Error("Admin access required"), { status: 403 });
  }
  return user;
}
