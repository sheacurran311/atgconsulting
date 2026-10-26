/**
 * Resources tab — client's personalised tool recommendations.
 * All outbound links go through /go/:slug for tracking.
 * Affiliate disclosure shown prominently per FTC rules.
 */
import { useState, useEffect } from "react";
import { api, type ResourceTool, type ResourcesPayload } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  ai_platform: "AI Platform", productivity: "Productivity", email: "Email",
  calendar: "Calendar", scheduling: "Scheduling", payments: "Payments",
  accounting: "Accounting", crm: "CRM", design: "Design",
  social_media: "Social Media", automation: "Automation", dev_tool: "Dev Tool", other: "Other",
};

function ToolCard({ tool, source }: { tool: ResourceTool; source: string }) {
  const href = tool.goUrl ? `${tool.goUrl}?src=${source}` : (tool.officialUrl ?? "#");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 transition-all"
      style={{
        border: "1px solid var(--canvas-border)",
        background: "var(--canvas-1)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--canvas-border)")}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)", letterSpacing: "-0.01em" }}>
            {tool.name}
            {tool.hasReferral && (
              <span className="ml-1.5 font-mono text-2xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.04em" }}>ref</span>
            )}
          </p>
          {tool.category && (
            <p className="font-mono text-2xs mt-0.5" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>
              {CATEGORY_LABELS[tool.category] ?? tool.category}
            </p>
          )}
        </div>
        <span className="text-sm" style={{ color: "var(--blue)", flexShrink: 0 }}>↗</span>
      </div>
      {tool.why && <p className="text-xs mb-1" style={{ color: "var(--canvas-text)" }}>{tool.why}</p>}
      {tool.description && !tool.why && <p className="text-xs mb-1" style={{ color: "var(--canvas-text-2)" }}>{tool.description}</p>}
      {tool.costNote && <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>{tool.costNote}</p>}
    </a>
  );
}

export default function ResourcesTab() {
  const [data, setData] = useState<ResourcesPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.knowledge.resources()
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading resources…</p>;
  if (!data) return <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Could not load resources.</p>;

  const hasTools = data.planTools.length > 0 || data.featuredTools.length > 0;

  return (
    <div className="space-y-6">
      {/* Affiliate disclosure */}
      {(data.planTools.some((t) => t.hasReferral) || data.featuredTools.some((t) => t.hasReferral)) && (
        <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
          {data.affiliateDisclosure}
        </p>
      )}

      {/* Plan tools */}
      {data.planTools.length > 0 && (
        <div>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
            YOUR RECOMMENDED TOOLS
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.planTools.map((tool) => (
              <ToolCard key={tool.slug ?? tool.name} tool={tool} source="resources-plan" />
            ))}
          </div>
        </div>
      )}

      {/* Featured tools (not in plan) */}
      {data.featuredTools.length > 0 && (
        <div>
          <p className="font-mono text-2xs mb-3" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.1em" }}>
            {data.planTools.length > 0 ? "ALSO WORTH KNOWING" : "RECOMMENDED TOOLS"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.featuredTools.map((tool) => (
              <ToolCard key={tool.slug ?? tool.name} tool={tool} source="resources-featured" />
            ))}
          </div>
        </div>
      )}

      {!hasTools && (
        <div className="rounded-xl p-6" style={{ border: "1px dashed var(--canvas-border)", background: "var(--canvas-2)" }}>
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
            Your personalised tool recommendations will appear here after your tool plan is generated.
            Complete the intake and claim your plan to get started.
          </p>
        </div>
      )}
    </div>
  );
}
