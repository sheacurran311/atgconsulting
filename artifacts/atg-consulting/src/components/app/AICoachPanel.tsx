/**
 * AICoachPanel — Setup Coach chat panel on the dashboard.
 * Grounded in the client's own intake, tool plan, and platform guides.
 * Refuses off-scope questions per the system prompt.
 * Product boundary: no connectors, no sending, no external service calls.
 */
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import UsageMeter from "@/components/app/UsageMeter";

interface Message { role: "user" | "assistant"; content: string }

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className="rounded-xl px-3 py-2 text-sm leading-relaxed"
        style={{
          maxWidth: "88%", whiteSpace: "pre-wrap",
          background: isUser ? "rgba(59,107,255,0.1)" : "var(--canvas-2)",
          border: `1px solid ${isUser ? "rgba(59,107,255,0.25)" : "var(--canvas-border)"}`,
          color: "var(--canvas-text)",
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function AICoachPanel({ tier }: { tier: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm your ATG Setup Coach. Ask me anything about setting up your AI platform or installing your workflow skills.",
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    const result = await api.aiAssist.coach(text).catch((e: Error) => {
      setError(e.message.includes("501") || e.message.includes("enabled")
        ? "AI Assist is not enabled yet. Shea will activate it soon."
        : e.message.includes("limit") ? e.message
        : "Something went wrong. Try again in a moment.");
      return null;
    });
    if (result) setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
    setSending(false);
  }

  const isGuided = tier === "GUIDED" || tier === "WHITE_GLOVE";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl p-4 text-left transition-all"
        style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--canvas-border)")}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "20px" }} aria-hidden>🤖</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>Setup Coach</p>
            <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
              Ask about setting up Grok Bot, Claude, or ChatGPT for your workflows.
            </p>
          </div>
          <span className="ml-auto text-sm" style={{ color: "var(--blue)" }}>Open →</span>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--canvas-2)", borderBottom: "1px solid var(--canvas-border)" }}>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>Setup Coach</p>
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
            Answers about your specific setup only · no external connections
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm p-1.5" aria-label="Close">✕</button>
      </div>

      <div className="p-4 overflow-y-auto" style={{ maxHeight: "320px" }}>
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {sending && (
          <div className="flex justify-start mb-2">
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--canvas-2)", color: "var(--canvas-text-3)" }}>
              Thinking…
            </div>
          </div>
        )}
        {error && <p className="text-xs text-center mt-2" style={{ color: "#DC2626" }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-3" style={{ borderTop: "1px solid var(--canvas-border)", paddingTop: "10px" }}>
        <div className="flex gap-2">
          <input
            className="field-input text-sm flex-1"
            placeholder="Ask about your platform setup…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            disabled={sending}
          />
          <button
            type="button" onClick={() => void send()}
            disabled={sending || !input.trim()}
            className="btn-primary text-sm" style={{ padding: "8px 14px" }}
          >
            Send
          </button>
        </div>
        {isGuided && (
          <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>
            For hands-on help, request a session with Shea from the support panel below.
          </p>
        )}
        <div className="mt-2">
          <UsageMeter />
        </div>
      </div>
    </div>
  );
}
