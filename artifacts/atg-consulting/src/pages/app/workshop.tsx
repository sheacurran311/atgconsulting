/**
 * AI Workshop. Exercises happen in the learner's own assistant.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import AppShell from "@/components/app/AppShell";
import { api, type WorkshopLessonDetail, type WorkshopOutline, type WorkshopQuiz } from "@/lib/api";

function Shell({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">{children}</div>
    </AppShell>
  );
}

export function WorkshopHomePage() {
  const [data, setData] = useState<WorkshopOutline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quizSlug, setQuizSlug] = useState<string | null>(null);

  useEffect(() => {
    api.workshop.outline().then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <Shell><p className="text-sm" style={{ color: "#B91C1C" }}>{error}</p></Shell>;
  if (!data) return <Shell><p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>Loading the workshop…</p></Shell>;

  if (data.locked) {
    return (
      <Shell>
        <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>LEARN</p>
        <h1 className="font-extrabold text-2xl mb-3" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>AI Workshop</h1>
        <div className="rounded-xl p-6" style={{ border: "1px solid rgba(59,107,255,0.25)", background: "rgba(59,107,255,0.05)" }}>
          <p className="font-semibold text-sm mb-2" style={{ color: "var(--canvas-text)" }}>This workshop is on paid plans.</p>
          <p className="text-sm mb-4" style={{ color: "var(--canvas-text-2)" }}>Self-serve, Guided, and Done-for-you can open it. You run every exercise in your own assistant.</p>
          <Link href="/app/account" className="btn-primary text-sm" style={{ padding: "8px 14px" }}>View your plan</Link>
        </div>
      </Shell>
    );
  }

  const done = data.totalLessons > 0 && data.completedLessons >= data.totalLessons;

  return (
    <Shell>
      <Link href="/app/learn" className="text-sm" style={{ color: "var(--blue)" }}>← Learn</Link>
      <p className="font-mono text-2xs mt-4 mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>AI WORKSHOP</p>
      <h1 className="font-extrabold text-2xl mb-2" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>Practice in your own assistant</h1>
      <p className="text-sm mb-4" style={{ color: "var(--canvas-text-2)" }}>
        {data.completedLessons} of {data.totalLessons} lessons complete · {data.percent}%
      </p>
      {data.testMode && <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)" }}>ADMIN TEST MODE</p>}
      {done && (
        <div className="rounded-xl p-5 mb-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
          <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>You finished the lessons in this workshop.</p>
          <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>This is a practice record in your account. It is not a certificate or an accreditation.</p>
        </div>
      )}
      {data.modules.length === 0 && <p className="text-sm" style={{ color: "var(--canvas-text-3)" }}>No lessons published yet.</p>}
      <div className="space-y-4">
        {data.modules.map((mod) => (
          <section key={mod.slug} className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold" style={{ color: "var(--canvas-text)" }}>{mod.title}</p>
                {mod.summary && <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>{mod.summary}</p>}
                <p className="font-mono text-2xs mt-2" style={{ color: "var(--canvas-text-3)" }}>{mod.percent}% · {mod.completedLessons}/{mod.lessonCount} lessons</p>
              </div>
              {mod.hasQuiz && (
                <button type="button" className="text-xs font-semibold" style={{ color: "var(--blue)" }} onClick={() => setQuizSlug(quizSlug === mod.slug ? null : mod.slug)}>
                  {mod.quiz ? `Check ${mod.quiz.score}/${mod.quiz.total}` : "Check"}
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-1">
              {mod.lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link href={`/app/learn/workshop/${lesson.slug}`} className="text-sm" style={{ color: "var(--canvas-text)" }}>
                    {lesson.completed ? "✓ " : ""}{lesson.title}
                    <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}> · {lesson.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ul>
            {quizSlug === mod.slug && <QuizPanel slug={mod.slug} onDone={() => { api.workshop.outline().then(setData).catch(() => null); }} />}
          </section>
        ))}
      </div>
    </Shell>
  );
}

function QuizPanel({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [quiz, setQuiz] = useState<WorkshopQuiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; total: number; results: boolean[]; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.workshop.quiz(slug).then(setQuiz).catch((err: Error) => setError(err.message));
  }, [slug]);

  if (error) return <p className="text-sm mt-3" style={{ color: "#B91C1C" }}>{error}</p>;
  if (!quiz) return <p className="text-sm mt-3" style={{ color: "var(--canvas-text-3)" }}>Loading check…</p>;

  async function submit() {
    const scored = await api.workshop.submitQuiz(slug, answers).catch((err: Error) => {
      setError(err.message);
      return null;
    });
    if (scored) {
      setResult(scored);
      onDone();
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>CHECK YOUR UNDERSTANDING · YOU SCORE IT</p>
      {quiz.questions.map((question, index) => (
        <fieldset key={question.prompt}>
          <legend className="text-sm font-medium mb-1" style={{ color: "var(--canvas-text)" }}>{question.prompt}</legend>
          {question.choices.map((choice, choiceIndex) => (
            <label key={choice} className="flex gap-2 text-sm mb-1" style={{ color: "var(--canvas-text-2)" }}>
              <input type="radio" name={`${slug}-${index}`} checked={answers[index] === choiceIndex} onChange={() => setAnswers((current) => {
                const next = [...current];
                next[index] = choiceIndex;
                return next;
              })} />
              {choice}
              {result && answers[index] === choiceIndex ? (result.results[index] ? " ✓" : " · try the lesson again") : ""}
            </label>
          ))}
        </fieldset>
      ))}
      <button type="button" className="btn-primary text-sm" style={{ padding: "8px 14px" }} onClick={() => { void submit(); }}>Score this check</button>
      {result && <p className="text-sm" style={{ color: "var(--canvas-text)" }}>{result.score} of {result.total}. {result.note}</p>}
    </div>
  );
}

export function WorkshopLessonPage() {
  const [, params] = useRoute("/app/learn/workshop/:slug");
  const slug = params?.slug ?? "";
  const [lesson, setLesson] = useState<WorkshopLessonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLesson(null);
    setError(null);
    api.workshop.lesson(slug).then(setLesson).catch((err: Error) => setError(err.message));
  }, [slug]);

  async function complete() {
    if (!slug) return;
    setBusy(true);
    await api.workshop.complete(slug).catch((err: Error) => setError(err.message));
    const fresh = await api.workshop.lesson(slug).catch(() => null);
    if (fresh) setLesson(fresh);
    setBusy(false);
  }

  return (
    <Shell>
      <Link href="/app/learn/workshop" className="text-sm" style={{ color: "var(--blue)" }}>← Workshop</Link>
      {error && <p className="text-sm mt-4" style={{ color: "#B91C1C" }}>{error}</p>}
      {!lesson && !error && <p className="text-sm mt-4" style={{ color: "var(--canvas-text-3)" }}>Loading lesson…</p>}
      {lesson && (
        <article className="mt-4 space-y-4">
          <p className="font-mono text-2xs" style={{ color: "var(--blue)" }}>{lesson.module.title} · {lesson.minutes} MIN</p>
          <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>{lesson.title}</h1>
          <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{lesson.body}</div>
          {lesson.takeaways.length > 0 && (
            <div>
              <p className="font-mono text-2xs mb-2" style={{ color: "var(--canvas-text-3)" }}>TAKEAWAYS</p>
              <ul className="list-disc pl-5 text-sm space-y-1" style={{ color: "var(--canvas-text)" }}>
                {lesson.takeaways.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          <div className="rounded-xl p-4" style={{ background: "rgba(59,107,255,0.06)", border: "1px solid rgba(59,107,255,0.2)" }}>
            <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)" }}>DO THIS IN YOUR OWN ASSISTANT</p>
            <p className="text-sm" style={{ color: "var(--canvas-text)" }}>{lesson.exercise}</p>
            <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>This app does not connect to Grok, Claude, or ChatGPT, and it does not run the exercise for you.</p>
          </div>
          {lesson.completed ? (
            <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>Marked complete.</p>
          ) : (
            <button type="button" disabled={busy} className="btn-primary text-sm" style={{ padding: "8px 14px" }} onClick={() => { void complete(); }}>
              {busy ? "Saving…" : "Mark lesson complete"}
            </button>
          )}
          <div className="flex justify-between gap-3 text-sm">
            {lesson.prevSlug ? <Link href={`/app/learn/workshop/${lesson.prevSlug}`} style={{ color: "var(--blue)" }}>Previous</Link> : <span />}
            {lesson.nextSlug ? <Link href={`/app/learn/workshop/${lesson.nextSlug}`} style={{ color: "var(--blue)" }}>Next</Link> : <span />}
          </div>
        </article>
      )}
    </Shell>
  );
}
