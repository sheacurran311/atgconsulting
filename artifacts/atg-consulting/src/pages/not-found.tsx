import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4" style={{ background: "var(--canvas)" }}>
      <div className="max-w-md text-center">
        <p className="font-mono text-2xs mb-3" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>404</p>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>
          That page is not here.
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--canvas-text-2)" }}>
          The link may be old, or the page has not been published yet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/"><span className="btn-secondary text-sm">Back home</span></Link>
          <Link to="/start"><span className="btn-primary text-sm">Map my workflow</span></Link>
        </div>
      </div>
    </div>
  );
}
