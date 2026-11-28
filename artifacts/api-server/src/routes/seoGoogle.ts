import { Router, type Request, type Response } from "express";
import type { SeoConnection } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAdmin, requireAuth, type AuthedRequest } from "../lib/auth";
import { audit } from "../lib/audit";
import { cronAuthorized, presentedCronSecret } from "../lib/cronAuth";
import {
  callbackPath, googleAuthorize, googleExchange, googleMetrics, googleProperties, googleProvider, googleRefresh, googleRevoke,
  GoogleSeoError, googleSeoConfig, googleWindow, randomSecret, seal, sha256, unseal,
} from "../lib/seoGoogle";

type Config = NonNullable<ReturnType<typeof googleSeoConfig>>;
type Window = z.infer<typeof googleWindow>;
const allowed = ["GUIDED", "WHITE_GLOVE"];
const eligible = {tier: {in: allowed}, status: "ACTIVE"};
const clientPath = "/client/seo/connections";
const adminPath = "/admin/clients/:clientId/seo/connections";
const reportPath = "/app/reports";
const reply = (res: Response, status: number, error: string) => res.status(status).json({error});
const scope = (connection: Pick<SeoConnection, "clientId" | "provider">) => "refresh:" + connection.clientId + ":" + connection.provider;
const selectPublic = {provider: true, property: true, status: true, lastPullAt: true} as const;

const connectionValue = (row: {provider: string; property: string | null; status: string; lastPullAt: Date | null}) => ({
  ...row, freshness: row.lastPullAt && Date.now() - row.lastPullAt.getTime() <= 8 * 86_400_000 ? "current" : "unknown",
});

function getConfig(req: Request, res: Response) {
  const config = googleSeoConfig();
  if (!config) {reply(res, 404, "Google SEO connections are disabled."); return null;}
  const origin = req.get("origin");
  if ((origin && origin !== config.origin) || req.get("sec-fetch-site") === "cross-site" ||
    (["POST", "PUT", "DELETE"].includes(req.method) && !req.is("application/json"))) {
    reply(res, 403, "Use the same-site portal."); return null;
  }
  return config;
}

function handleGoogleError(res: Response, error: unknown) {
  if (!(error instanceof GoogleSeoError)) {
    reply(res, 502, "Google returned an unreadable response. Try again or use an authorized export.");
    return;
  }
  reply(res, error.status, error.reason === "permission" ? "Google access changed. Review access or reconnect." :
    error.reason === "quota" ? "Google quota reached. Retry later." : "Google metrics are temporarily unavailable.");
}

async function linked(clientId: string, provider: z.infer<typeof googleProvider>) {
  return prisma.seoConnection.findFirst({where: {clientId, provider, client: eligible}});
}

export function createSeoGoogleRouter(adminAuth = [withUser, requireAdmin], clientAuth = [withUser, requireAuth], fetcher = fetch) {
  const router = Router();

  async function getAccess(config: Config, row: SeoConnection) {
    const provider = googleProvider.parse(row.provider);
    try {
      const currentRefresh = unseal(row.refreshCipher, config.encryptionKey, scope(row));
      const refreshed = await googleRefresh(config, provider, currentRefresh, fetcher);
      if (refreshed.refreshToken && refreshed.refreshToken !== currentRefresh) {
        await prisma.seoConnection.updateMany({
          where: {id: row.id, refreshCipher: row.refreshCipher},
          data: {refreshCipher: seal(refreshed.refreshToken, config.encryptionKey, scope(row))},
        });
      }
      return refreshed.accessToken;
    } catch (error) {
      if (error instanceof GoogleSeoError && error.reason === "permission") {
        await prisma.seoConnection.updateMany({where: {id: row.id, refreshCipher: row.refreshCipher}, data: {status: "reconnect"}});
      }
      throw error;
    }
  }

  async function collect(config: Config, row: SeoConnection, window: Window) {
    if (!row.property || row.status !== "connected") return null;
    const property = row.property;
    const where = {connectionId: row.id, property, ...window};
    const existing = await prisma.seoProviderSnapshot.findUnique({where: {connectionId_property_start_end: where}});
    if (existing) return existing;
    const token = await getAccess(config, row);
    const data = await googleMetrics(googleProvider.parse(row.provider), property, token, window, fetcher);
    if (!data) return null;
    return prisma.$transaction(async db => {
      const current = await db.seoConnection.updateMany({
        where: {id: row.id, property, grantId: row.grantId, status: "connected", client: eligible}, data: {lastPullAt: new Date()},
      });
      if (current.count !== 1) return null;
      return db.seoProviderSnapshot.upsert({
        where: {connectionId_property_start_end: where}, update: {}, create: {...where, content: JSON.stringify(data)},
      });
    });
  }

  router.use(clientPath, ...clientAuth, async (req, res, next) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor?.clientId || actor.isImpersonating) {res.sendStatus(403); return;}
    next();
  });
  router.get(clientPath, async (req, res) => {
    const actor = (req as AuthedRequest).atgUser!;
    const config = googleSeoConfig();
    const authorized = config && await prisma.client.findFirst({where: {id: actor.clientId!, ...eligible}, select: {id: true}});
    const rows = authorized ? await prisma.seoConnection.findMany({where: {clientId: actor.clientId!}, select: selectPublic}) : [];
    res.json({enabled: !!authorized, connections: rows.map(connectionValue)});
  });
  router.post(clientPath + "/:provider/start", async (req, res) => {
    const config = getConfig(req, res);
    if (!config) return;
    const actor = (req as AuthedRequest).atgUser!;
    const provider = googleProvider.safeParse(req.params.provider);
    if (!provider.success || !await prisma.client.findFirst({where: {id: actor.clientId!, ...eligible}, select: {id: true}})) {
      res.sendStatus(403); return;
    }
    const state = randomSecret();
    const verifier = randomSecret();
    const stateHash = sha256(state);
    const data = {stateHash, clientId: actor.clientId!, provider: provider.data, actorUserId: actor.id,
      verifierCipher: seal(verifier, config.encryptionKey, "oauth:" + stateHash), expiresAt: new Date(Date.now() + 600_000), consumedAt: null};
    await prisma.seoOAuthAttempt.upsert({where: {clientId_provider: {clientId: actor.clientId!, provider: provider.data}}, create: data, update: data});
    res.json({url: googleAuthorize(config, provider.data, state, verifier)});
  });
  router.get(callbackPath.replace(/^\/api/, ""), ...clientAuth, async (req, res) => {
    res.set({"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"});
    const config = googleSeoConfig();
    if (!config) {res.sendStatus(404); return;}
    const actor = (req as AuthedRequest).atgUser;
    const state = z.string().regex(/^[A-Za-z0-9_-]{43}$/).safeParse(req.query.state);
    const code = z.string().min(1).max(3000).safeParse(req.query.code);
    if (!actor?.clientId || actor.isImpersonating || !state.success) {res.sendStatus(403); return;}
    const stateHash = sha256(state.data);
    const attempt = await prisma.seoOAuthAttempt.findFirst({
      where: {stateHash, clientId: actor.clientId, actorUserId: actor.id, consumedAt: null, expiresAt: {gt: new Date()}, client: eligible},
    });
    if (!attempt) {res.sendStatus(403); return;}
    const consumed = await prisma.seoOAuthAttempt.updateMany({
      where: {stateHash, clientId: actor.clientId, actorUserId: actor.id, consumedAt: null}, data: {consumedAt: new Date()},
    });
    if (consumed.count !== 1) {res.sendStatus(403); return;}
    if (!code.success || req.query.error || !googleProvider.safeParse(attempt.provider).success) {res.redirect(303, reportPath + "?google=cancelled"); return;}
    try {
      const provider = googleProvider.parse(attempt.provider);
      const refresh = await googleExchange(config, provider, code.data, unseal(attempt.verifierCipher, config.encryptionKey, "oauth:" + stateHash), fetcher);
      const reference = {clientId: actor.clientId, provider};
      const refreshCipher = seal(refresh, config.encryptionKey, scope(reference));
      const saved = await prisma.$transaction(async db => {
        if (!await db.client.findFirst({where: {id: actor.clientId!, ...eligible}, select: {id: true}})) return null;
        const current = await db.seoOAuthAttempt.deleteMany({where: {stateHash, clientId: actor.clientId!, consumedAt: {not: null}}});
        if (current.count !== 1) return null;
        return db.seoConnection.upsert({where: {clientId_provider: reference},
          create: {...reference, refreshCipher, grantId: stateHash},
          update: {refreshCipher, grantId: stateHash, property: null, status: "select_property", lastPullAt: null}});
      });
      if (!saved) {res.sendStatus(403); return;}
      await audit({actorUserId: actor.id, action: "SEO_GOOGLE_CONNECTED", entity: "SeoConnection", entityId: saved.id, meta: {provider}});
      res.redirect(303, reportPath + "?google=connected#google-seo");
    } catch {
      res.redirect(303, reportPath + "?google=error#google-seo");
    }
  });
  router.get(clientPath + "/:provider/properties", async (req, res) => {
    const config = getConfig(req, res);
    if (!config) return;
    const provider = googleProvider.safeParse(req.params.provider);
    const actor = (req as AuthedRequest).atgUser!;
    const row = provider.success ? await linked(actor.clientId!, provider.data) : null;
    if (!row || !provider.success) {res.sendStatus(404); return;}
    try {res.json({properties: await googleProperties(provider.data, await getAccess(config, row), fetcher)});}
    catch (error) {handleGoogleError(res, error);}
  });
  router.put(clientPath + "/:provider/property", async (req, res) => {
    const config = getConfig(req, res);
    if (!config) return;
    const provider = googleProvider.safeParse(req.params.provider);
    const property = z.object({property: z.string().min(1).max(520)}).strict().safeParse(req.body);
    const actor = (req as AuthedRequest).atgUser!;
    if (!provider.success || !property.success) {res.sendStatus(422); return;}
    const row = await linked(actor.clientId!, provider.data);
    if (!row) {res.sendStatus(404); return;}
    try {
      const token = await getAccess(config, row);
      const authorized = await googleProperties(provider.data, token, fetcher);
      if (!authorized.some(item => item.id === property.data.property)) {res.sendStatus(403); return;}
      const updated = await prisma.seoConnection.updateMany({
        where: {id: row.id, grantId: row.grantId, client: eligible, property: row.property, status: row.status},
        data: {property: property.data.property, status: "connected", lastPullAt: row.property === property.data.property ? row.lastPullAt : null},
      });
      if (!updated.count) {reply(res, 409, "The connection changed. Reload before selecting a property."); return;}
      await audit({actorUserId: actor.id, action: "SEO_PROPERTY_SELECTED", entity: "SeoConnection", entityId: row.id, meta: {provider: provider.data}});
      res.json({ok: true});
    } catch (error) {handleGoogleError(res, error);}
  });
  router.delete(clientPath + "/:provider", async (req, res) => {
    const config = getConfig(req, res);
    if (!config) return;
    const provider = googleProvider.safeParse(req.params.provider);
    if (!provider.success) {res.sendStatus(422); return;}
    const actor = (req as AuthedRequest).atgUser!;
    const reference = {clientId: actor.clientId!, provider: provider.data};
    const row = await prisma.seoConnection.findUnique({where: {clientId_provider: reference}});
    const destroyed = await prisma.$transaction(async db => {
      await db.seoOAuthAttempt.deleteMany({where: reference});
      return row ? db.seoConnection.deleteMany({where: {id: row.id, refreshCipher: row.refreshCipher}}) : {count: 0};
    });
    if (!row) {res.json({ok: true}); return;}
    if (!destroyed.count) {reply(res, 409, "The connection changed. Reload and disconnect again."); return;}
    let revoked = false;
    try {revoked = await googleRevoke(unseal(row.refreshCipher, config.encryptionKey, scope(row)), fetcher);}
    catch { /* Local disconnection is already complete. */ }
    await audit({actorUserId: actor.id, action: "SEO_GOOGLE_DISCONNECTED", entity: "SeoConnection", entityId: row.id, meta: {provider: provider.data, revoked}});
    res.json({ok: true, revoked});
  });

  router.use(adminPath, ...adminAuth, (req, res, next) => {
    const actor = (req as AuthedRequest).atgUser;
    res.set("Cache-Control", "private, no-store");
    if (!actor || actor.role !== "ADMIN" || actor.isImpersonating) {res.sendStatus(403); return;}
    next();
  });
  router.get(adminPath, async (req, res) => {
    const enabled = !!googleSeoConfig();
    const clientId = String(req.params.clientId);
    const rows = enabled ? await prisma.seoConnection.findMany({
      where: {clientId, client: eligible}, select: {...selectPublic, snapshots: {
        select: {id: true, property: true, content: true, capturedAt: true}, orderBy: {capturedAt: "desc"}, take: 20,
      }},
    }) : [];
    res.json({enabled, connections: rows.map(({snapshots, ...row}) => ({...connectionValue(row),
      snapshots: snapshots.filter(item => item.property === row.property).map(({content, ...item}) => ({...item, data: JSON.parse(content)})),
    }))});
  });
  router.post(adminPath + "/:provider/pull", async (req, res) => {
    const config = getConfig(req, res);
    if (!config) return;
    const provider = googleProvider.safeParse(req.params.provider);
    const window = googleWindow.safeParse(req.body);
    if (!provider.success || !window.success) {reply(res, 422, "Enter an eligible measurement window."); return;}
    const row = await linked(String(req.params.clientId), provider.data);
    if (!row || row.status !== "connected") {res.sendStatus(404); return;}
    try {
      const snapshot = await collect(config, row, window.data);
      if (!snapshot) {reply(res, 409, "No reliable data was returned for this period."); return;}
      res.json({id: snapshot.id, property: snapshot.property, capturedAt: snapshot.capturedAt, data: JSON.parse(snapshot.content)});
    } catch (error) {handleGoogleError(res, error);}
  });

  router.post("/cron/seo-snapshots", async (req, res) => {
    const config = googleSeoConfig();
    if (!config || process.env.ATG_GOOGLE_SEO_SCHEDULE_ENABLED !== "true") {res.sendStatus(404); return;}
    if (!cronAuthorized(process.env.CRON_SECRET, presentedCronSecret(req.headers))) {res.sendStatus(403); return;}
    const now = Date.now();
    const end = new Date(now - 4 * 86_400_000);
    const start = new Date(end.getTime() - 6 * 86_400_000);
    const window = {start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10)};
    const rows = await prisma.seoConnection.findMany({
      where: {status: "connected", property: {not: null}, client: eligible,
        OR: [{lastPullAt: null}, {lastPullAt: {lt: new Date(now - 6 * 86_400_000)}}]},
      orderBy: [{lastPullAt: {sort: "asc", nulls: "first"}}, {id: "asc"}], take: 10,
    });
    const results = await Promise.allSettled(rows.map(row => collect(config, row, window)));
    res.json({checked: rows.length, captured: results.filter(result => result.status === "fulfilled" && result.value).length,
      failures: results.filter(result => result.status === "rejected").length});
  });
  return router;
}

export default createSeoGoogleRouter();
