import { useEffect, useState } from "react";

export interface GenerationWork { kind: "report" | "proposal"; intakeId: string; label: string; startedAt: number }

export default function GenerationProgress({ work }: { work: GenerationWork }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - work.startedAt) / 1000));
    tick(); const timer = window.setInterval(tick, 1000);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { window.clearInterval(timer); window.removeEventListener("beforeunload", warn); };
  }, [work.startedAt]);
  return <section className="rounded-xl border border-blue p-4 mb-4" aria-label="Generation progress">
    <div className="flex gap-3 items-center"><span aria-hidden="true" className="inline-block h-5 w-5 rounded-full border-2 border-blue border-t-transparent motion-safe:animate-spin" /><p role="status" className="font-semibold">Generating and saving {work.kind} for {work.label}…</p></div>
    <div role="progressbar" aria-label={`Generating ${work.kind}`} aria-valuetext="In progress; completion percentage is unavailable" className="h-2 rounded-full bg-canvas-2 overflow-hidden mt-3"><div className="h-full w-1/3 bg-blue rounded-full motion-safe:animate-pulse" /></div>
    <p className="text-sm mt-3">Keep this page open until the saved draft appears. You can work in another browser tab. Do not refresh or start another generation.</p>
    <p className="text-xs mt-2" aria-hidden="true">{elapsed}s elapsed{elapsed >= 45 ? " · Still waiting for the server. A long wait does not confirm failure; check the saved draft before retrying." : ""}</p>
  </section>;
}
