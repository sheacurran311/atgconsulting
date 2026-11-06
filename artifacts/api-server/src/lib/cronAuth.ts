/** CRON_SECRET via Authorization: Bearer or the x-cron-secret header. */
export function presentedCronSecret(headers: Record<string, string | string[] | undefined>): string | null {
  const header = headers["x-cron-secret"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const authorization = headers.authorization ?? headers.Authorization;
  if (typeof authorization === "string") {
    const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization.trim());
    if (match?.[1]) return match[1];
  }
  return null;
}

export function cronAuthorized(expected: string | undefined, presented: string | null): boolean {
  return Boolean(expected && presented && expected === presented);
}
