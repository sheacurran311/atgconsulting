const painPoints = [
  {
    title: "You're wearing too many hats",
    detail: "Owner, salesperson, marketer, scheduler, and follow-up machine. Something always slips.",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    title: "Good leads go cold",
    detail: "Not because you don't care — because there's no system to keep them warm.",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    title: "\"AI can help\" isn't a plan",
    detail: "ChatGPT, Claude, and Grok are powerful — but turning them into a system that fits your life takes a human who knows how to design it.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "Your time is the bottleneck",
    detail: "The repetitive work — prospecting, follow-ups, scheduling, inbox — eats the hours that should go to clients.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="py-20 sm:py-28 bg-white" aria-labelledby="problem-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="section-eyebrow mb-3">The real problem</p>
          <h2 id="problem-heading" className="section-heading">
            You don&apos;t need another tool.{" "}
            <span className="text-orange">You need a solution built for you.</span>
          </h2>
          <p className="mt-5 text-lg text-navy/65 leading-relaxed">
            AI tools like ChatGPT, Claude, and Grok can connect to apps, draft emails, schedule
            meetings, and a lot more. The hard part isn&apos;t the tools — it&apos;s designing a system
            that fits your specific business, clients, and daily life. That&apos;s what Shea does.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {painPoints.map((p) => (
            <div key={p.title} className="flex gap-4 p-5 rounded-2xl bg-navy/[0.03] border border-navy/10">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={p.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-navy">{p.title}</h3>
                <p className="text-navy/60 text-sm mt-1 leading-relaxed">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
