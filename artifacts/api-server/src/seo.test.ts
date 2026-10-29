import test from "node:test";
import assert from "node:assert/strict";

test("blog HTML injection includes title, Open Graph, canonical, and JSON-LD", async () => {
  const { injectDocumentHead, blogIndexHead, articleHead } = await import("./lib/seo.js");
  const html = `<!DOCTYPE html><html><head>
    <title>Home</title>
    <meta name="description" content="Home description" />
    <meta property="og:title" content="Home title" />
    <meta property="og:description" content="Home og" />
    <meta property="og:url" content="https://atgconsulting.io/" />
    <meta property="og:type" content="website" />
  </head><body><div id="root"></div></body></html>`;

  const index = injectDocumentHead(html, blogIndexHead("https://atgconsulting.io"));
  assert.match(index, /<title>ATG Consulting Blog/);
  assert.match(index, /property="og:url" content="https:\/\/atgconsulting\.io\/blog"/);
  assert.match(index, /property="og:type" content="website"/);
  assert.match(index, /<link rel="canonical" href="https:\/\/atgconsulting\.io\/blog"/);
  assert.match(index, /<script type="application\/ld\+json" id="atg-jsonld">/);
  assert.match(index, /"@type":"Blog"/);

  const post = injectDocumentHead(html, articleHead("https://atgconsulting.io", {
    slug: "inbox-triage",
    title: "Inbox triage",
    description: "Sort the inbox.",
    publishedAt: "2026-10-01T00:00:00.000Z",
  }));
  assert.match(post, /<title>Inbox triage — ATG Consulting<\/title>/);
  assert.match(post, /property="og:type" content="article"/);
  assert.match(post, /"@type":"Article"/);
  assert.match(post, /"headline":"Inbox triage"/);
  assert.match(post, /inbox-triage/);
});

test("sitemap and robots include the blog and a sitemap pointer", async () => {
  const { sitemapXml, robotsTxt } = await import("./lib/seo.js");
  const xml = sitemapXml("https://atgconsulting.io", [
    { slug: "inbox-triage", updatedAt: "2026-10-01T12:00:00.000Z" },
  ]);
  assert.match(xml, /<loc>https:\/\/atgconsulting\.io\/blog<\/loc>/);
  assert.match(xml, /<loc>https:\/\/atgconsulting\.io\/blog\/inbox-triage<\/loc>/);
  assert.match(xml, /<lastmod>2026-10-01<\/lastmod>/);
  assert.match(robotsTxt("https://atgconsulting.io"), /Sitemap: https:\/\/atgconsulting\.io\/sitemap\.xml/);
});

test("meta injection escapes title quotes", async () => {
  const { injectDocumentHead, articleHead } = await import("./lib/seo.js");
  const html = "<html><head><title>Old</title></head><body></body></html>";
  const next = injectDocumentHead(html, articleHead("https://atgconsulting.io", {
    slug: "quotes",
    title: `Say "hello" <script>`,
    description: "Plain",
    publishedAt: null,
  }));
  assert.match(next, /Say &quot;hello&quot; &lt;script&gt;/);
  assert.doesNotMatch(next, /<title>[^<]*<script>/);
});
