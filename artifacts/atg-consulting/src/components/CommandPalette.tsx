/**
 * ⌘K / '/' command palette.
 * Opens on Cmd+K (Mac) or Ctrl+K (Win/Linux), or '/' when not in an input.
 * Respects prefers-reduced-motion for the enter animation.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { basePath } from "@/lib/clerk";

interface Command {
  id: string;
  label: string;
  sub?: string;
  shortcut?: string;
  action: (nav: (to: string) => void) => void;
}

const COMMANDS: Command[] = [
  {
    id: "intake",
    label: "Map my workflow",
    sub: "Answer a few questions, get a tailored plan",
    shortcut: "I",
    action: (nav) => nav("/start"),
  },
  {
    id: "book",
    label: "Book a 1:1 with Shea",
    sub: "Schedule a free 20-minute call",
    shortcut: "B",
    action: () => {
      const url = (window as Window & { __VITE_BOOKING_URL__?: string }).__VITE_BOOKING_URL__
        ?? import.meta.env.VITE_BOOKING_URL as string
        ?? "#book";
      if (url !== "#book") window.open(url, "_blank", "noopener");
    },
  },
  {
    id: "services",
    label: "See services",
    sub: "EA · Marketing · Sales · Customer support",
    action: (nav) => { nav("/"); setTimeout(() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }), 100); },
  },
  {
    id: "login",
    label: "Sign in",
    sub: "Access your client dashboard",
    action: () => { window.location.href = `${basePath}/sign-in`; },
  },
  {
    id: "dashboard",
    label: "My dashboard",
    sub: "View your workflows and reports",
    action: (nav) => nav("/app"),
  },
];

interface Props { open: boolean; onClose: () => void }

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter(
    (c) => !query || c.label.toLowerCase().includes(query.toLowerCase()) || c.sub?.toLowerCase().includes(query.toLowerCase()),
  );

  const run = useCallback((cmd: Command) => {
    cmd.action(setLocation);
    onClose();
    setQuery("");
    setSelected(0);
  }, [onClose, setLocation]);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 10); setSelected(0); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && filtered[selected]) { e.preventDefault(); run(filtered[selected]!); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selected, run, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh] px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: "var(--ink-1)",
          border: "1px solid var(--ink-border)",
          boxShadow: "var(--blue-glow), 0 24px 64px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--ink-border)" }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ink-text-3)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search commands…"
            className="flex-1 bg-transparent outline-none font-mono text-sm"
            style={{ color: "var(--ink-text)", fontSize: "14px" }}
          />
          <kbd className="font-mono text-2xs px-1.5 py-0.5 rounded" style={{ background: "var(--ink-3)", color: "var(--ink-text-3)", border: "1px solid var(--ink-border)" }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul role="listbox" className="py-1.5 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm" style={{ color: "var(--ink-text-3)" }}>No commands found</li>
          ) : filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              role="option"
              aria-selected={selected === i}
              onClick={() => run(cmd)}
              onMouseEnter={() => setSelected(i)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer transition-colors"
              style={{ background: selected === i ? "var(--ink-2)" : "transparent" }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ink-text)", letterSpacing: "-0.01em" }}>{cmd.label}</p>
                {cmd.sub && <p className="font-mono text-2xs mt-0.5" style={{ color: "var(--ink-text-3)" }}>{cmd.sub}</p>}
              </div>
              {cmd.shortcut && (
                <kbd className="font-mono text-2xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "var(--ink-3)", color: "var(--ink-text-3)", border: "1px solid var(--ink-border)" }}>
                  {cmd.shortcut}
                </kbd>
              )}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: "1px solid var(--ink-border)" }}>
          <span className="font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>↑↓ navigate · ↵ select · esc close</span>
        </div>
      </div>
    </div>
  );
}
