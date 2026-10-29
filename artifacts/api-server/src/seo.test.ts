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

test("production prerender writes blog index and post heads from the shell HTML", async () => {
  const { renderPrerenderedBlog } = await import("./lib/seo.js");
  const html = `<!DOCTYPE html><html><head><title>Home</title></head><body><div id="root"></div></body></html>`;
  const rendered = renderPrerenderedBlog(html, "https://atgconsulting.io", [
    { slug: "inbox-triage", title: "Inbox triage", description: "Sort the inbox.", publishedAt: null },
  ]);
  assert.match(rendered.index, /<title>ATG Consulting Blog/);
  assert.equal(rendered.posts.length, 1);
  assert.match(rendered.posts[0]!.html, /Inbox triage — ATG Consulting/);
  assert.match(rendered.posts[0]!.html, /id="root"/);
});

test("Grok base URL stays on api.x.ai in production", async () => {
  const { resolveGrokBaseUrl, EMBEDDING_MODEL, isAiEnabled } = await import("./lib/grokClient.js");
  assert.equal(resolveGrokBaseUrl({ NODE_ENV: "production", LLM_BASE_URL: "https://example.test/v1" }), "https://api.x.ai/v1");
  assert.equal(resolveGrokBaseUrl({ NODE_ENV: "development", LLM_BASE_URL: "https://example.test/v1" }), "https://example.test/v1");
  assert.equal(EMBEDDING_MODEL, process.env.XAI_EMBEDDING_MODEL ?? "v1");
  const saved = process.env.AI_ASSIST_ENABLED;
  delete process.env.AI_ASSIST_ENABLED;
  assert.equal(isAiEnabled(), true);
  process.env.AI_ASSIST_ENABLED = "false";
  assert.equal(isAiEnabled(), false);
  if (saved === undefined) delete process.env.AI_ASSIST_ENABLED;
  else process.env.AI_ASSIST_ENABLED = saved;
});

test("weekly topic filter drops used slugs and statistic angles", async () => {
  const { topicsNotYetUsed } = await import("./lib/contentAI.js");
  const fresh = topicsNotYetUsed([
    { topic: "already-used", angle: "A practical note." },
    { topic: "new-topic", angle: "A practical note with no numbers." },
    { topic: "bad-stat", angle: "This cuts calls in half." },
  ], new Set(["already-used"]));
  assert.deepEqual(fresh.map((row) => row.topic), ["new-topic"]);
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
