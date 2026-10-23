const painPoints = [
  {
    title: "Prospecting gets skipped",
    detail: "There's always something more urgent than finding the next client.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Follow-ups fall through",
    detail: "Not because you don't care. Because nobody reminded you.",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    title: "Every email starts from scratch",
    detail: "Research and writing take longer than the conversation itself.",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  {
    title: "The CRM is out of date",
    detail: "If you have one at all.",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

export default function Problem() {
  return (
    <section id="problem" className="py-20 sm:py-28 bg-white" aria-labelledby="problem-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 id="problem-heading" className="section-heading">
            You&apos;re great at selling.{" "}
            <span className="text-orange">The rest of it is eating your week.</span>
          </h2>
          <p className="mt-5 text-lg text-navy/65 leading-relaxed">
            When you sell for yourself, you&apos;re also the researcher, the copywriter, the scheduler, and
            the person who updates the spreadsheet at 10pm. Good leads go cold because the follow-up
            slipped. New prospects never get found because there&apos;s no time to look.
          </p>
          <p className="mt-4 text-lg text-navy/65 leading-relaxed">
            You&apos;ve heard AI can help. Maybe you&apos;ve even tried ChatGPT once or twice. But turning
            &ldquo;it can write an email&rdquo; into a system that keeps your pipeline full every week is a
            different job, and that&apos;s the part I do.
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
