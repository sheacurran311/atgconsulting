import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { prisma } from "./lib/db";
import type { AuthedRequest } from "./lib/auth";
import { googleAuthorize, googleExchange, googleMetrics, seal, sha256, unseal } from "./lib/seoGoogle";
import { SeoEvidenceInput, summarizeSeo } from "./lib/seoEvidence";
import { SEO_GOOGLE_SCOPES } from "./lib/seoGoogleScopes";
import { createSeoGoogleRouter } from "./routes/seoGoogle";

const key = randomBytes(32);
const config = {clientId: "synthetic", clientSecret: "synthetic", encryptionKey: key,
  origin: "https://fixture.example.invalid", redirectUri: "https://fixture.example.invalid/api/client/seo/google-callback"};
const mock = (data: unknown) => Response.json(data);

test("Google consent requests one read-only scope and uses S256 PKCE", async () => {
  const url = new URL(googleAuthorize(config, "searchConsole", "state", "verifier"));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("scope"), SEO_GOOGLE_SCOPES.searchConsole);
  assert.equal(url.searchParams.get("code_challenge"), sha256("verifier"));
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  await assert.rejects(googleExchange(config, "searchConsole", "code", "verifier", async () => mock({
    access_token: "synthetic", refresh_token: "synthetic", scope: SEO_GOOGLE_SCOPES.searchConsole + " email",
  })));
  const cipher = seal("private-fixture", key, "a");
  assert.equal(unseal(cipher, key, "a"), "private-fixture");
  assert.throws(() => unseal(cipher, key, "another tenant"));
  assert.throws(() => unseal(cipher, randomBytes(32), "a"));
});

test("Google report treats suppressed and absent aggregates as unavailable", async () => {
  const window = {start: "2026-09-10", end: "2026-09-20"};
  assert.equal(await googleMetrics("analytics", "properties/123", "synthetic", window, async () => mock({
    rows: [{metricValues: [{value: "30"}, {value: "2"}]}], metadata: {subjectToThresholding: true},
  })), null);
  assert.equal(await googleMetrics("searchConsole", "sc-domain:example.org", "synthetic", window, async () => mock({rows: []})), null);
  const analytics = await googleMetrics("analytics", "properties/123", "synthetic", window, async (url, init) => {
    assert.match(String(url), /^https:\/\/analyticsdata\.googleapis\.com\//);
    assert.match(String(init?.body), /Organic Search/);
    return mock({rows: [{metricValues: [{value: "30"}, {value: "2"}]}]});
  });
  assert.deepEqual(analytics, {...window, organicSessions: 30, keyEvents: 2});
});

test("SEO review keeps source windows separate and tracks remediation evidence", () => {
  const search = {start: "2026-10-01", end: "2026-10-14", clicks: 100, impressions: 1000, ctr: .1, averagePosition: 6};
  const report = {
    period: "2026-11", gsc: {property: "sc-domain:example.org", baselineReference: "GSC export A", currentReference: "GSC export B"},
    ga4: null, previous: {searchConsole: search}, current: {searchConsole: {...search, start: "2026-11-01", end: "2026-11-14", clicks: 70}},
    notes: "Check seasonal demand", aeo: [], actions: [{action: "Review page", owner: "ATG", due: "2026-11-28", status: "verified", evidence: ""}],
  };
  assert.equal(SeoEvidenceInput.safeParse(report).success, false);
  const parsed = SeoEvidenceInput.parse({...report, actions: [{...report.actions[0], evidence: "Review log 21"}]});
  assert.ok(summarizeSeo(parsed).find(item => item.metric === "clicks" && item.source === "GSC"));
  assert.equal(SeoEvidenceInput.safeParse({...parsed, current: {searchConsole: {...search, start: "2026-10-10"}}}).success, false);
});

test("Google workspace routes verify state ownership and store only selected property data", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  const env = {ATG_GOOGLE_SEO_ENABLED: "true", ATG_GOOGLE_SEO_CLIENT_ID: config.clientId, ATG_GOOGLE_SEO_CLIENT_SECRET: config.clientSecret,
    ATG_GOOGLE_SEO_ENCRYPTION_KEY: key.toString("base64"), APP_URL: config.origin};
  const saved = Object.fromEntries(Object.keys(env).map(name => [name, process.env[name]]));
  Object.assign(process.env, env);
  const [user, other] = await Promise.all([0, 1].map(() => prisma.user.create({
    data: {email: randomUUID() + "@example.invalid", client: {create: {tier: "GUIDED", status: "ACTIVE"}}}, include: {client: true},
  })));
  const modes: RequestHandler = (req, _res, next) => {
    const mode = req.get("x-fixture");
    const actor = mode === "other" ? other! : user!;
    if (mode) (req as AuthedRequest).atgUser = {id: actor.id, role: mode === "admin" ? "ADMIN" : "CLIENT",
      clientId: actor.client!.id, isImpersonating: false} as AuthedRequest["atgUser"];
    next();
  };
  let pulls = 0;
  let challenge = "";
  const fetcher: typeof fetch = async (url, init) => {
    const target = String(url);
    if (target.endsWith("/token")) {
      const form = new URLSearchParams(String(init?.body));
      if (form.get("grant_type") === "authorization_code") {
        assert.equal(sha256(form.get("code_verifier") ?? ""), challenge);
        return mock({access_token: "access-fixture", refresh_token: "private-refresh-fixture", scope: SEO_GOOGLE_SCOPES.searchConsole});
      }
      assert.equal(form.get("refresh_token"), "private-refresh-fixture");
      return mock({access_token: "access-fixture"});
    }
    if (target.endsWith("/sites")) return mock({siteEntry: [
      {siteUrl: "sc-domain:allowed.example.org", permissionLevel: "siteOwner"},
      {siteUrl: "sc-domain:forbidden.example.org", permissionLevel: "siteUnverifiedUser"},
    ]});
    if (target.endsWith("/searchAnalytics/query")) {
      pulls++;
      assert.match(target, /allowed\.example\.org/);
      return mock({rows: [{clicks: 10, impressions: 100, ctr: .1, position: 4}]});
    }
    assert.match(target, /\/revoke$/);
    return new Response("", {status: 200});
  };
  const app = express().use(express.json(), createSeoGoogleRouter([modes], [modes], fetcher));
  const client = {"x-fixture": "client"};
  const path = "/client/seo/connections/searchConsole";
  try {
    await request(app).post(path + "/start").send({}).expect(403);
    await request(app).post(path + "/start").set({...client, origin: "https://untrusted.example.org"}).send({}).expect(403);
    const started = await request(app).post(path + "/start").set(client).send({}).expect(200);
    const url = new URL(started.body.url);
    challenge = url.searchParams.get("code_challenge")!;
    const callback = "/client/seo/google-callback?code=fixture-code&state=" + url.searchParams.get("state");
    await request(app).get(callback).set("x-fixture", "other").expect(403);
    await request(app).get(callback).set(client).expect(303).expect("Location", "/app/reports?google=connected#google-seo");
    await request(app).get(callback).set(client).expect(403);
    const stored = await prisma.seoConnection.findFirstOrThrow({where: {clientId: user!.client!.id}});
    assert.doesNotMatch(JSON.stringify(stored), /private-refresh-fixture|access-fixture/);
    assert.equal((await request(app).get(path + "/properties").set(client).expect(200)).body.properties.length, 1);
    await request(app).put(path + "/property").set(client).send({property: "sc-domain:forbidden.example.org"}).expect(403);
    await request(app).put(path + "/property").set(client).send({property: "sc-domain:allowed.example.org"}).expect(200);
    const admin = "/admin/clients/" + user!.client!.id + "/seo/connections";
    const window = {start: "2026-09-01", end: "2026-09-14"};
    await request(app).post(admin + "/searchConsole/pull").set(client).send(window).expect(403);
    assert.equal((await request(app).post(admin + "/searchConsole/pull").set("x-fixture", "admin").send(window).expect(200)).body.data.clicks, 10);
    await request(app).post(admin + "/searchConsole/pull").set("x-fixture", "admin").send(window).expect(200);
    assert.equal(pulls, 1);
    assert.doesNotMatch(JSON.stringify((await request(app).get(admin).set("x-fixture", "admin").expect(200)).body), /refreshCipher|private-refresh-fixture/);
    await request(app).delete(path).set(client).send({}).expect(200);
    assert.equal(await prisma.seoConnection.count({where: {clientId: user!.client!.id}}), 0);
  } finally {
    await prisma.user.deleteMany({where: {id: {in: [user!.id, other!.id]}}});
    Object.entries(saved).forEach(([name, value]) => value === undefined ? delete process.env[name] : process.env[name] = value);
    await prisma.$disconnect();
  }
});
