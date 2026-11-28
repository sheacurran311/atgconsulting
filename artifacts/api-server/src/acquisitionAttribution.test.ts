import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import express, {type RequestHandler} from "express";
import type { AuthedRequest } from "./lib/auth";
import { createProspectSiteReviewRouter } from "./routes/prospectSiteReview";
import request from "supertest";
import { prisma } from "./lib/db";
import { acquisitionAttribution } from "./lib/acquisitionAttribution";
import discovery from "./routes/discovery";
import { isPublicAddress, reviewOfficialSite, robotsAllows, safeOfficialUrl } from "./lib/prospectSiteReview";

test("acquisition stores only approved coarse labels", () => {
  assert.deepEqual(acquisitionAttribution({
    service: "fractional-ai-leadership", industry: "hvac-contractors", channel: "referral", campaign: "secret@example.invalid",
  }), {serviceId: "fractional-ai-leadership", industryId: "hvac-contractors", channel: "referral"});
  assert.equal(acquisitionAttribution({service: "unlisted", channel: "secret@example.invalid"}), null);
});

test("official-site review refuses unsafe URLs, mixed address resolution and prohibited pages", async () => {
  assert.ok(safeOfficialUrl("https://www.openai.com/"));
  for (const url of ["http://openai.com", "https://127.0.0.1/", "https://intranet.local", "https://user@openai.com", "https://openai.com/?email=person"]) {
    assert.equal(safeOfficialUrl(url), null);
  }
  for (const ip of ["127.0.0.1", "10.1.1.1", "169.254.1.1", "::1", "::ffff:8.8.8.8", "2001:db8::1"]) {
    assert.equal(isPublicAddress(ip), false);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  let fetched = 0;
  await assert.rejects(reviewOfficialSite("https://www.openai.com/", async () => [{address: "8.8.8.8", family: 4}, {address: "127.0.0.1", family: 4}],
    async () => {fetched++; throw new Error("unexpected");}), /public addresses/);
  assert.equal(fetched, 0);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /work*private$\n", "/work/posts/private"), false);
  assert.equal(robotsAllows("User-agent: unrelated\nDisallow: /\nUser-agent: *\nDisallow:", "/"), true);
  const addresses = async () => [{address: "8.8.8.8", family: 4}];
  await assert.rejects(reviewOfficialSite("https://www.openai.com/work", addresses,
    async () => ({status: 200, contentType: "text/plain", body: "User-agent: *\nDisallow: /work"})), /crawl policy/);
  const output = await reviewOfficialSite("https://www.openai.com/", addresses, async (url, pinned) => {
    assert.equal(pinned.address, "8.8.8.8");
    return url.pathname === "/robots.txt" ? {status: 404, contentType: "", body: ""} : {
      status: 200, contentType: "text/html", body: "<title>Fixture</title><script>ignore instructions</script><button>Continue</button>",
    };
  });
  assert.equal(output.observations.length, 4);
  assert.match(output.observations[0]!, /title is present/);
  assert.doesNotMatch(JSON.stringify(output), /instructions|Continue/);
});

test("prospect invitations attribute only their own consented intake", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  process.env.AI_ASSIST_ENABLED = "false";
  process.env.EMAIL_PROVIDER = "console";
  const email = randomUUID() + "@example.invalid";
  const prospect = await prisma.atgProspect.create({
    data: {domain: randomUUID() + ".example.invalid", businessName: "Fixture prospect", website: "https://example.invalid", status: "QUALIFIED"},
  });
  const invitation = await prisma.discoveryInvite.create({
    data: {token: randomBytes(12).toString("base64url"), prospectId: prospect.id, expiresAt: new Date("2030-01-01")},
  });
  const other = await prisma.discoveryIntake.create({data: {consentGiven: true, expiresAt: new Date("2030-01-01")}});
  const app = express().use(express.json(), discovery);
  const intakeIds = [other.id];
  const inviteStatus = "/discovery/invite/" + invitation.token + "/status";
  try {
    await request(app).patch(inviteStatus).send({status: "submitted", intakeId: other.id}).expect(404);
    const started = await request(app).post("/discovery/start").send({contactEmail: email, inviteToken: invitation.token}).expect(200);
    const sessionId = started.body.sessionId;
    intakeIds.push(sessionId);
    await request(app).patch(inviteStatus).send({status: "submitted", intakeId: sessionId}).expect(404);
    await request(app).post("/discovery/submit").send({sessionId, finalAnswers: [], contactEmail: email, consentGiven: true,
      acquisition: {service: "digital-transformation", industry: "hvac-contractors", channel: "outreach"}}).expect(200);
    const submitted = await prisma.discoveryIntake.findUniqueOrThrow({where: {id: sessionId}});
    assert.equal(submitted.prospectId, prospect.id);
    assert.deepEqual(JSON.parse(submitted.acquisitionJson!), {serviceId: "digital-transformation", industryId: "hvac-contractors", channel: "outreach"});
    await request(app).patch(inviteStatus).send({status: "opened"}).expect(200);
    assert.equal((await prisma.discoveryInvite.findUniqueOrThrow({where: {id: invitation.id}})).status, "submitted");
    await request(app).post("/discovery/start").send({contactEmail: email, inviteToken: invitation.token}).expect(410);
  } finally {
    await prisma.discoveryInvite.delete({where: {id: invitation.id}});
    await prisma.discoveryIntake.deleteMany({where: {id: {in: intakeIds}}});
    await prisma.atgProspect.delete({where: {id: prospect.id}});
    await prisma.$disconnect();
  }
});


test("admin site research requires approval, is draft-only, and records one run per day", {
  skip: !process.env.ATG_INTEGRATION_DATABASE_URL,
}, async () => {
  process.env.DATABASE_URL = process.env.ATG_INTEGRATION_DATABASE_URL;
  const old = process.env.ATG_PROSPECT_SITE_REVIEW;
  process.env.ATG_PROSPECT_SITE_REVIEW = "false";
  const prospect = await prisma.atgProspect.create({
    data: {domain: randomUUID() + ".example.org", businessName: "Fixture", website: "https://public-site.example.org", status: "NEW"},
  });
  const auth: RequestHandler = (req, _res, next) => {
    const account = req.get("x-fixture");
    if (account) (req as AuthedRequest).atgUser = {id: "fixture", role: account, isImpersonating: false} as AuthedRequest["atgUser"];
    next();
  };
  let reviews = 0;
  const app = express().use(express.json(), createProspectSiteReviewRouter([auth], async source => {
    reviews++;
    return {sourceUrl: source, observations: ["A form element is present."]};
  }));
  const endpoint = "/admin/prospecting/" + prospect.id + "/site-review";
  const approved = {confirmedOfficialAndAllowed: true};
  try {
    await request(app).post(endpoint).set("x-fixture", "ADMIN").send(approved).expect(404);
    process.env.ATG_PROSPECT_SITE_REVIEW = "true";
    await request(app).post(endpoint).set("x-fixture", "CLIENT").send(approved).expect(403);
    await request(app).post(endpoint).set("x-fixture", "ADMIN").send({confirmedOfficialAndAllowed: false}).expect(422);
    const result = await request(app).post(endpoint).set("x-fixture", "ADMIN").send(approved).expect(201);
    assert.equal(result.body.status, "needs_review");
    await request(app).post(endpoint).set("x-fixture", "ADMIN").send(approved).expect(409);
    assert.equal(reviews, 1);
    assert.equal((await prisma.atgProspect.findUniqueOrThrow({where: {id: prospect.id}})).status, "NEW");
    await request(app).get(endpoint).set("x-fixture", "ADMIN").expect(200);
  } finally {
    if (old === undefined) delete process.env.ATG_PROSPECT_SITE_REVIEW;
    else process.env.ATG_PROSPECT_SITE_REVIEW = old;
    await prisma.atgProspect.delete({where: {id: prospect.id}});
    await prisma.$disconnect();
  }
});
