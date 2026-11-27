import { escapeHtml, injectDocumentHead } from "./seo";
import { marketingPage } from "./transformationMarketing";

type MarketingPage = NonNullable<ReturnType<typeof marketingPage>>;

export function marketingBody(page: MarketingPage) {
  const escape = escapeHtml;
  return `<main class="mx-auto max-w-wide px-4 py-16 sm:px-6 lg:px-8">
    <div class="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div class="min-w-0">
        <p class="eyebrow mb-3">${escape(page.eyebrow)}</p>
        <h1 class="section-heading mb-5">${escape(page.title)}</h1>
        <p class="mb-6 text-lg">${escape(page.description)}</p>
        <a class="btn-primary mb-8 inline-flex max-w-full whitespace-normal text-center" href="${escape(page.intake)}">${escape(page.cta)}</a>
        <div class="space-y-5">${page.sections.map(section => `<section class="border-t border-canvas-border pt-4"><h2 class="mb-2 text-xl font-bold">${escape(section.title)}</h2><p>${escape(section.text)}</p></section>`).join("")}</div>
      </div>
      <aside class="min-w-0 self-start rounded-2xl border border-canvas-border bg-canvas-1 p-5">
        <h2 class="mb-3 text-lg font-bold">Explore ATG services</h2>
        <ul class="space-y-3">${page.links.map(link => `<li><a class="font-semibold text-blue underline underline-offset-4" href="${escape(link.href)}">${escape(link.label)}</a></li>`).join("")}</ul>
      </aside>
    </div>
  </main>`;
}

export function marketingDocument(template: string, origin: string, page: MarketingPage) {
  const url = origin + page.path;
  return injectDocumentHead(template, {
    title: page.title + " | ATG Consulting", description: page.description, url, type: "website",
    jsonLd: {"@context": "https://schema.org", "@type": page.path.startsWith("/services/") || page.path.startsWith("/seo-aeo/") ? "Service" : "WebPage",
      name: page.title, url, description: page.description, publisher: {"@type": "Organization", name: "ATG Consulting", url: origin}},
  }).replace('<div id="root"></div>', () => '<div id="root">' + marketingBody(page) + '</div>');
}
