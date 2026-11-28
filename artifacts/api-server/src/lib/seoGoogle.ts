import {createCipheriv, createDecipheriv, createHash, randomBytes} from "node:crypto";
import { z } from "zod";
import { SEO_GOOGLE_SCOPES, type SeoGoogleIntegration } from "./seoGoogleScopes";
import { gaPeriod, gscPeriod } from "./seoEvidence";

export const googleProvider = z.enum(["searchConsole", "analytics"]);
export const callbackPath = "/api/client/seo/google-callback";
const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const revokeEndpoint = "https://oauth2.googleapis.com/revoke";
const gscEndpoint = "https://www.googleapis.com/webmasters/v3/sites";
const gaAdminEndpoint = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
const gaDataEndpoint = "https://analyticsdata.googleapis.com/v1beta/";
const allowedGscRoles = new Set(["siteOwner", "siteFullUser", "siteRestrictedUser"]);
const calendarDate = z.string().date();
const utcDay = 86_400_000;

export const googleWindow = z.object({start: calendarDate, end: calendarDate}).strict().refine(({start, end}) => {
  const elapsed = Date.parse(end) - Date.parse(start);
  return elapsed >= 0 && elapsed < 90 * utcDay && Date.parse(end) < Date.now() - 3 * utcDay;
}, "Use a chronological window of up to 90 days that ended at least three days ago.");

export function googleSeoConfig() {
  const {ATG_GOOGLE_SEO_ENABLED, ATG_GOOGLE_SEO_CLIENT_ID: clientId, ATG_GOOGLE_SEO_CLIENT_SECRET: clientSecret,
    ATG_GOOGLE_SEO_ENCRYPTION_KEY: key, APP_URL} = process.env;
  if (ATG_GOOGLE_SEO_ENABLED !== "true" || !clientId || !clientSecret || !key || !APP_URL) return null;
  const encryptionKey = Buffer.from(key, "base64");
  if (encryptionKey.length !== 32) return null;
  try {
    const origin = new URL(APP_URL);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") return null;
    return {clientId, clientSecret, encryptionKey, origin: origin.origin, redirectUri: origin.origin + callbackPath};
  } catch {return null;}
}

type Config = NonNullable<ReturnType<typeof googleSeoConfig>>;
export const sha256 = (value: string) => createHash("sha256").update(value).digest("base64url");
export const randomSecret = () => randomBytes(32).toString("base64url");

export function seal(value: string, key: Buffer, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const content = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), content].map(part => part.toString("base64url")).join(".");
}
export function unseal(value: string, key: Buffer, context: string) {
  const parts = value.split(".").map(part => Buffer.from(part, "base64url"));
  if (parts.length !== 3 || parts[0]!.length !== 12 || parts[1]!.length !== 16) throw new Error("Invalid encrypted credential.");
  const decipher = createDecipheriv("aes-256-gcm", key, parts[0]!);
  decipher.setAuthTag(parts[1]!);
  decipher.setAAD(Buffer.from(context));
  return Buffer.concat([decipher.update(parts[2]!), decipher.final()]).toString("utf8");
}

export function googleAuthorize(config: Config, provider: SeoGoogleIntegration, state: string, verifier: string) {
  const params = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: SEO_GOOGLE_SCOPES[provider],
    state, code_challenge: sha256(verifier), code_challenge_method: "S256", access_type: "offline", prompt: "consent",
  });
  return authorizationEndpoint + "?" + params;
}

export class GoogleSeoError extends Error {
  constructor(readonly status: number, readonly reason: "permission" | "quota" | "unavailable" | "unexpected") {
    super("Google SEO request could not be completed.");
  }
}
async function googleRequest(url: string, init: RequestInit = {}, fetcher: typeof fetch = fetch): Promise<unknown> {
  const res = await fetcher(url, {...init, redirect: "error", signal: AbortSignal.timeout(8000)})
    .catch(() => {throw new GoogleSeoError(503, "unavailable");});
  const body: unknown = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 403 || (res.status === 400 && z.object({error: z.literal("invalid_grant")}).safeParse(body).success)) {
    throw new GoogleSeoError(409, "permission");
  }
  if (!res.ok) throw new GoogleSeoError(res.status === 429 ? 429 : 502, res.status === 429 ? "quota" : "unavailable");
  return body;
}
const form = (data: Record<string, string>): RequestInit => ({method: "POST", body: new URLSearchParams(data)});
const bearer = (token: string, body?: unknown): RequestInit => body === undefined
  ? {headers: {Authorization: "Bearer " + token}}
  : {method: "POST", headers: {Authorization: "Bearer " + token, "Content-Type": "application/json"}, body: JSON.stringify(body)};

const tokenResponse = z.object({access_token: z.string().min(1), refresh_token: z.string().min(1).optional(), scope: z.string().optional()});
function strictScope(scope: string | undefined, provider: SeoGoogleIntegration, requireScope: boolean) {
  if ((!scope && requireScope) || (scope && scope.trim() !== SEO_GOOGLE_SCOPES[provider])) throw new GoogleSeoError(409, "permission");
}
export async function googleExchange(config: Config, provider: SeoGoogleIntegration, code: string, verifier: string, fetcher = fetch) {
  const result = tokenResponse.parse(await googleRequest(tokenEndpoint, form({
    client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri,
    code, code_verifier: verifier, grant_type: "authorization_code",
  }), fetcher));
  strictScope(result.scope, provider, true);
  if (!result.refresh_token) throw new GoogleSeoError(409, "permission");
  return result.refresh_token;
}
export async function googleRefresh(config: Config, provider: SeoGoogleIntegration, refreshToken: string, fetcher = fetch) {
  const result = tokenResponse.parse(await googleRequest(tokenEndpoint, form({
    client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token",
  }), fetcher));
  strictScope(result.scope, provider, false);
  return {accessToken: result.access_token, refreshToken: result.refresh_token};
}
export async function googleRevoke(refreshToken: string, fetcher = fetch) {
  const res = await fetcher(revokeEndpoint, {...form({token: refreshToken}), redirect: "error", signal: AbortSignal.timeout(8000)});
  return res.ok;
}

const siteList = z.object({siteEntry: z.array(z.object({siteUrl: z.string(), permissionLevel: z.string()})).default([])});
const accountList = z.object({accountSummaries: z.array(z.object({
  propertySummaries: z.array(z.object({property: z.string(), displayName: z.string()})).default([]),
})).default([]), nextPageToken: z.string().optional()});
const gaProperty = /^properties\/\d{1,30}$/;
const siteProperty = /^(sc-domain:[A-Za-z0-9.-]+|https?:\/\/[^\s]{1,500})$/;
export async function googleProperties(provider: SeoGoogleIntegration, token: string, fetcher = fetch) {
  if (provider === "searchConsole") {
    const result = siteList.parse(await googleRequest(gscEndpoint, bearer(token), fetcher));
    return result.siteEntry.filter(site => allowedGscRoles.has(site.permissionLevel) && siteProperty.test(site.siteUrl))
      .slice(0, 500).map(site => ({id: site.siteUrl, name: site.siteUrl}));
  }
  const properties: {id: string; name: string}[] = [];
  let next: string | undefined;
  for (let page = 0; page < 5; page++) {
    const url = new URL(gaAdminEndpoint);
    url.searchParams.set("pageSize", "200");
    if (next) url.searchParams.set("pageToken", next);
    const result = accountList.parse(await googleRequest(url.href, bearer(token), fetcher));
    properties.push(...result.accountSummaries.flatMap(item => item.propertySummaries.filter(property => gaProperty.test(property.property))
      .map(property => ({id: property.property, name: property.displayName.slice(0, 150)}))));
    next = result.nextPageToken;
    if (!next || properties.length >= 500) break;
  }
  return [...new Map(properties.map(item => [item.id, item])).values()].slice(0, 500);
}

const gscResult = z.object({rows: z.array(z.object({clicks: z.number(), impressions: z.number(), ctr: z.number(), position: z.number()})).default([])});
const gaResult = z.object({
  rows: z.array(z.object({metricValues: z.array(z.object({value: z.string().regex(/^\d+(\.\d+)?$/)})).length(2)})).default([]),
  metadata: z.object({subjectToThresholding: z.boolean().optional(), dataLossFromOtherRow: z.boolean().optional()}).optional(),
});
export async function googleMetrics(provider: SeoGoogleIntegration, property: string, token: string, input: z.infer<typeof googleWindow>, fetcher = fetch) {
  const window = googleWindow.parse(input);
  if (provider === "searchConsole" && siteProperty.test(property)) {
    const result = gscResult.parse(await googleRequest(gscEndpoint + "/" + encodeURIComponent(property) + "/searchAnalytics/query", bearer(token, {
      startDate: window.start, endDate: window.end, type: "web", dataState: "final", rowLimit: 1,
    }), fetcher));
    const row = result.rows[0];
    return row ? gscPeriod.parse({...window, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, averagePosition: row.position}) : null;
  }
  if (provider === "analytics" && gaProperty.test(property)) {
    const result = gaResult.parse(await googleRequest(gaDataEndpoint + property + ":runReport", bearer(token, {
      dateRanges: [{startDate: window.start, endDate: window.end}],
      metrics: [{name: "sessions"}, {name: "keyEvents"}],
      dimensionFilter: {filter: {fieldName: "sessionDefaultChannelGroup", stringFilter: {matchType: "EXACT", value: "Organic Search"}}},
    }), fetcher));
    const row = result.rows[0];
    return row && !result.metadata?.subjectToThresholding && !result.metadata?.dataLossFromOtherRow
      ? gaPeriod.parse({...window, organicSessions: Number(row.metricValues[0]!.value), keyEvents: Number(row.metricValues[1]!.value)}) : null;
  }
  throw new GoogleSeoError(422, "unexpected");
}
