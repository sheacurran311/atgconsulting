import { useEffect, useState } from "react";

const providers = {searchConsole: "Google Search Console", analytics: "Google Analytics 4"} as const;
type Provider = keyof typeof providers;
type Connection = {provider: Provider; property: string | null; status: string; freshness: string};
type Property = {id: string; name: string};
const path = "/api/client/seo/connections";
async function api<T>(url: string, method = "GET", content: unknown = {}) {
  const response = await fetch(url, {method, credentials: "include", cache: "no-store", ...(method !== "GET" && {
    headers: {"Content-Type": "application/json"}, body: JSON.stringify(content),
  })});
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error ?? "Unable to complete the Google SEO request.");
  return result as T;
}

export default function GoogleSeoConnections() {
  const [enabled, setEnabled] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [notice, setNotice] = useState(() => {
    const status = new URLSearchParams(window.location.search).get("google");
    if (status === "connected") return "Google consent recorded. Choose the property to share.";
    if (status === "cancelled") return "Google connection was cancelled.";
    if (status === "error") return "The Google connection could not be confirmed. Try connecting again.";
    return "";
  });
  async function reload() {
    const result = await api<{enabled: boolean; connections: Connection[]}>(path);
    setEnabled(result.enabled);
    setConnections(result.connections);
  }
  useEffect(() => {void reload().catch(() => null);}, []);
  if (!enabled) return null;
  return <section id="google-seo" className="mb-8 space-y-3" aria-labelledby="google-seo-title">
    <h2 id="google-seo-title" className="text-xl font-extrabold">Google search and website data</h2>
    <p className="text-sm">Authorize read-only access and select the property ATG can monitor. Disconnecting removes the connection and its unpublished snapshots.</p>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {(Object.keys(providers) as Provider[]).map(provider => <GoogleSource key={provider} provider={provider}
      connection={connections.find(item => item.provider === provider)} onChange={reload} />)}
  </section>;
}

function GoogleSource({provider, connection, onChange}: {
  provider: Provider; connection: Connection | undefined; onChange: () => Promise<void>;
}) {
  const [properties, setProperties] = useState<Property[]>();
  const [property, setProperty] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const url = path + "/" + provider;
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {await action();}
    catch (err) {setMessage(err instanceof Error ? err.message : "The request could not be completed.");}
    finally {setBusy(false);}
  }
  return <article className="space-y-2 rounded-xl border border-canvas-border bg-canvas-1 p-4">
    <h3 className="font-bold">{providers[provider]}</h3>
    <p className="break-words text-sm">{connection?.property ?? (connection ? "Select a property" : "Connection available")}{connection?.property && " · " + connection.freshness}</p>
    <div className="flex flex-wrap gap-2">
      {(!connection || connection.status === "reconnect") && <button type="button" className="btn-primary" disabled={busy} onClick={() => void run(async () => {
        const result = await api<{url: string}>(url + "/start", "POST");
        const target = new URL(result.url);
        if (target.origin !== "https://accounts.google.com") throw new Error("The authorization address is invalid.");
        window.location.assign(target.href);
      })}>{connection ? "Reconnect" : "Connect " + providers[provider]}</button>}
      {connection && connection.status !== "reconnect" && <button type="button" className="btn-ghost" disabled={busy} onClick={() => void run(async () => {
        const result = await api<{properties: Property[]}>(url + "/properties");
        setProperties(result.properties);
        setProperty(connection.property ?? "");
      })}>Choose property</button>}
      {connection && !confirmDisconnect && <button type="button" className="btn-ghost" disabled={busy} onClick={() => setConfirmDisconnect(true)}>Disconnect</button>}
    </div>
    {properties && <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 text-sm font-semibold">Authorized property
        <select value={property} onChange={event => setProperty(event.target.value)}
          className="block max-w-full rounded-lg border border-canvas-border bg-canvas-1 p-2">
          <option value="">Select a property</option>{properties.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <button type="button" className="btn-primary" disabled={busy || !property} onClick={() => void run(async () => {
        await api(url + "/property", "PUT", {property});
        await onChange();
        setProperties(undefined);
        setMessage("Authorized property saved.");
      })}>Share selected property</button>
    </div>}
    {confirmDisconnect && <div className="space-y-2">
      <p className="text-sm">Google may also revoke related permissions for this Google account. Disconnecting removes unpublished snapshots for this connection.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void run(async () => {
          const result = await api<{revoked?: boolean}>(url, "DELETE");
          await onChange();
          setProperties(undefined);
          setConfirmDisconnect(false);
          setMessage(result.revoked === false ? "Disconnected at ATG. Review related permissions in your Google account." : "Google connection removed.");
        })}>Confirm disconnect</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => setConfirmDisconnect(false)}>Cancel</button>
      </div>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </article>;
}
