# Replit Auth / Auth Setup

## Current state

Authentication is handled by **Clerk**, which was set up by Replit Agent during the initial app configuration (not Replit Auth — Clerk was what Agent actually implemented).

The auth adapter boundary is in `artifacts/api-server/src/lib/auth.ts`. It exposes:

- `resolveUser(req)` → `ATGUser | null` — resolves a Clerk session to an internal `User` record, upserting `AuthIdentity` on first login
- `withUser` — Express middleware that attaches `req.atgUser`
- `requireAuth` — blocks unauthenticated requests (401)
- `requireAdmin` — blocks non-admin requests (403)

**Admin emails:** set `ADMIN_EMAILS=shea@atgconsulting.io` in Replit Secrets. Any verified email in this list gets `role=ADMIN` on login.

## Clerk setup checklist (Replit)

1. In Clerk dashboard, create an application and get the **Publishable Key** and **Secret Key**.
2. In Replit Secrets, add:
   - `CLERK_PUBLISHABLE_KEY` (for the frontend Vite build — prefix with `VITE_` if needed, or configure via the proxy)
   - `CLERK_SECRET_KEY` (for the Express API server)
3. The Clerk proxy middleware in `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` routes Clerk traffic through the same domain.
4. Set the allowed origins in the Clerk dashboard to include your Replit dev URL and `atgconsulting.io`.

## Roles

- Everyone who logs in gets `CLIENT` by default.
- Anyone whose verified email is in `ADMIN_EMAILS` gets `ADMIN`.
- The `User.role` column is updated on every login, so removing an email from `ADMIN_EMAILS` demotes the user immediately.

## Swapping auth providers

To replace Clerk with another provider:
1. Update `artifacts/api-server/src/lib/auth.ts` — specifically `resolveUser()`.
2. Update the frontend Clerk provider in `artifacts/atg-consulting/src/App.tsx`.
3. The rest of the app (routes, admin, client portal) uses only `req.atgUser` and the `ATGUser` type — no changes needed.

## If you want to switch to Replit Auth later

Paste this into Replit Agent after importing the repo:

> "Add Replit Auth to this app. Do not create new user tables. Implement `resolveUser()` in `artifacts/api-server/src/lib/auth.ts` using Replit's X-Replit-User-* headers. Return the Replit user id as `providerUserId`, and map it to our existing `User`/`AuthIdentity` tables. Replace the Clerk middleware in `artifacts/api-server/src/app.ts` and remove Clerk from the frontend. Keep all role logic (ADMIN_EMAILS check) in `auth.ts` as-is."
