/**
 * StorageProvider — pluggable file storage.
 * STORAGE_DRIVER=local (default, dev) | s3 | replit
 *
 * In dev/Replit, files go to LOCAL_STORAGE_DIR (default: ./uploads/).
 * For production S3/R2/B2 set S3_BUCKET, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY,
 * optionally S3_ENDPOINT for non-AWS providers.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StorageProvider {
  put(key: string, buffer: Buffer, mime: string): Promise<void>;
  getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// ── Local disk ────────────────────────────────────────────────────────────────

const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR ?? path.join(process.cwd(), "uploads");

const localProvider: StorageProvider = {
  async put(key, buffer) {
    const dest = path.join(LOCAL_DIR, key);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest, buffer);
  },
  async getSignedUrl(key, ttlSeconds) {
    // For local dev: generate a short-lived token-signed URL
    const expires = Date.now() + ttlSeconds * 1000;
    const token = crypto
      .createHmac("sha256", process.env.STORAGE_SIGN_SECRET ?? "local-dev-secret")
      .update(`${key}:${expires}`)
      .digest("hex")
      .slice(0, 16);
    return `/api/documents/local/${encodeURIComponent(key)}?t=${token}&exp=${expires}`;
  },
  async delete(key) {
    const dest = path.join(LOCAL_DIR, key);
    await fs.promises.rm(dest, { force: true });
  },
};

// ── Factory ───────────────────────────────────────────────────────────────────

function getStorage(): StorageProvider {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") return localProvider;
  // TODO: implement s3 and replit drivers
  console.warn(`[storage] Unknown STORAGE_DRIVER="${driver}", falling back to local`);
  return localProvider;
}

export const storage = getStorage();

export function randomKey(prefix: string, ext: string): string {
  return `${prefix}/${crypto.randomUUID()}${ext}`;
}

/** Verify a local signed URL token */
export function verifyLocalToken(key: string, token: string, exp: string): boolean {
  const expires = parseInt(exp, 10);
  if (isNaN(expires) || Date.now() > expires) return false;
  const expected = crypto
    .createHmac("sha256", process.env.STORAGE_SIGN_SECRET ?? "local-dev-secret")
    .update(`${key}:${expires}`)
    .digest("hex")
    .slice(0, 16);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
