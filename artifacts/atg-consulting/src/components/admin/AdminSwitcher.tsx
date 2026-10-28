/**
 * AdminSwitcher — admin "View as client" account switcher.
 * Shown in admin nav as a searchable dropdown.
 * On selection: POST /api/admin/impersonate → redirects to portal.
 */
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { api, type ClientAdmin } from "@/lib/api";

type TestTier = "SELF_SERVE" | "GUIDED" | "WHITE_GLOVE";

export default function AdminSwitcher() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function placePanel() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(320, window.innerWidth - margin * 2);
    const sidebar = button.closest("aside");
    const anchorLeft = sidebar ? sidebar.getBoundingClientRect().right + 8 : rect.left;
    const left = Math.min(Math.max(margin, anchorLeft), window.innerWidth - width - margin);
    const top = Math.max(margin, rect.bottom + 8);
    const maxHeight = Math.max(220, window.innerHeight - top - margin);
    setPanelStyle({ top, left, width, maxHeight });
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.admin.clients().then(setClients).catch(() => null).finally(() => setLoading(false));
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
    };
  }, [open]);

  // Close on outside click. The panel is portaled, so it is not inside dropRef.
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (dropRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const filtered = clients.filter((c) =>
    !query ||
    (c.user?.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (c.user?.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
    c.tier.toLowerCase().includes(query.toLowerCase())
  );

  async function startImpersonation(clientId: string) {
    setStarting(true);
    await fetch("/api/admin/impersonate", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setStarting(false);
    setOpen(false);
    setLocation("/app");
  }

  async function startTestClient(tier: TestTier) {
    setStarting(true);
    await fetch("/api/admin/test-client", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    setStarting(false);
    setOpen(false);
    setLocation("/app");
  }

  const TIER_LABELS: Record<string, string> = {
    NONE: "No plan", SELF_SERVE: "Self-serve", GUIDED: "Guided", WHITE_GLOVE: "DFY",
  };

  return (
    <div className="relative" ref={dropRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
        style={{
          background: open ? "rgba(59,107,255,0.12)" : "var(--canvas-2)",
          border: `1px solid ${open ? "var(--blue)" : "var(--canvas-border)"}`,
          color: open ? "var(--blue)" : "var(--canvas-text-2)",
        }}
      >
        👁 View as client
      </button>

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          className="rounded-xl overflow-hidden"
          style={{
            position: "fixed",
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            zIndex: 80,
            background: "var(--canvas-1)", border: "1px solid var(--canvas-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          <div className="p-3 space-y-2">
            {/* Search */}
            <input
              autoFocus
              className="field-input text-sm w-full"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {/* Test clients */}
            <div>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>TEST CLIENTS</p>
              <div className="flex gap-1.5">
                {(["SELF_SERVE", "GUIDED", "WHITE_GLOVE"] as TestTier[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => startTestClient(tier)}
                    disabled={starting}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)" }}
                  >
                    {TIER_LABELS[tier]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Client list */}
          <div className="overflow-y-auto" style={{ maxHeight: Math.max(120, panelStyle.maxHeight - 108) }}>
            {loading ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--canvas-text-3)" }}>{query ? "No matches" : "No clients yet"}</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => startImpersonation(c.id)}
                  disabled={starting}
                  className="w-full text-left px-4 py-2.5 transition-colors"
                  style={{ background: "none", border: "none", cursor: "pointer", borderTop: "1px solid var(--canvas-border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--canvas-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--canvas-text)" }}>
                        {c.user?.name ?? "—"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--canvas-text-3)" }}>
                        {c.user?.email ?? "—"}
                      </p>
                    </div>
                    <span className="font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-3)", border: "1px solid var(--canvas-border)" }}>
                      {TIER_LABELS[c.tier] ?? c.tier}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
