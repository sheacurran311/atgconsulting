/**
 * Document routes.
 * GET  /api/documents/[id]/download — authenticated signed-URL redirect
 * GET  /api/documents/local/:key    — serve local-storage files (dev only)
 * POST /api/admin/clients/:id/documents — admin upload (multipart/form-data)
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin, type AuthedRequest } from "../lib/auth";
import { storage, verifyLocalToken, randomKey } from "../lib/storage";
import { audit } from "../lib/audit";

const router = Router();
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), "uploads");

const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

// ── Document download (signed URL) ────────────────────────────────────────────

router.get("/documents/:id/download", withUser, requireAuth, async (req, res) => {
  const user = (req as AuthedRequest).atgUser!;
  const docId = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) { res.status(404).json({ error: "Not found." }); return; }

  // Access control
  const isAdmin = user.role === "ADMIN";
  const ownsDoc = doc.clientId === user.clientId;
  const isSharedLib = !doc.clientId;

  if (!isAdmin && !doc.visibleToClient) { res.status(403).json({ error: "Access denied." }); return; }
  if (!isAdmin && !ownsDoc && !isSharedLib) { res.status(403).json({ error: "Access denied." }); return; }

  // Tier gate
  if (!isAdmin && doc.minTier) {
    const client = user.clientId ? await prisma.client.findUnique({ where: { id: user.clientId } }) : null;
    const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];
    if (TIER_ORDER.indexOf(doc.minTier) > TIER_ORDER.indexOf(client?.tier ?? "NONE")) {
      res.status(403).json({ error: "Upgrade your plan to access this document.", minTier: doc.minTier });
      return;
    }
  }

  await audit({ actorUserId: user.id, action: "DOCUMENT_DOWNLOAD", entity: "Document", entityId: docId, ip: req.ip });

  const signedUrl = await storage.getSignedUrl(doc.storageKey, 300); // 5-min TTL
  res.redirect(302, signedUrl);
});

// ── Local storage serve (dev only) ───────────────────────────────────────────

router.get("/documents/local/:key", (req, res) => {
  if (process.env.NODE_ENV === "production") { res.status(403).end(); return; }
  const rawKey = req.params.key ?? "";
  const key = decodeURIComponent(Array.isArray(rawKey) ? rawKey[0]! : rawKey);
  const token = Array.isArray(req.query.t) ? String(req.query.t[0]) : String(req.query.t ?? "");
  const exp = Array.isArray(req.query.exp) ? String(req.query.exp[0]) : String(req.query.exp ?? "");
  if (!verifyLocalToken(key, token, exp)) { res.status(403).json({ error: "Invalid or expired link." }); return; }
  const filePath = path.join(LOCAL_DIR, key);
  if (!filePath.startsWith(LOCAL_DIR)) { res.status(403).end(); return; } // path traversal guard
  res.sendFile(filePath, (err) => { if (err) res.status(404).end(); });
});

// ── Admin document upload ─────────────────────────────────────────────────────

router.post("/admin/clients/:clientId/documents", withUser, requireAdmin, async (req, res) => {
  const actor = (req as AuthedRequest).atgUser!;
  const clientId2 = Array.isArray(req.params.clientId) ? req.params.clientId[0]! : req.params.clientId;
  const client = await prisma.client.findUnique({ where: { id: clientId2 } });
  if (!client) { res.status(404).json({ error: "Client not found." }); return; }

  // Using raw body for simplicity; in production use multer or busboy
  const contentType = req.headers["content-type"] ?? "";
  const mime = contentType.split(";")[0]?.trim() ?? "";
  if (!ALLOWED_MIME.has(mime)) { res.status(415).json({ error: "File type not allowed." }); return; }

  const chunks: Buffer[] = [];
  let size = 0;
  req.on("data", (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_BYTES) { res.status(413).json({ error: "File too large (max 25 MB)." }); req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    try {
      const buffer = Buffer.concat(chunks);
      const ext = mime === "application/pdf" ? ".pdf" : mime === "image/png" ? ".png" : mime === "image/jpeg" ? ".jpg" : ".bin";
      const key = randomKey(`clients/${client.id}`, ext);
      await storage.put(key, buffer, mime);

      const title = (req.headers["x-document-title"] as string) ?? "Uploaded document";
      const type = (req.headers["x-document-type"] as string) ?? "OTHER";
      const visibleToClient = req.headers["x-visible-to-client"] !== "false";

      const doc = await prisma.document.create({
        data: { clientId: client.id, title, type, storageKey: key, mime, size: buffer.length, visibleToClient, uploadedById: actor.id },
      });
      await audit({ actorUserId: actor.id, action: "DOCUMENT_UPLOAD", entity: "Document", entityId: doc.id, meta: { clientId: client.id, title }, ip: req.ip });
      res.status(201).json(doc);
    } catch (e) {
      res.status(500).json({ error: "Upload failed." });
    }
  });
});

export default router;
