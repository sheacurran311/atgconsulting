/**
 * Scroll-led example of two complementary customer-acquisition routes.
 * Entirely illustrative: no real prospect data, rankings or promised leads.
 * Uses native Framer Motion already installed, no video or new dependencies.
 */
import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, Check, CircleCheck, Compass, Globe2, MailCheck, MousePointerClick, Radar, Search, Sparkles, Workflow } from "lucide-react";
import { Link } from "wouter";

const outbound = [
  { step: "01", label: "DISCOVER", title: "Find the right prospects", detail: "Research businesses that match your ideal customer, with sources to review.", Icon: Radar },
  { step: "02", label: "QUALIFY", title: "Focus your effort", detail: "Organize relevant leads and prepare tailored next steps for approval.", Icon: Compass },
  { step: "03", label: "CONNECT", title: "Follow up with purpose", detail: "Turn approved outreach into a repeatable process in your own tools.", Icon: MailCheck },
] as const;

const inbound = [
  { step: "01", label: "BUILD", title: "Give your business a better front door", detail: "A fast, clear website built around what customers need to find.", Icon: Globe2 },
  { step: "02", label: "OPTIMIZE", title: "Make your expertise discoverable", detail: "Technical SEO, structured content and answer-ready information for search and AI discovery.", Icon: Search },
  { step: "03", label: "CONVERT", title: "Make the next step obvious", detail: "Useful service pages and an inquiry journey that connects to your process.", Icon: MousePointerClick },
] as const;

function ExampleLane({ kind, cards, active }: {
  kind: "outbound" | "inbound";
  cards: typeof outbound | typeof inbound;
  active: number;
}) {
  const accent = kind === "outbound" ? "#6b9bff" : "#a78bfa";
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {kind === "outbound" ? <Radar size={17} color={accent} /> : <Globe2 size={17} color={accent} />}
        <p className="font-mono text-xs tracking-wider font-semibold" style={{ color: accent }}>
          {kind === "outbound" ? "WE HELP YOU FIND CUSTOMERS" : "WE HELP CUSTOMERS FIND YOU"}
        </p>
      </div>
      {cards.map(({ step, title, detail, label, Icon }, i) => (
        <motion.div
          key={step}
          className="relative rounded-xl p-4 sm:p-5"
          animate={{
            opacity: i <= active ? 1 : 0.42,
            y: i <= active ? 0 : 8,
            scale: i === active ? 1.015 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            background: i === active ? "rgba(24,32,56,0.98)" : "rgba(17,22,38,0.92)",
            border: `1px solid ${i === active ? accent + "90" : "rgba(160,176,215,0.16)"}`,
            boxShadow: i === active ? `0 0 36px ${accent}18` : "none",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}16`, border: `1px solid ${accent}44` }}>
              <Icon size={19} color={accent} strokeWidth={1.8} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[10px] tracking-widest" style={{ color: accent }}>{step} / {label}</span>
                {i < active ? <CircleCheck size={15} color={accent} aria-label="Illustrative stage revealed" /> : null}
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1" style={{ color: "#f2f5ff" }}>{title}</h3>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "#aab7d4" }}>{detail}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function GrowthWorkflowScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const glowScale = useTransform(scrollYProgress, [0, 0.35, 0.8, 1], [0.8, 1.2, 1.5, 1.6]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.25, 0.85, 1], [0.16, 0.4, 0.7, 0.55]);
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (reducedMotion) return;
    setActive(value < 0.28 ? 0 : value < 0.62 ? 1 : 2);
  });
  const stage = reducedMotion ? 2 : active;

  return (
    <section ref={sectionRef} id="growth-workflow" className="relative" style={{ height: reducedMotion ? "auto" : "245vh", background: "#080d1a" }} aria-labelledby="growth-workflow-heading">
      <div className="relative lg:sticky lg:top-0 lg:h-screen lg:min-h-[720px] overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 48%, rgba(40,90,201,0.20), transparent 56%), linear-gradient(120deg, rgba(63,96,212,0.05), rgba(136,67,242,0.08))" }} />
        {!reducedMotion && (
          <motion.div aria-hidden="true" className="absolute pointer-events-none rounded-full" style={{ width: "32rem", height: "32rem", left: "calc(50% - 16rem)", top: "calc(50% - 16rem)", background: "radial-gradient(circle, rgba(70,115,255,0.26), rgba(123,72,240,0.10) 42%, transparent 70%)", scale: glowScale, opacity: glowOpacity, filter: "blur(18px)" }} />
        )}
        <div className="relative max-w-wide mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-14 h-full flex flex-col">
          <div className="max-w-3xl mx-auto text-center mb-6 lg:mb-9">
            <p className="font-mono text-xs tracking-widest mb-3" style={{ color: "#89aeff" }}>TWO PATHS. ONE CONNECTED GROWTH SYSTEM.</p>
            <h2 id="growth-workflow-heading" className="display-lg" style={{ color: "#f6f8ff" }}>Find your next customer. <span style={{ color: "#a8a0ff" }}>Help them find you.</span></h2>
            <p className="text-sm sm:text-base leading-relaxed mt-3 max-w-2xl mx-auto" style={{ color: "#b9c4df" }}>
              Prospecting and follow-up move outward. A clear website and SEO/AEO-ready content bring discovery inward. ATG can connect both to an organized customer journey.
            </p>
          </div>

          <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_125px_minmax(0,1fr)] gap-4 sm:gap-6 lg:gap-5 items-center max-w-6xl w-full mx-auto">
            <ExampleLane kind="outbound" cards={outbound} active={stage} />
            <div className="hidden lg:flex items-center justify-center relative h-full" aria-hidden="true">
              <div className="absolute top-[14%] bottom-[14%] w-px" style={{ background: "linear-gradient(to bottom, transparent, rgba(142,162,255,0.5), transparent)" }} />
              <motion.div className="relative w-24 h-24 rounded-full flex items-center justify-center" animate={reducedMotion ? {} : { boxShadow: ["0 0 22px #5d8dff33", "0 0 58px #9273ff66", "0 0 22px #5d8dff33"] }} transition={{ duration: 3.5, repeat: Infinity }} style={{ background: "radial-gradient(circle at 36% 30%, #243b7e, #191b4a 70%)", border: "1px solid rgba(160,172,255,0.55)" }}>
                <Workflow size={34} strokeWidth={1.7} color="#d3d8ff" />
              </motion.div>
            </div>
            <div className="flex items-center justify-center lg:hidden" aria-hidden="true">
              <div className="h-px flex-1" style={{ background: "rgba(142,162,255,0.3)" }} />
              <Sparkles size={22} className="mx-4" color="#a8a0ff" />
              <div className="h-px flex-1" style={{ background: "rgba(142,162,255,0.3)" }} />
            </div>
            <ExampleLane kind="inbound" cards={inbound} active={stage} />
          </div>

          <div className="max-w-5xl w-full mx-auto mt-6 lg:mt-8">
            <motion.div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(152,172,223,0.16)" }}>
              <motion.div className="h-full rounded-full" style={{ width: reducedMotion ? "100%" : progressWidth, background: "linear-gradient(90deg,#578dff,#b688ff)" }} />
            </motion.div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-2">
                <Check size={16} color="#8cb3ff" aria-hidden="true" />
                <p className="text-xs sm:text-sm" style={{ color: "#c6d2ef" }}>A connected journey, configured to your business.</p>
              </div>
              <Link to="/intake" className="btn-primary text-sm" style={{ padding: "9px 17px" }}>Map my growth workflow <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <p className="text-[11px] mt-3" style={{ color: "#8290b3" }}>
              Concept demonstration, not a live system or a guarantee of search rankings, customer acquisition, or sales.
            </p>
            {!reducedMotion && <div aria-hidden="true" className="hidden lg:flex justify-center mt-2 items-center gap-2 text-[11px] tracking-wider" style={{ color: "#8396c8" }}>SCROLL TO CONNECT THE DOTS <ArrowDown size={13}/></div>}
          </div>
        </div>
      </div>
    </section>
  );
}
