/**
 * TroubleshooterPanel — paste an error text and optionally upload a screenshot.
 * Uses vision model only when an image is present.
 * 'Still stuck' opens a support ticket or (Guided) session request.
 */
import { useState, useRef } from "react";
import { api } from "@/lib/api";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TroubleshooterPanel({ tier, onClose }: { tier: string; onClose?: () => void }) {
  const [errorText, setErrorText] = useState("");
  const [image, setImage] = useState<{ base64: string; mime: string; name: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketSent, setTicketSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isGuided = tier === "GUIDED" || tier === "WHITE_GLOVE";

  async function handleFile(file: File) {
    if (file.size > MAX_IMAGE_BYTES) { setError("Image must be under 2 MB."); return; }
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) { setError("Upload a PNG, JPEG, or WebP screenshot."); return; }
    const base64 = await toBase64(file).catch(() => null);
    if (base64) setImage({ base64, mime: file.type, name: file.name });
  }

  async function submit() {
    if (!errorText.trim()) { setError("Describe the problem first."); return; }
    setLoading(true);
    setError(null);
    const r = await api.aiAssist.troubleshoot(
      errorText,
      image?.base64,
      image?.mime as "image/png" | "image/jpeg" | "image/webp" | undefined
    ).catch((e: Error) => {
      setError(e.message.includes("enabled") ? "AI Assist is not enabled yet." : e.message);
      return null;
    });
    if (r) setResult(r.reply);
    setLoading(false);
  }

  async function sendTicket() {
    const subject = "Troubleshooting: " + errorText.slice(0, 80);
    const message = `Error: ${errorText}\n\nAI suggestion:\n${result ?? "(none)"}`;
    await api.client.me().then(() =>
      fetch("/api/support", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      })
    ).catch(() => null);
    setTicketSent(true);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>Troubleshooter</p>
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>Paste an error · optionally add a screenshot (≤2 MB)</p>
        </div>
        {onClose && <button type="button" onClick={onClose} className="btn-ghost text-sm p-1.5" aria-label="Close">✕</button>}
      </div>

      <div className="p-4 space-y-3">
        {!result ? (
          <>
            <textarea
              className="field-input text-sm w-full"
              rows={5}
              placeholder="Paste the error message or describe what's going wrong…"
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              maxLength={2000}
            />

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
              />
              {image ? (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--canvas-text-2)" }}>
                  <span>📎 {image.name}</span>
                  <button type="button" onClick={() => setImage(null)} className="underline" style={{ color: "var(--canvas-text-3)" }}>Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs underline" style={{ color: "var(--blue)" }}>
                  + Add screenshot (optional)
                </button>
              )}
            </div>

            {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}

            <button type="button" onClick={submit} disabled={loading || !errorText.trim()} className="btn-primary text-sm" style={{ padding: "8px 16px" }}>
              {loading ? "Diagnosing…" : "Troubleshoot"}
            </button>
          </>
        ) : (
          <>
            <div className="rounded-xl p-4" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.06em" }}>SUGGESTED FIX</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text)", whiteSpace: "pre-wrap" }}>{result}</p>
            </div>

            {!ticketSent ? (
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={sendTicket} className="btn-secondary text-sm" style={{ padding: "7px 12px" }}>
                  Still stuck — {isGuided ? "request a session" : "open a support ticket"}
                </button>
                <button type="button" onClick={() => { setResult(null); setErrorText(""); setImage(null); }} className="btn-ghost text-sm">
                  Try another issue
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold" style={{ color: "#16A34A" }}>
                ✓ {isGuided ? "Session request sent to Shea." : "Support ticket opened. Shea will reply within 2 business days."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
