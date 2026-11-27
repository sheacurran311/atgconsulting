import { useEffect, useState } from "react";
import { adminJson } from "@/lib/adminWork";

type Review = {sourceUrl: string; status: string; observedAt: string; observations: string[]; contacts?: string[]};
type Response = {enabled: boolean; reviews: Review[]};

export default function ProspectSiteReview({prospectId, enabledForProspect, onSelect, onContact}: {
  prospectId: string; enabledForProspect: boolean; onSelect: (claim: string, url: string) => void; onContact: (email: string, url: string) => void;
}) {
  const [data, setData] = useState<Response>();
  const [page, setPage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = "/api/admin/prospecting/" + encodeURIComponent(prospectId) + "/site-review";
  useEffect(() => {
    let active = true;
    adminJson<Response>(endpoint).then(result => {if (active) setData(result);})
      .catch(() => null);
    return () => {active = false;};
  }, [endpoint]);
  if (!data?.enabled || !enabledForProspect) return null;
  return <section className="space-y-3 rounded-lg border border-canvas-border p-3 text-sm">
    <h3 className="font-bold">Official website review</h3>
    <label className="block">Official contact page URL (optional)
      <input type="url" className="field-input mt-1 w-full" value={page} onChange={event => {setPage(event.target.value); setConfirmed(false);}} />
    </label>
    <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
      I reviewed the official URL and confirmed the site permits this check.</label>
    <button type="button" className="btn-ghost" disabled={busy || !confirmed} onClick={async () => {
      setBusy(true);
      setError("");
      try {
        const review = await adminJson<Review>(endpoint, {
          method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({confirmedOfficialAndAllowed: true, page: page.trim() || undefined}),
        });
        setData({...data, reviews: [review, ...data.reviews].slice(0, 5)});
      } catch (err) {setError(err instanceof Error ? err.message : "The site review could not be completed.");}
      finally {setBusy(false);}
    }}>Review official page</button>
    {error && <p role="alert">{error}</p>}
    {data.reviews.map((item, index) => <details key={item.observedAt + index} className="rounded border border-canvas-border p-2">
      <summary className="cursor-pointer">{new Date(item.observedAt).toLocaleDateString()} · {item.status.replaceAll("_", " ")}</summary>
      <p className="break-all">{item.sourceUrl}</p>
      <ul className="space-y-2">{item.observations.map(observation => <li key={observation}>
        {observation} <button type="button" className="underline" onClick={() => onSelect(observation, item.sourceUrl)}>Copy for human verification</button>
      </li>)}</ul>
      {!!item.contacts?.length && <ul className="mt-2 space-y-2" aria-label="Published business mailbox candidates">
        {item.contacts.map(email => <li key={email} className="break-all">{email}{" "}
          <button type="button" className="underline" onClick={() => onContact(email, item.sourceUrl)}>Review contact</button></li>)}
      </ul>}
    </details>)}
  </section>;
}
