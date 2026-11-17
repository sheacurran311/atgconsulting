/**
 * Only Google Search Console and Google Analytics 4 are approved for ATG OAuth.
 * These read-only scopes support Guided and Do-It-For-You SEO analysis only.
 * This allowlist is not an OAuth client implementation.
 */
export const SEO_GOOGLE_SCOPES = Object.freeze({
  searchConsole: "https://www.googleapis.com/auth/webmasters.readonly",
  analytics: "https://www.googleapis.com/auth/analytics.readonly",
});
export type SeoGoogleIntegration = keyof typeof SEO_GOOGLE_SCOPES;
export type SeoServiceTier = "GUIDED" | "WHITE_GLOVE" | "NONE" | "SELF_SERVE";

export function approvedSeoScopes(
  tier: SeoServiceTier,
  integrations: ReadonlyArray<SeoGoogleIntegration>,
): string[] {
  if (tier !== "GUIDED" && tier !== "WHITE_GLOVE")
    throw new Error("Google SEO connections require an active Guided or Do-It-For-You entitlement.");
  const valid = new Set(Object.keys(SEO_GOOGLE_SCOPES));
  for (const integration of integrations)
    if (!valid.has(integration)) throw new Error("Unapproved Google integration.");
  return [...new Set(integrations.map((name) => SEO_GOOGLE_SCOPES[name]))];
}

export const SEO_CONNECTOR_RELEASE_GATES = Object.freeze([
  "OAuth callback state and PKCE validation",
  "Read-only scopes and minimal property access",
  "Encrypted tokens at rest and no token logging",
  "Per-client property selection and strict tenant isolation",
  "Disconnect and token revocation",
  "Consent, privacy policy and verification requirements",
  "Data freshness and source attribution on every recommendation",
  "Scheduled fetch, retries, limits and error visibility",
]);
