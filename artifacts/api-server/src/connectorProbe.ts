/**
 * Development-only smoke test of Replit-managed Google connectors.
 *
 * Run from the API workspace in a Replit development shell:
 *   pnpm --filter @workspace/api-server exec tsx src/connectorProbe.ts
 *
 * All provider calls are GET / read-only. No HTTP endpoint, OAuth callback,
 * persistent credentials, email bodies, messages or data writes.
 * Do not put tokens or raw provider responses in logs.
 */
type Connector = { id: string; connector_name: string };
type Client = {
  listConnections: () => Promise<unknown>;
  proxy: (name: string, path: string, options: { connectionId: string }) => Promise<unknown>;
};
export type ProbeState = "pass" | "not_connected" | "needs_test_document" | "error";
export type ProbeResult = { service: string; state: ProbeState; detail: string };

const specs = [
  { service: "Gmail", pattern: /^(gmail|google-gmail)$/i, path: "/gmail/v1/users/me/profile" },
  { service: "Google Drive", pattern: /^(google-drive|google_drive|drive)$/i, path: "/drive/v3/about?fields=user(emailAddress)" },
  { service: "Google Sheets", pattern: /^(google-sheet|google-sheets|google_sheet)$/i, path: null },
  { service: "Google Calendar", pattern: /^(google-calendar|google_calendar)$/i, path: "/calendar/v3/users/me/calendarList?maxResults=1" },
  { service: "Google Docs", pattern: /^(google-docs|google-doc)$/i, path: null },
] as const;

function isRecord(input: unknown): input is Record<string, unknown> {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}
export function parseConnections(result: unknown): Connector[] {
  const body = isRecord(result) && isRecord(result.data) ? result.data : result;
  const rows = Array.isArray(body) ? body
    : isRecord(body) && Array.isArray(body.connections) ? body.connections
    : isRecord(body) && Array.isArray(body.items) ? body.items
    : isRecord(body) && Array.isArray(body.data) ? body.data : [];
  return rows.flatMap((value): Connector[] => {
    if (!isRecord(value)) return [];
    const id = value.id;
    const name = value.connector_name ?? value.connectorName;
    return typeof id === "string" && typeof name === "string" ? [{ id, connector_name: name }] : [];
  });
}
export function classifyError(err: unknown): string {
  const status = isRecord(err) && typeof err.status === "number" ? err.status
    : isRecord(err) && isRecord(err.response) && typeof err.response.status === "number" ? err.response.status : null;
  if (status === 401) return "Authorization rejected (401). Check connector grant and Replit runtime binding.";
  if (status === 403) return "Access denied (403). Check Google account and connector permissions.";
  if (status === 404) return "API route or connection not found (404). Inspect connector's generated Replit SDK example.";
  if (status === 429) return "Provider rate limited the request (429).";
  return status ? `Read-only connector request failed (HTTP ${status}).` : "Connector request failed. Inspect Replit runtime diagnostics privately.";
}
async function callReadOnly(client: Client, conn: Connector, path: string): Promise<void> {
  const result = await client.proxy(conn.connector_name, path, { connectionId: conn.id });
  if (isRecord(result) && typeof result.status === "number" && result.status >= 400) {
    throw { status: result.status };
  }
  // SDK versions may return either a fetch-like Response or an already parsed object.
  // We intentionally do not consume or print the provider response body.
}
export async function runConnectorProbe(client: Client, opts: { sheetId?: string; docId?: string } = {}): Promise<ProbeResult[]> {
  const connections = parseConnections(await client.listConnections());
  return Promise.all(specs.map(async (spec): Promise<ProbeResult> => {
    const conn = connections.find(c => spec.pattern.test(c.connector_name));
    if (!conn) return { service: spec.service, state: "not_connected", detail: "Not available to this Replit app runtime." };
    const path = spec.service === "Google Sheets"
      ? opts.sheetId ? `/v4/spreadsheets/${encodeURIComponent(opts.sheetId)}?fields=spreadsheetId,properties(title)` : null
      : spec.service === "Google Docs"
      ? opts.docId ? `/v1/documents/${encodeURIComponent(opts.docId)}?fields=documentId,title` : null
      : spec.path;
    if (!path) return { service: spec.service, state: "needs_test_document",
      detail: "Connection discovered. A specifically authorized test Sheet or Doc ID is required to verify data access." };
    try {
      await callReadOnly(client, conn, path);
      return { service: spec.service, state: "pass", detail: "Read-only provider request completed." };
    } catch (err) {
      return { service: spec.service, state: "error", detail: classifyError(err) };
    }
  }));
}
class ProbeInitializationError {
  constructor(
    readonly phase: "sdk_import" | "constructor" | "discovery",
    readonly cause: unknown,
  ) {}
}
/** Only allowlisted error attributes; never dump provider or credential-bearing responses. */
export function explainInitializationError(error: unknown, phase: "sdk_import"|"constructor"|"discovery"): string {
  const status = isRecord(error) && typeof error.status === "number" ? error.status
    : isRecord(error) && isRecord(error.response) && typeof error.response.status === "number" ? error.response.status : null;
  const name = isRecord(error) && typeof error.name === "string" ? error.name : "";
  const knownName = ["TypeError","ReferenceError","APIConnectionError","APIConnectionTimeoutError","AuthenticationError","PermissionDeniedError","NotFoundError","FetchError"].includes(name) ? name : "UnknownError";
  const parts = [`phase=${phase}`, `category=${knownName}`];
  if (status !== null && Number.isInteger(status) && status >= 100 && status < 600) parts.push(`http=${status}`);
  if (phase === "discovery" && knownName === "TypeError")
    parts.push("hint=SDK method signature may not match the installed package");
  if (phase === "discovery" && status === 401)
    parts.push("hint=connector identity may not be granted to this Repl");
  if (phase === "discovery" && status === 403)
    parts.push("hint=connector permissions may be missing for this Repl");
  return parts.join(" | ");
}
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Connector diagnostic must not run in production.");
  }
  // SDK is already declared at the ATG repository root; import it from
  // the Replit runtime rather than implementing or logging OAuth tokens.
  let sdk: typeof import("@replit/connectors-sdk");
  try { sdk = await import("@replit/connectors-sdk"); }
  catch (error) { throw new ProbeInitializationError("sdk_import", error); }
  let client: InstanceType<typeof sdk.ReplitConnectors>;
  try { client = new sdk.ReplitConnectors(); }
  catch (error) { throw new ProbeInitializationError("constructor", error); }
  if (typeof client.listConnections !== "function")
    throw new ProbeInitializationError("discovery", new TypeError("missing expected method"));
  console.log("SDK loaded and client constructed; discovering Replit app connector bindings.");
  let results: ProbeResult[];
  try {
    results = await runConnectorProbe(client, {
      sheetId: process.env.ATG_GOOGLE_CONNECTOR_TEST_SHEET_ID,
      docId: process.env.ATG_GOOGLE_CONNECTOR_TEST_DOC_ID,
    });
  } catch (error) { throw new ProbeInitializationError("discovery", error); }
  console.log("\nATG Replit Google connector smoke test (read-only)\n");
  for (const r of results) console.log(`${r.service}: ${r.state.toUpperCase()} | ${r.detail}`);
  console.log("\nNo messages were sent; no Google files were modified.\n");
  if (results.some(r => r.state === "error")) process.exitCode = 1;
}
if (process.argv[1]?.endsWith("connectorProbe.ts")) {
  main().catch((err: unknown) => {
    const phase = err instanceof ProbeInitializationError ? err.phase : "discovery";
    const cause = err instanceof ProbeInitializationError ? err.cause : err;
    console.error("Probe initialization failed: " + explainInitializationError(cause, phase));
    process.exitCode = 1;
  });
}
