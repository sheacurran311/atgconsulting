/**
 * Verified assistants and claws. Unverified rows stay in admin until Shea checks them.
 */
import { useEffect, useState } from "react";
import { api, type CatalogAssistant } from "@/lib/api";

const TIER_FIT: Record<string, string> = {
  all: "Any plan",
  SELF_SERVE: "Self-serve",
  GUIDED: "Guided",
  WHITE_GLOVE: "Done-for-you",
};

function providers(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

function Card({ item }: { item: CatalogAssistant }) {
  const needs = providers(item.requiresModels);
  return (
    <article className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{item.name}</p>
      {item.maker && (
        <p className="font-mono text-2xs mt-1" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>{item.maker}</p>
      )}
      <p className="text-xs mt-2" style={{ color: "var(--canvas-text-2)" }}>{item.description}</p>
      <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>{TIER_FIT[item.tierFit] ?? item.tierFit}</p>
      {needs.length > 0 && (
        <p className="text-xs mt-2" style={{ color: "var(--canvas-text-2)" }}>
          Requires a model: {needs.join("; ")}
        </p>
      )}
      {item.setupDifficulty && <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>{item.setupDifficulty}</p>}
      {item.hostingRequirement && <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>{item.hostingRequirement}</p>}
      {item.kind === "claw" && item.safetyNote && (
        <p className="text-xs mt-3" style={{ color: "var(--canvas-text)" }}>{item.safetyNote}</p>
      )}
      {item.sourceUrl && (
        <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium mt-3 inline-block" style={{ color: "var(--blue)" }}>
          Official page ↗
        </a>
      )}
    </article>
  );
}

export default function WhichAi() {
  const [models, setModels] = useState<CatalogAssistant[]>([]);
  const [claws, setClaws] = useState<CatalogAssistant[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      api.catalogByKind("model").catch(() => null),
      api.catalogByKind("claw").catch(() => null),
    ]).then(([modelRows, clawRows]) => {
      if (!modelRows || !clawRows) setFailed(true);
      setModels(modelRows ?? []);
      setClaws(clawRows ?? []);
    });
  }, []);

  return (
    <section className="mt-10">
      <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>WHICH AI FITS YOU</p>
      <h2 className="font-bold text-lg" style={{ color: "var(--canvas-text)" }}>General assistants</h2>
      <p className="text-sm mt-1 mb-4" style={{ color: "var(--canvas-text-2)" }}>
        These do not have a workflow in the catalog. Shea checks each one before it appears here. The app does not connect to them.
      </p>
      {failed && <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Could not load the comparison.</p>}
      {!failed && models.length === 0 && (
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          No verified assistants yet. Shea checks each one before it appears here.
        </p>
      )}
      {models.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {models.map((item) => <Card key={item.id} item={item} />)}
        </div>
      )}

      <h2 className="font-bold text-lg mt-8" style={{ color: "var(--canvas-text)" }}>Self-hosted agents</h2>
      <p className="text-sm mt-1 mb-4" style={{ color: "var(--canvas-text-2)" }}>
        These need a model you plug in. They run on a machine you control.
      </p>
      {claws.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          No verified self-hosted agents yet.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {claws.map((item) => <Card key={item.id} item={item} />)}
        </div>
      )}
    </section>
  );
}
