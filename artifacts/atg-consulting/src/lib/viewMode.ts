/**
 * Remembers when an admin chose the client portal on purpose.
 * A new Clerk sign-in clears that choice so admins land in the admin console.
 */

const CLIENT_VIEW_KEY = "atg-client-view";
const USER_KEY = "atg-signed-in-user";

export function markClientView(): void {
  sessionStorage.setItem(CLIENT_VIEW_KEY, "1");
}

export function clearClientView(): void {
  sessionStorage.removeItem(CLIENT_VIEW_KEY);
}

export function wantsClientView(): boolean {
  return sessionStorage.getItem(CLIENT_VIEW_KEY) === "1";
}

/** Call before reading wantsClientView so a different account does not inherit it. */
export function syncSignedInUser(userId: string): void {
  if (sessionStorage.getItem(USER_KEY) === userId) return;
  sessionStorage.setItem(USER_KEY, userId);
  sessionStorage.removeItem(CLIENT_VIEW_KEY);
}
