import { escapeHtml, injectDocumentHead } from "./seo";
import { industryIntake, industryPath, type IndustrySite } from "./industrySites";

import { relatedSearchPath } from "./transformationMarketing";

export function industryBody(site:IndustrySite) {
  const e=escapeHtml;
  return `<main class="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 py-16"><div class="max-w-3xl">
    <p class="eyebrow mb-3">Website design and redesign</p><h1 class="section-heading mb-5">Website Design for ${e(site.audience)}</h1>
    <p class="text-lg mb-8">${e(site.description)}</p>
    <h2 class="text-xl font-bold mb-2">What the site should help visitors do</h2><p class="mb-6">${e(site.structure)}</p>
    <h2 class="text-xl font-bold mb-2">What happens after an inquiry</h2><p class="mb-6">${e(site.handoff)}</p>
    <h2 class="text-xl font-bold mb-2">What we’ll discuss on your first call</h2><p class="mb-3">${e(site.question)}</p>
    <p class="mb-6">Bring your current URL if you have one. Shea will review the visitor journey with you and scope the design, content and integrations your business needs.</p>
    <a class="btn-primary" href="${e(industryIntake(site))}">Discuss my website</a>
    <p class="mt-8 flex flex-wrap gap-4 text-sm"><a class="underline" href="/#who-we-help">Explore other industries</a><a class="underline" href="${e(relatedSearchPath(site))}">Search visibility for ${e(site.audience)}</a><a class="underline" href="/value-realization">How we measure results</a></p>
  </div></main>`;
}

export function industryDocument(template:string, origin:string, site:IndustrySite) {
  const url=origin+industryPath(site);
  const name="Website Design for "+site.audience;
  return injectDocumentHead(template,{
    title:name+" | ATG Consulting",description:site.description,url,type:"website",
    jsonLd:{"@context":"https://schema.org","@type":"Service",name,url,description:site.description,
      serviceType:"Website design and redesign",provider:{"@type":"Organization",name:"ATG Consulting",url:origin}},
  }).replace('<div id="root"></div>',()=>'<div id="root">'+industryBody(site)+'</div>');
}
