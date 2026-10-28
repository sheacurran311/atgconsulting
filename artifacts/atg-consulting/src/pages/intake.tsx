/**
 * /intake — Adaptive discovery intake page.
 * Works for logged-in and anonymous prospects.
 * Server calls Grok to pick follow-up questions adaptively.
 * Falls back to a fixed question order when AI is unavailable.
 *
 * Flow:
 *   1. POST /api/discovery/start → get first questions
 *   2. User answers → POST /api/discovery/next → get next questions
 *   3. POST /api/discovery/submit → finalize
 *   4. Show confirmation (no automatic email)
 *
 * Alternatively: paste/upload a questionnaire doc.
 */
import { useState, useRef, useCallback } from "react";
import LogoLockup from "@/components/LogoLockup";
import { Link } from "wouter";

interface Question {
  id: string;
  category: string;
  text: string;
  type: "text" | "choice" | "multiselect" | "number";
  options?: string[];
}

interface AnsweredQuestion {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  contact: "Contact", company: "Company", systems: "Systems",
  alerts: "Operations", sales: "Sales", operations: "Operations",
  install_contractor: "Field work", invoicing: "Finance",
  ai_tools: "AI today", security: "Access", goals: "Goals",
};

type Phase = "start" | "questions" | "upload" | "done";

export default function IntakePage() {
  const [phase, setPhase] = useState<Phase>("start");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [totalAsked, setTotalAsked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Upload mode state
  const [pasteText, setPasteText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedAnswers, setExtractedAnswers] = useState<AnsweredQuestion[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentQ = questions[currentQIdx];
  const progress = Math.min(Math.round((totalAsked / 20) * 100), 95);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await fetch("/api/discovery/start", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => null);
    if (!r?.ok) { setError("Could not start the intake. Please try again."); setLoading(false); return; }
    const data = await r.json() as { sessionId: string; questions: Question[]; totalAsked: number };
    setSessionId(data.sessionId);
    setQuestions(data.questions);
    setTotalAsked(data.totalAsked);
    setPhase("questions");
    setLoading(false);
  }, []);

  // ── Submit current answer and fetch next question ─────────────────────────
  const advance = useCallback(async () => {
    if (!currentQ) return;
    const answer = currentQ.type === "multiselect" ? selectedOptions.join(", ") : inputValue.trim();
    if (!answer && !currentQ.text.toLowerCase().includes("(optional)")) {
      setError("Please enter an answer before continuing.");
      return;
    }

    const newAnswer: AnsweredQuestion = {
      id: currentQ.id,
      category: currentQ.category,
      question: currentQ.text,
      answer: answer || "(skipped)",
    };
    const updatedAnswered = [...answered, newAnswer];
    setAnswered(updatedAnswered);
    setInputValue("");
    setSelectedOptions([]);
    setError(null);

    // If there are more buffered questions
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((i) => i + 1);
      return;
    }

    // Fetch next adaptive questions
    setLoading(true);
    const r = await fetch("/api/discovery/next", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, answers: updatedAnswered }),
    }).catch(() => null);

    if (!r?.ok) { setError("Network error. Try again."); setLoading(false); return; }
    const data = await r.json() as { questions: Question[]; totalAsked: number; done: boolean };
    setTotalAsked(data.totalAsked);

    if (data.done || data.questions.length === 0) {
      // Move to submit phase (still on questions view, but trigger submit UI)
      setQuestions([]);
      setCurrentQIdx(0);
    } else {
      setQuestions(data.questions);
      setCurrentQIdx(0);
    }
    setLoading(false);
  }, [currentQ, currentQIdx, questions, answered, inputValue, selectedOptions, sessionId]);

  // ── Submit final intake ───────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!consentGiven) { setError("Please agree to the privacy policy."); return; }
    if (!contactEmail) { setError("Please enter your email so Shea can follow up."); return; }
    setSubmitting(true);
    setError(null);

    const allAnswers = extractedAnswers.length > 0 ? [...extractedAnswers, ...answered] : answered;

    const r = await fetch("/api/discovery/submit", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        finalAnswers: allAnswers,
        contactEmail,
        consentGiven: true,
        honeypot: "",
      }),
    }).catch(() => null);

    if (!r?.ok) { setError("Could not submit. Try again."); setSubmitting(false); return; }
    setPhase("done");
    setSubmitting(false);
  }, [sessionId, answered, extractedAnswers, contactEmail, consentGiven]);

  // ── Extract from pasted text / file ──────────────────────────────────────
  const extract = useCallback(async () => {
    setExtracting(true);
    setError(null);

    let r: Response | null = null;
    if (uploadFile) {
      const form = new FormData();
      form.append("file", uploadFile);
      r = await fetch("/api/discovery/extract", {
        method: "POST", credentials: "include",
        body: form,
      }).catch(() => null);
    } else if (pasteText.trim()) {
      r = await fetch("/api/discovery/extract", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      }).catch(() => null);
    }

    if (!r?.ok) { setError("Could not extract answers. Try pasting the text directly."); setExtracting(false); return; }
    const data = await r.json() as { answers: AnsweredQuestion[]; gapIds: string[] };
    setExtractedAnswers(data.answers);

    // If gap IDs exist, start a session with just those
    if (data.gapIds.length > 0 && !sessionId) {
      await startSession();
    }

    setExtracting(false);
    setPhase("questions");
  }, [pasteText, uploadFile, sessionId, startSession]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "var(--ink)" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid var(--ink-border)" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/">
            <LogoLockup variant="dark" height={24} />
          </Link>
          <p className="font-mono text-2xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.08em" }}>
            FREE ASSESSMENT · ATG CONSULTING
          </p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
        {/* ── Start phase ── */}
        {phase === "start" && (
          <div>
            <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>DISCOVERY ASSESSMENT</p>
            <h1 className="font-extrabold text-3xl mb-3" style={{ color: "var(--ink-text)", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Let's map your business before we talk.
            </h1>
            <p className="text-base mb-6 leading-relaxed" style={{ color: "var(--ink-text-2)" }}>
              Answer 15–20 questions about how your business runs today.
              Shea will use your answers to prepare a tailored proposal before your call — no generic decks.
            </p>
            <div className="space-y-3 mb-8">
              {[
                "Takes about 10–15 minutes",
                "No passwords or confidential client data — just how your operations work",
                "Shea reviews your answers personally before any follow-up",
              ].map((p) => (
                <p key={p} className="flex gap-2 text-sm" style={{ color: "var(--ink-text-2)" }}>
                  <span style={{ color: "var(--blue)" }}>›</span>{p}
                </p>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={startSession}
                disabled={loading}
                className="btn-primary"
                style={{ padding: "12px 24px", fontSize: "15px" }}
              >
                {loading ? "Starting…" : "Start the assessment →"}
              </button>
              <button
                type="button"
                onClick={() => setPhase("upload")}
                className="btn-secondary-white"
                style={{ padding: "12px 24px", fontSize: "15px" }}
              >
                Already filled out our questionnaire?
              </button>
            </div>
            {error && <p className="text-sm mt-3" style={{ color: "#DC2626" }}>{error}</p>}
          </div>
        )}

        {/* ── Upload/paste phase ── */}
        {phase === "upload" && (
          <div>
            <button type="button" onClick={() => setPhase("start")} className="btn-ghost text-sm mb-6">
              ← Back
            </button>
            <h2 className="font-extrabold text-2xl mb-2" style={{ color: "var(--ink-text)", letterSpacing: "-0.025em" }}>
              Paste or upload your questionnaire
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--ink-text-2)" }}>
              If you've already filled out our ATG Discovery questionnaire, paste the text below or upload the file.
              We'll extract your answers and ask only what's missing.
            </p>
            <textarea
              className="field-input w-full text-sm mb-3"
              rows={8}
              placeholder="Paste your questionnaire responses here…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              style={{ fontFamily: "var(--font-mono)", background: "var(--ink-2)", color: "var(--ink-text)", borderColor: "var(--ink-border)" }}
            />
            <div className="flex items-center gap-3 mb-5">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-sm" style={{ padding: "8px 14px", background: "var(--ink-2)", borderColor: "var(--ink-border)", color: "var(--ink-text-2)" }}>
                {uploadFile ? `📎 ${uploadFile.name}` : "Upload PDF or TXT"}
              </button>
              {uploadFile && <button type="button" onClick={() => setUploadFile(null)} className="text-xs underline" style={{ color: "var(--ink-text-3)" }}>Remove</button>}
            </div>
            {error && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{error}</p>}
            <button
              type="button"
              onClick={extract}
              disabled={extracting || (!pasteText.trim() && !uploadFile)}
              className="btn-primary"
              style={{ padding: "10px 20px" }}
            >
              {extracting ? "Extracting…" : "Extract my answers →"}
            </button>
          </div>
        )}

        {/* ── Questions phase ── */}
        {phase === "questions" && (
          <div>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                  QUESTION {totalAsked + 1} {currentQ ? `· ${CATEGORY_LABELS[currentQ.category] ?? currentQ.category}` : ""}
                </p>
                <p className="font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>~{progress}%</p>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--ink-2)" }}>
                <div style={{ width: `${progress}%`, background: "var(--blue)", height: "100%", transition: "width 400ms" }} />
              </div>
            </div>

            {currentQ ? (
              <div>
                <h2 className="font-extrabold text-xl mb-5" style={{ color: "var(--ink-text)", letterSpacing: "-0.02em", lineHeight: 1.35 }}>
                  {currentQ.text}
                </h2>

                {currentQ.type === "choice" && currentQ.options && (
                  <div className="space-y-2 mb-5">
                    {currentQ.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setInputValue(opt); setTimeout(() => advance(), 100); }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          background: inputValue === opt ? "rgba(59,107,255,0.12)" : "var(--ink-2)",
                          border: `1px solid ${inputValue === opt ? "var(--blue)" : "var(--ink-border)"}`,
                          color: inputValue === opt ? "var(--blue)" : "var(--ink-text-2)",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {(currentQ.type === "text" || currentQ.type === "number") && (
                  <div className="mb-5">
                    <textarea
                      autoFocus
                      className="field-input w-full text-sm"
                      rows={4}
                      placeholder="Your answer…"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) advance(); }}
                      style={{ background: "var(--ink-2)", color: "var(--ink-text)", borderColor: "var(--ink-border)" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "var(--ink-text-3)" }}>⌘ + Enter to continue</p>
                  </div>
                )}

                {error && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{error}</p>}

                {currentQ.type !== "choice" && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={advance}
                      disabled={loading}
                      className="btn-primary"
                      style={{ padding: "10px 20px" }}
                    >
                      {loading ? "…" : "Continue →"}
                    </button>
                    {!currentQ.text.toLowerCase().includes("required") && (
                      <button type="button" onClick={() => { setInputValue("(skipped)"); advance(); }} className="btn-ghost text-sm" style={{ color: "var(--ink-text-3)" }}>
                        Skip
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* All questions done — show submit form */
              <div>
                <h2 className="font-extrabold text-xl mb-3" style={{ color: "var(--ink-text)", letterSpacing: "-0.02em" }}>
                  Almost done — just a couple more things.
                </h2>
                <p className="text-sm mb-5" style={{ color: "var(--ink-text-2)" }}>
                  We'll save your answers so Shea can review them before your call. No automatic emails.
                </p>

                <div className="space-y-4 mb-5">
                  <div>
                    <label className="font-mono text-2xs block mb-1" style={{ color: "var(--ink-text-3)", letterSpacing: "0.06em" }}>YOUR EMAIL *</label>
                    <input
                      className="field-input text-sm w-full"
                      type="email"
                      placeholder="you@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={{ background: "var(--ink-2)", color: "var(--ink-text)", borderColor: "var(--ink-border)" }}
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <span className="text-sm" style={{ color: "var(--ink-text-2)" }}>
                      I agree that ATG Consulting may store my answers for up to 90 days to prepare a tailored assessment.
                      I've read the <Link to="/privacy"><span className="underline" style={{ color: "var(--blue)" }}>Privacy Policy</span></Link>.
                    </span>
                  </label>
                </div>

                {error && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{error}</p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="btn-primary"
                  style={{ padding: "12px 24px", fontSize: "15px" }}
                >
                  {submitting ? "Submitting…" : "Submit my assessment →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Done phase ── */}
        {phase === "done" && (
          <div className="text-center py-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
              style={{ background: "rgba(59,107,255,0.12)", border: "1px solid rgba(59,107,255,0.25)" }}
            >
              ✓
            </div>
            <h2 className="font-extrabold text-2xl mb-3" style={{ color: "var(--ink-text)", letterSpacing: "-0.025em" }}>
              Received. Shea will review your answers.
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--ink-text-2)", maxWidth: "400px", margin: "0 auto 20px" }}>
              Shea will personally review your assessment and prepare a tailored report before reaching out.
              No automated emails — you'll hear from Shea directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/"><span className="btn-secondary-white" style={{ padding: "10px 20px" }}>Back to site</span></Link>
              <a href="mailto:shea@atgconsulting.io" className="btn-ghost text-sm" style={{ padding: "10px 20px", color: "var(--ink-text-2)" }}>
                Questions? Email Shea
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
