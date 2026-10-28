/**
 * /intake — Mobile-first adaptive discovery intake.
 *
 * Mobile: one question per screen, full-viewport, large tap targets.
 * Desktop: same layout, wider card.
 *
 * Autosave: progress saved to localStorage; resume link shown on start screen.
 * Invite links: /intake/i/:token — loads prefilled context from server.
 * Resume: /intake?resume=<sessionId> — rehydrates saved progress.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import LogoLockup from "@/components/LogoLockup";
import { Link } from "wouter";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface SavedProgress {
  sessionId: string;
  answeredCount: number;
  savedAt: number;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_KEY = "atg_intake_progress";

function loadSaved(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as SavedProgress;
    // Expire after 7 days
    if (Date.now() - p.savedAt > 7 * 24 * 60 * 60 * 1000) { localStorage.removeItem(LS_KEY); return null; }
    return p;
  } catch { return null; }
}

function saveTLS(sessionId: string, answeredCount: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ sessionId, answeredCount, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function clearLS() { try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ } }

// ── Main component ────────────────────────────────────────────────────────────

export default function IntakePage() {
  const [, setLocation] = useLocation();
  const [matchInvite, paramsInvite] = useRoute("/intake/i/:token");
  const [matchEngMember, paramsEngMember] = useRoute("/intake/e/:token");

  // URL params for resume
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const resumeId = searchParams.get("resume");
  const inviteToken = matchInvite ? paramsInvite?.token : null;
  const engMemberToken = matchEngMember ? paramsEngMember?.token : null;

  // ── State ─────────────────────────────────────────────────────────────────
  type Phase = "start" | "email" | "questions" | "upload" | "submit" | "done";
  const [phase, setPhase] = useState<Phase>("start");
  const [sessionId, setSessionId] = useState("");
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [totalAsked, setTotalAsked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<SavedProgress | null>(null);

  // Prefilled from invite
  const [prefilledName, setPrefilledName] = useState("");
  const [prefilledEmail, setPrefilledEmail] = useState("");
  const [prefilledCompany, setPrefilledCompany] = useState("");
  const currentInviteToken = useRef<string | null>(inviteToken ?? null);

  // Upload/paste state
  const [pasteText, setPasteText] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load saved progress and invite data ───────────────────────────────────
  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  // Engagement member token state
  const [engRoleLabel, setEngRoleLabel] = useState("");
  const [engRoleDesc, setEngRoleDesc] = useState("");
  const [engCompanyName, setEngCompanyName] = useState("");
  const currentEngMemberToken = useRef<string | null>(engMemberToken ?? null);

  useEffect(() => {
    if (!engMemberToken) return;
    currentEngMemberToken.current = engMemberToken;
    fetch(`/api/discovery/engagement/member/${engMemberToken}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ roleLabel?: string; roleDesc?: string; companyName?: string; prefilledName?: string; prefilledEmail?: string; error?: string }>)
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        if (d.roleLabel) setEngRoleLabel(d.roleLabel);
        if (d.roleDesc) setEngRoleDesc(d.roleDesc);
        if (d.companyName) { setEngCompanyName(d.companyName); setPrefilledCompany(d.companyName); }
        if (d.prefilledName) setPrefilledName(d.prefilledName);
        if (d.prefilledEmail) { setPrefilledEmail(d.prefilledEmail.toLowerCase()); setContactEmail(d.prefilledEmail.toLowerCase()); }
        fetch(`/api/discovery/engagement/member/${engMemberToken}/status`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "opened" }),
        }).catch(() => null);
      })
      .catch(() => null);
  }, [engMemberToken]);

  useEffect(() => {
    if (!inviteToken) return;
    currentInviteToken.current = inviteToken;
    fetch(`/api/discovery/invite/${inviteToken}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ prefilledName?: string; prefilledEmail?: string; prefilledCompany?: string; prefilledIndustry?: string }>)
      .then((d) => {
        if (d.prefilledName) setPrefilledName(d.prefilledName);
        if (d.prefilledEmail) { setPrefilledEmail(d.prefilledEmail.toLowerCase()); setContactEmail(d.prefilledEmail.toLowerCase()); }
        if (d.prefilledCompany) setPrefilledCompany(d.prefilledCompany);
        // Mark as opened
        fetch(`/api/discovery/invite/${inviteToken}/status`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "opened" }),
        }).catch(() => null);
      })
      .catch(() => null);
  }, [inviteToken]);

  // ── Start session ─────────────────────────────────────────────────────────
  const startSession = useCallback(async (fromSavedId?: string) => {
    setLoading(true);
    setError(null);

    if (fromSavedId) {
      // Resume: fetch existing session's next question
      const r = await fetch("/api/discovery/next", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: fromSavedId, answers: [] }),
      }).catch(() => null);
      if (r?.ok) {
        const d = await r.json() as { questions: Question[]; totalAsked: number; done: boolean };
        setSessionId(fromSavedId);
        setTotalAsked(d.totalAsked);
        if (d.done || d.questions.length === 0) {
          setPhase("submit");
        } else {
          setCurrentQ(d.questions[0] ?? null);
          setPhase("questions");
        }
        setLoading(false);
        return;
      }
    }

    const r = await fetch("/api/discovery/start", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteToken: currentInviteToken.current,
        engMemberToken: currentEngMemberToken.current,
      }),
    }).catch(() => null);

    if (!r?.ok) { setError("Could not start the intake. Please try again."); setLoading(false); return; }
    const data = await r.json() as { sessionId: string; questions: Question[]; totalAsked: number };
    setSessionId(data.sessionId);
    setTotalAsked(data.totalAsked);
    setCurrentQ(data.questions[0] ?? null);
    setPhase("questions");
    saveTLS(data.sessionId, 0);

    // Mark invite as in-progress
    if (currentInviteToken.current) {
      fetch(`/api/discovery/invite/${currentInviteToken.current}/status`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      }).catch(() => null);
    }

    // Pre-answer name/email/company from invite context (skip those questions)
    const preAnswers: AnsweredQuestion[] = [];
    if (prefilledName) preAnswers.push({ id: "contact_name", category: "contact", question: "What's your name?", answer: prefilledName });
    if (contactEmail) preAnswers.push({ id: "contact_email", category: "contact", question: "What's your email?", answer: contactEmail });
    if (prefilledCompany) preAnswers.push({ id: "company_name", category: "company", question: "What's your company name?", answer: prefilledCompany });
    if (preAnswers.length > 0) setAnswered(preAnswers);

    setLoading(false);
  }, [prefilledName, prefilledCompany]);

  // Auto-start when arriving via engagement member token
  useEffect(() => {
    if (!engMemberToken) return;
    const timer = setTimeout(() => {
      if (prefilledEmail) { startSession(); } else { setPhase("email"); }
    }, 700);
    return () => clearTimeout(timer);
  }, [engMemberToken, prefilledEmail]);

  // Auto-start when arriving via personal invite link (go to email step first unless email is prefilled)
  useEffect(() => {
    if (inviteToken) {
      // Wait for invite data to load (prefilledEmail may set contactEmail in the invite effect)
      // If email is prefilled, start session directly; otherwise show email step
      const timer = setTimeout(() => {
        if (prefilledEmail) {
          startSession(); // email already set from invite
        } else {
          setPhase("email"); // show email step
        }
      }, 600);
      return () => clearTimeout(timer);
    } else if (resumeId) {
      startSession(resumeId);
    }
    return undefined;
  }, [inviteToken, prefilledEmail]);

  // ── Submit answer + get next question ─────────────────────────────────────
  const advance = useCallback(async (choiceAnswer?: string) => {
    if (!currentQ) return;
    const answer = choiceAnswer ?? (currentQ.type === "multiselect" ? selectedOptions.join(", ") : inputValue.trim());
    if (!answer && !currentQ.text.toLowerCase().includes("optional")) {
      setError("Please enter an answer before continuing.");
      return;
    }

    const newAnswer: AnsweredQuestion = {
      id: currentQ.id, category: currentQ.category,
      question: currentQ.text, answer: answer || "(skipped)",
    };
    const updatedAnswered = [...answered, newAnswer];
    setAnswered(updatedAnswered);
    setInputValue("");
    setSelectedOptions([]);
    setError(null);

    // Autosave
    saveTLS(sessionId, updatedAnswered.length);

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
      setCurrentQ(null);
      setPhase("submit");
    } else {
      setCurrentQ(data.questions[0] ?? null);
    }
    setLoading(false);
  }, [currentQ, answered, inputValue, selectedOptions, sessionId]);

  // ── Final submit ──────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!consentGiven) { setError("Please agree to the privacy policy."); return; }
    if (!contactEmail.includes("@")) { setError("Please enter a valid email address."); return; }
    setSubmitting(true);
    setError(null);

    const r = await fetch("/api/discovery/submit", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, finalAnswers: answered, contactEmail, consentGiven: true, honeypot: "",
        engMemberToken: currentEngMemberToken.current }),
    }).catch(() => null);

    if (!r?.ok) { setError("Could not submit. Please try again."); setSubmitting(false); return; }

    // Mark invite as submitted
    if (currentInviteToken.current) {
      fetch(`/api/discovery/invite/${currentInviteToken.current}/status`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "submitted", intakeId: sessionId }),
      }).catch(() => null);
    }

    clearLS();
    setPhase("done");
    setSubmitting(false);
  }, [sessionId, answered, contactEmail, consentGiven]);

  // ── Extract from pasted text or file ─────────────────────────────────────
  const extract = useCallback(async () => {
    setExtracting(true);
    setError(null);
    let r: Response | null = null;
    if (uploadFile) {
      const form = new FormData();
      form.append("file", uploadFile);
      r = await fetch("/api/discovery/extract", { method: "POST", credentials: "include", body: form }).catch(() => null);
    } else if (pasteText.trim()) {
      r = await fetch("/api/discovery/extract", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      }).catch(() => null);
    }
    if (!r?.ok) { setError("Could not extract. Try pasting directly."); setExtracting(false); return; }
    const data = await r.json() as { answers: AnsweredQuestion[] };
    setAnswered(data.answers);
    await startSession();
    setExtracting(false);
  }, [pasteText, uploadFile, startSession]);

  // ── Progress ──────────────────────────────────────────────────────────────
  const approxTotal = 20;
  const progress = Math.min(Math.round((totalAsked / approxTotal) * 100), 95);
  const resumeLink = sessionId ? `${window.location.origin}/intake?resume=${sessionId}` : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100svh", background: "var(--ink)", display: "flex", flexDirection: "column" }}>
      {/* Minimal header */}
      <header style={{ padding: "16px 20px", borderBottom: "1px solid var(--ink-border)", flexShrink: 0 }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link to="/"><LogoLockup variant="dark" height={22} /></Link>
          {phase === "questions" && resumeLink && (
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(resumeLink).catch(() => null); }}
              className="text-xs font-mono"
              style={{ color: "var(--ink-text-3)", background: "none", border: "none", cursor: "pointer" }}
              title="Copy resume link"
            >
              Save progress
            </button>
          )}
        </div>
      </header>

      {/* Main content — full screen each phase */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
        <div style={{ maxWidth: "480px", width: "100%", margin: "0 auto" }}>

          {/* ── Start ── */}
          {phase === "start" && (
            <div>
              {inviteToken && prefilledName && (
                <div className="mb-4 rounded-xl px-4 py-3" style={{ background: "rgba(59,107,255,0.1)", border: "1px solid rgba(59,107,255,0.25)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--blue)" }}>Hi {prefilledName} 👋</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ink-text-3)" }}>Shea has shared this link with you personally.</p>
                </div>
              )}

              <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>FREE DISCOVERY ASSESSMENT</p>
              <h1 className="font-extrabold mb-3" style={{ color: "var(--ink-text)", fontSize: "clamp(24px, 6vw, 36px)", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Let's map your business before we talk.
              </h1>
              <p className="text-sm mb-6" style={{ color: "var(--ink-text-2)", lineHeight: 1.65 }}>
                Answer 15–20 questions about how your business runs today.
                Shea reviews your answers personally and prepares a tailored proposal before your call.
              </p>

              {/* Saved progress banner */}
              {saved && !inviteToken && !resumeId && (
                <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(59,107,255,0.08)", border: "1px solid rgba(59,107,255,0.2)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink-text)" }}>
                    You have {saved.answeredCount} saved answer{saved.answeredCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs mb-3" style={{ color: "var(--ink-text-3)" }}>
                    Continue where you left off, or start fresh.
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startSession(saved.sessionId)} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
                      Continue →
                    </button>
                    <button type="button" onClick={() => { clearLS(); setSaved(null); }} className="btn-ghost text-sm" style={{ color: "var(--ink-text-3)" }}>
                      Start fresh
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-7">
                {["~10–15 minutes on any device", "No passwords, tokens, or confidential client data", "Shea reviews before any follow-up"].map((p) => (
                  <p key={p} className="flex gap-2 text-sm" style={{ color: "var(--ink-text-2)" }}>
                    <span style={{ color: "var(--blue)" }}>›</span>{p}
                  </p>
                ))}
              </div>

              <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPhase("email")}
                disabled={loading}
                className="btn-primary w-full"
                style={{ padding: "16px", fontSize: "16px", borderRadius: "12px", minHeight: "54px" }}
              >
                {loading ? "Starting…" : "Start my free assessment →"}
              </button>
              <button
                type="button"
                onClick={() => setPhase("upload")}
                className="btn-secondary-white w-full"
                style={{ padding: "16px", fontSize: "14px", borderRadius: "12px", minHeight: "54px" }}
              >
                Already filled out our questionnaire?
              </button>
              </div>
              {error && <p className="text-sm mt-3" style={{ color: "#DC2626" }}>{error}</p>}
            </div>
          )}

          {/* ── Email step — required before questions start ── */}
          {phase === "email" && (
            <div>
              <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>LET'S START</p>
              <h2 style={{ color: "var(--ink-text)", fontSize: "clamp(20px,5vw,28px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: "8px" }}>
                What's your email address?
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--ink-text-2)", lineHeight: 1.6 }}>
                Use the email you'll log in with later, usually your business email.
              </p>
              <input
                autoFocus
                type="email"
                placeholder="you@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value.toLowerCase().trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (contactEmail.includes("@") && contactEmail.includes(".")) {
                      startSession();
                    }
                  }
                }}
                style={{
                  width: "100%", padding: "18px", borderRadius: "12px",
                  border: "1px solid var(--ink-border)", background: "var(--ink-1)",
                  color: "var(--ink-text)", fontSize: "18px",
                  fontFamily: "var(--font-sans)", outline: "none",
                  marginBottom: "8px",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--blue)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--ink-border)"; }}
              />
              {prefilledEmail && contactEmail === prefilledEmail && (
                <p className="text-xs mb-4" style={{ color: "var(--blue)" }}>
                  ✓ Pre-filled by Shea — you can change it if needed.
                </p>
              )}
              {error && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{error}</p>}
              <button
                type="button"
                onClick={() => {
                  const cleaned = contactEmail.toLowerCase().trim();
                  if (!cleaned.includes("@") || !cleaned.includes(".")) {
                    setError("Please enter a valid email address.");
                    return;
                  }
                  setContactEmail(cleaned);
                  setError(null);
                  startSession();
                }}
                disabled={loading || !contactEmail}
                style={{
                  width: "100%", padding: "18px", borderRadius: "12px",
                  background: "var(--blue)", color: "#fff", fontSize: "17px",
                  fontWeight: 700, border: "none", cursor: "pointer",
                  minHeight: "58px", opacity: (loading || !contactEmail) ? 0.6 : 1,
                }}
              >
                {loading ? "Starting…" : "Continue →"}
              </button>
              <button type="button" onClick={() => setPhase("start")}
                style={{ display: "block", marginTop: "16px", color: "var(--ink-text-3)", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}>
                ← Back
              </button>
            </div>
          )}

          {/* ── Questions ── */}
          {phase === "questions" && currentQ && (
            <div>
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-2xs" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
                    {currentQ.category.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="font-mono text-2xs" style={{ color: "var(--ink-text-3)" }}>~{progress}%</p>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ink-2)" }}>
                  <div style={{ width: `${progress}%`, background: "var(--blue)", height: "100%", borderRadius: "999px", transition: "width 400ms" }} />
                </div>
              </div>

              {/* Question */}
              <h2 style={{ color: "var(--ink-text)", fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: "24px" }}>
                {currentQ.text}
              </h2>

              {/* Choice: big tap targets */}
              {currentQ.type === "choice" && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={loading}
                      onClick={() => advance(opt)}
                      className="w-full text-left transition-all"
                      style={{
                        padding: "18px 20px",
                        borderRadius: "14px",
                        border: "1px solid var(--ink-border)",
                        background: "var(--ink-1)",
                        color: "var(--ink-text)",
                        fontSize: "15px",
                        fontWeight: 500,
                        cursor: "pointer",
                        minHeight: "58px",
                        WebkitTapHighlightColor: "transparent",
                      }}
                      onTouchStart={(e) => { (e.currentTarget.style.background = "rgba(59,107,255,0.1)"); (e.currentTarget.style.borderColor = "var(--blue)"); }}
                      onTouchEnd={(e) => { (e.currentTarget.style.background = "var(--ink-1)"); (e.currentTarget.style.borderColor = "var(--ink-border)"); }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Text input */}
              {(currentQ.type === "text" || currentQ.type === "number") && (
                <div>
                  <textarea
                    autoFocus
                    rows={4}
                    className="w-full"
                    placeholder="Your answer…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); advance(); } }}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--ink-border)",
                      background: "var(--ink-1)",
                      color: "var(--ink-text)",
                      fontSize: "16px",
                      lineHeight: 1.6,
                      resize: "vertical",
                      minHeight: "120px",
                      width: "100%",
                      fontFamily: "var(--font-sans)",
                      outline: "none",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--blue)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--ink-border)"; }}
                  />
                  <p className="font-mono text-xs mt-2" style={{ color: "var(--ink-text-3)" }}>⌘ + Enter to continue</p>
                </div>
              )}

              {error && <p className="text-sm mt-3" style={{ color: "#DC2626" }}>{error}</p>}

              {currentQ.type !== "choice" && (
                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => advance()}
                    disabled={loading}
                    style={{
                      flex: 1, padding: "16px", borderRadius: "12px",
                      background: "var(--blue)", color: "#fff",
                      fontSize: "16px", fontWeight: 700, border: "none",
                      cursor: "pointer", minHeight: "54px",
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? "…" : "Continue →"}
                  </button>
                  <button
                    type="button"
                    onClick={() => advance("(skipped)")}
                    style={{
                      padding: "16px 18px", borderRadius: "12px",
                      background: "var(--ink-2)", color: "var(--ink-text-3)",
                      fontSize: "14px", border: "1px solid var(--ink-border)",
                      cursor: "pointer", minHeight: "54px",
                    }}
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Submit (no more questions) ── */}
          {phase === "submit" && (
            <div>
              <h2 style={{ color: "var(--ink-text)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "8px" }}>
                Almost done.
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-text-2)", lineHeight: 1.6 }}>
                We'll save your answers so Shea can review them. No automated emails — you'll hear from Shea directly.
              </p>

              <div className="space-y-4 mb-5">
                <div>
                  <label className="font-mono text-2xs block mb-2" style={{ color: "var(--ink-text-3)", letterSpacing: "0.06em" }}>
                    YOUR EMAIL *
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={{
                      width: "100%", padding: "16px", borderRadius: "12px",
                      border: "1px solid var(--ink-border)", background: "var(--ink-1)",
                      color: "var(--ink-text)", fontSize: "16px",
                      fontFamily: "var(--font-sans)", outline: "none",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--blue)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--ink-border)"; }}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", cursor: "pointer" }}>
                  <div
                    style={{
                      width: "24px", height: "24px", borderRadius: "6px", flexShrink: 0, marginTop: "1px",
                      border: `2px solid ${consentGiven ? "var(--blue)" : "var(--ink-border)"}`,
                      background: consentGiven ? "var(--blue)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 150ms",
                    }}
                    onClick={() => setConsentGiven(!consentGiven)}
                  >
                    {consentGiven && <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ color: "var(--ink-text-2)", fontSize: "14px", lineHeight: 1.6 }}>
                    I agree that ATG Consulting may store my answers for up to 90 days.
                    I've read the{" "}
                    <Link to="/privacy">
                      <span style={{ color: "var(--blue)", textDecoration: "underline" }}>Privacy Policy</span>
                    </Link>.
                  </span>
                </label>

                {/* honeypot */}
                <input type="text" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" />
              </div>

              {error && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{error}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                style={{
                  width: "100%", padding: "18px", borderRadius: "12px",
                  background: "var(--blue)", color: "#fff", fontSize: "17px",
                  fontWeight: 700, border: "none", cursor: "pointer",
                  minHeight: "58px", opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Submitting…" : "Submit my assessment →"}
              </button>
            </div>
          )}

          {/* ── Upload/paste ── */}
          {phase === "upload" && (
            <div>
              <button type="button" onClick={() => setPhase("start")} style={{ color: "var(--ink-text-3)", background: "none", border: "none", cursor: "pointer", marginBottom: "24px", fontSize: "14px" }}>
                ← Back
              </button>
              <h2 style={{ color: "var(--ink-text)", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "8px" }}>
                Paste your questionnaire
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--ink-text-2)", lineHeight: 1.6 }}>
                If you've already filled out our questionnaire, paste or upload it here. We'll extract your answers and ask only what's missing.
              </p>
              <textarea
                rows={8}
                placeholder="Paste your questionnaire responses here…"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                style={{
                  width: "100%", padding: "16px", borderRadius: "12px",
                  border: "1px solid var(--ink-border)", background: "var(--ink-1)",
                  color: "var(--ink-text)", fontSize: "15px", resize: "vertical",
                  fontFamily: "var(--font-mono)", minHeight: "160px",
                  outline: "none",
                }}
              />
              <div className="flex items-center gap-3 mt-3 mb-5">
                <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: "12px 16px", borderRadius: "10px", background: "var(--ink-2)", border: "1px solid var(--ink-border)", color: "var(--ink-text-2)", cursor: "pointer", fontSize: "14px" }}>
                  {uploadFile ? `📎 ${uploadFile.name}` : "Upload PDF or TXT"}
                </button>
                {uploadFile && <button type="button" onClick={() => setUploadFile(null)} style={{ color: "var(--ink-text-3)", background: "none", border: "none", cursor: "pointer", fontSize: "13px", textDecoration: "underline" }}>Remove</button>}
              </div>
              {error && <p className="text-sm mb-3" style={{ color: "#DC2626" }}>{error}</p>}
              <button
                type="button"
                onClick={extract}
                disabled={extracting || (!pasteText.trim() && !uploadFile)}
                style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "var(--blue)", color: "#fff", fontSize: "16px", fontWeight: 700, border: "none", cursor: "pointer", minHeight: "54px", opacity: (extracting || (!pasteText.trim() && !uploadFile)) ? 0.5 : 1 }}
              >
                {extracting ? "Extracting…" : "Extract my answers →"}
              </button>
            </div>
          )}

          {/* ── Done ── */}
          {phase === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "rgba(59,107,255,0.12)", border: "1px solid rgba(59,107,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 24px" }}>
                ✓
              </div>
              <h2 style={{ color: "var(--ink-text)", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: "12px" }}>
                Received. Shea will review personally.
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--ink-text-2)", lineHeight: 1.65, maxWidth: "360px", margin: "0 auto 24px" }}>
                No automated emails. Shea will review your answers and reach out directly when a tailored proposal is ready.
              </p>
              {contactEmail && (
                <div style={{ display: "inline-block", padding: "12px 16px", borderRadius: "10px", background: "rgba(59,107,255,0.1)", border: "1px solid rgba(59,107,255,0.25)", margin: "0 auto 16px", maxWidth: "380px" }}>
                  <p style={{ color: "var(--blue)", fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>When your proposal is ready:</p>
                  <p style={{ color: "var(--ink-text-2)", fontSize: "13px", lineHeight: 1.5 }}>
                    Sign up at atgconsulting.io with <strong style={{ color: "var(--ink-text)" }}>{contactEmail}</strong> to view it in your portal.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3" style={{ maxWidth: "280px", margin: "0 auto" }}>
                <Link to="/"><span style={{ display: "block", padding: "14px 20px", borderRadius: "12px", background: "var(--ink-2)", color: "var(--ink-text-2)", textAlign: "center", fontWeight: 600, textDecoration: "none" }}>Back to site</span></Link>
                <a href="mailto:shea@atgconsulting.io" style={{ display: "block", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--ink-border)", color: "var(--ink-text-3)", textAlign: "center", fontSize: "14px", textDecoration: "none" }}>
                  Questions? Email Shea
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
