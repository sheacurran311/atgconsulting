/**
 * Client View picker.
 * Opens an explicit choice: my own account, a tier test client, or a real client.
 * Selection always starts impersonation and loads /app. A failed request stays
 * on this screen with an error instead of refreshing in place.
 */
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Eye } from "lucide-react";
import { api, type ClientAdmin } from "@/lib/api";

type TestTier = "SELF_SERVE" | "GUIDED" | "WHITE_GLOVE";
type Variant = "sidebar" | "compact";

const TIER_LABELS: Record<string, string> = {
  NONE: "No plan",
  SELF_SERVE: "Self-serve",
  GUIDED: "Guided",
  WHITE_GLOVE: "White Glove",
};

export default function AdminSwitcher({ variant = "sidebar" }: { variant?: Variant }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function placePanel() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(340, window.innerWidth - margin * 2);
    const sidebar = button.closest("aside");
    const anchorLeft = sidebar ? sidebar.getBoundingClientRect().right + 8 : rect.left;
    const left = Math.min(Math.max(margin, anchorLeft), window.innerWidth - width - margin);
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(220, Math.min(480, (openUp ? spaceAbove : spaceBelow) - 8));
    const top = openUp
      ? Math.max(margin, rect.top - 8 - maxHeight)
      : Math.max(margin, rect.bottom + 8);
    setPanelStyle({ top, left, width, maxHeight });
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    api.admin.clients().then(setClients).catch(() => setClients([])).finally(() => setLoading(false));
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

  const realClients = clients.filter((c) => !(c.notes ?? "").includes("__TEST__"));
  const filtered = realClients.filter((c) =>
    !query ||
    (c.user?.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (c.user?.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
    c.tier.toLowerCase().includes(query.toLowerCase())
  );

  async function openClient(url: string, body: unknown) {
    setError(null);
    setStarting(true);
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        setError(payload.error ?? "Could not open that client.");
        setStarting(false);
        return;
      }
      window.location.assign("/app");
    } catch {
      setError("Could not reach the server.");
      setStarting(false);
    }
  }

  const buttonStyle = variant === "sidebar"
    ? {
        color: "#FFFFFF",
        background: open ? "var(--ink-2)" : "transparent",
        border: "none",
        width: "100%",
        textAlign: "left" as const,
      }
    : {
        background: open ? "rgba(59,107,255,0.12)" : "var(--canvas-2)",
        border: `1px solid ${open ? "var(--blue)" : "var(--canvas-border)"}`,
        color: open ? "var(--blue)" : "var(--canvas-text-2)",
      };

  return (
    <div className={variant === "sidebar" ? "relative w-full" : "relative"} ref={dropRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={variant === "sidebar"
          ? "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md cursor-pointer"
          : "text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"}
        style={buttonStyle}
      >
        {variant === "sidebar"
          ? <Eye className="w-4 h-4 flex-shrink-0" aria-hidden="true" strokeWidth={1.75} />
          : <Eye className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" strokeWidth={1.75} />}
        Client View
      </button>

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose a client to view"
          className="rounded-xl overflow-hidden"
          style={{
            position: "fixed",
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
            zIndex: 80,
            background: "var(--canvas-1)",
            border: "1px solid var(--canvas-border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}
        >
          <div className="p-3 space-y-3">
            <div>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>MY ACCOUNT</p>
              <button
                type="button"
                onClick={() => openClient("/api/admin/impersonate/self", {})}
                disabled={starting}
                className="w-full text-left text-sm font-medium px-2.5 py-2 rounded-lg"
                style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)" }}
              >
                My account as client
              </button>
            </div>

            <div>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>TEST CLIENTS</p>
              <div className="flex gap-1.5">
                {(["SELF_SERVE", "GUIDED", "WHITE_GLOVE"] as TestTier[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => openClient("/api/admin/test-client", { tier })}
                    disabled={starting}
                    className="text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(59,107,255,0.08)", color: "var(--blue)", border: "1px solid rgba(59,107,255,0.2)" }}
                  >
                    {TIER_LABELS[tier]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.06em" }}>REAL CLIENTS</p>
              <input
                className="field-input text-sm w-full"
                placeholder="Search by name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#B91C1C" }}>{error}</p>
            )}
            {starting && (
              <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Opening client view…</p>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: Math.max(120, panelStyle.maxHeight - 230) }}>
            {loading ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--canvas-text-3)" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--canvas-text-3)" }}>{query ? "No matches" : "No clients yet"}</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openClient("/api/admin/impersonate", { clientId: c.id })}
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
