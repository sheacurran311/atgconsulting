import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgresql://noop:noop@localhost:5432/noop";

test("parsers keep only real public listing URLs", async () => {
  const {
    parseMcpServers, parseClaudeMarketplace, parseClaudeSkills, parseGrokMarketplace, isPublicHttpsUrl,
  } = await import("./lib/catalogHarvest.js");

  assert.equal(isPublicHttpsUrl("http://example.com"), false);
  assert.equal(isPublicHttpsUrl("https://localhost/secret"), false);
  assert.equal(isPublicHttpsUrl("https://127.0.0.1/mcp"), false);
  assert.equal(isPublicHttpsUrl("https://github.com/anthropics/skills"), true);

  const mcp = parseMcpServers({
    servers: [
      { server: { name: "io.example/docs", title: "Docs", description: "Reads docs." } },
      { server: { name: "io.example/gone", title: "Gone" }, _meta: { "io.modelcontextprotocol.registry/official": { status: "deleted" } } },
    ],
  });
  assert.equal(mcp.length, 1);
  assert.equal(mcp[0]!.sourceUrl, "https://registry.modelcontextprotocol.io/v0.1/servers/io.example%2Fdocs/versions/latest");

  const plugins = parseClaudeMarketplace({
    plugins: [
      { name: "commit-commands", description: "Git commits.", source: { url: "https://github.com/anthropics/claude-plugins-official" } },
      { name: "relative", description: "no url", source: { url: "plugins/local" } },
      { name: "homepage-only", description: "site", homepage: "https://example.com/plugin" },
    ],
  });
  assert.deepEqual(plugins.map((item) => item.sourceUrl), [
    "https://github.com/anthropics/claude-plugins-official",
    "https://example.com/plugin",
  ]);

  const skills = parseClaudeSkills([
    { name: "pdf", type: "dir" },
    { name: "README.md", type: "file" },
    { name: "../escape", type: "dir" },
  ]);
  assert.deepEqual(skills.map((item) => item.sourceUrl), [
    "https://github.com/anthropics/skills/tree/main/skills/pdf",
  ]);

  const html = [
    String.raw`{"@type":"ListItem","position":9,"name":"Haggle Bot","url":"https://x.ai/bot/marketplace/bots/haggle-bot"}`,
    "https://x.ai/bot/not-a-listing",
    String.raw`{"@type":"ListItem","position":2,"name":"Made Up","url":"https://evil.example/bot"}`,
  ].join(" ");
  const grok = parseGrokMarketplace(html);
  assert.deepEqual(grok.map((item) => item.sourceUrl), ["https://x.ai/bot/marketplace/bots/haggle-bot"]);
});

test("harvest link-checks public sources, skips the GPT Store, and does not invent URLs", async () => {
  const { runCatalogHarvest } = await import("./lib/catalogHarvest.js");
  const inserted: { sourceUrl: string; reviewNotes: string; howItHelps: string }[] = [];

  const fetchImpl = (async (input: string | URL) => {
    const url = String(input);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    const text = (body: string, status = 200) => new Response(body, { status });
    if (url.includes("/v0.1/servers?")) {
      return json({ servers: [{ server: { name: "io.example/docs", title: "Docs", description: "Reads docs." } }] });
    }
    if (url.includes("/v0.1/servers/")) return text("ok");
    if (url.includes("marketplace.json")) {
      return json({ plugins: [
        { name: "commit-commands", description: "Git commits.", source: { url: "https://github.com/anthropics/claude-plugins-official" } },
        { name: "no-url", description: "skip me" },
      ] });
    }
    if (url.includes("github.com/anthropics/claude-plugins-official")) return text("ok");
    if (url.includes("api.github.com/repos/anthropics/skills")) {
      return json([{ name: "pdf", type: "dir" }, { name: "README.md", type: "file" }]);
    }
    if (url.includes("github.com/anthropics/skills/tree")) return text("ok");
    if (url.includes("x.ai/bot/marketplace") && !url.includes("/bots/")) {
      return text(String.raw`{"@type":"ListItem","position":1,"name":"Haggle Bot","url":"https://x.ai/bot/marketplace/bots/haggle-bot"}`);
    }
    if (url.includes("x.ai/bot/marketplace/bots/haggle-bot")) return text("ok");
    if (url.includes("chatgpt.com")) return text("blocked", 403);
    return text("missing", 404);
  }) as typeof fetch;

  const report = await runCatalogHarvest({
    fetch: fetchImpl,
    pendingCount: async () => 0,
    existingUrls: async () => new Set(["https://github.com/anthropics/skills/tree/main/skills/pdf"]),
    insert: async (row) => { inserted.push(row); },
    tag: async () => null,
  });

  assert.equal(report.status, "ok");
  assert.ok(report.skippedSources.some((item) => item.source === "GPT Store" && /No unauthenticated public catalog/.test(item.reason)));
  const urls = inserted.map((row) => row.sourceUrl).sort();
  assert.deepEqual(urls, [
    "https://github.com/anthropics/claude-plugins-official",
    "https://registry.modelcontextprotocol.io/v0.1/servers/io.example%2Fdocs/versions/latest",
    "https://x.ai/bot/marketplace/bots/haggle-bot",
  ].sort());
  assert.ok(inserted.every((row) => row.reviewNotes.startsWith("Harvested from")));
  assert.equal(inserted.find((row) => row.sourceUrl.includes("haggle-bot"))?.howItHelps.includes("https://x.ai/"), true);
});

test("harvest stops when the pending queue is full", async () => {
  const { runCatalogHarvest } = await import("./lib/catalogHarvest.js");
  let fetched = false;
  const report = await runCatalogHarvest({
    fetch: (async () => { fetched = true; return new Response("no", { status: 500 }); }) as typeof fetch,
    pendingCount: async () => 40,
    existingUrls: async () => new Set(),
    insert: async () => { throw new Error("should not insert"); },
    tag: async () => null,
  });
  assert.equal(report.status, "skipped");
  assert.equal(report.inserted, 0);
  assert.equal(fetched, false);
  assert.match(report.note ?? "", /full/);
});
