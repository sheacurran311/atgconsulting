import { createHash } from "crypto";
import { prisma } from "./db";

const SALT = process.env.IP_HASH_SALT ?? "atg-audit";

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + SALT).digest("hex").slice(0, 16);
}

export async function audit(params: {
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        meta: JSON.stringify(params.meta ?? {}),
        ipHash: hashIp(params.ip),
      },
    });
  } catch (err) {
    // Audit failures must never break the main request
    console.error("[audit] Failed to write log:", err);
  }
}
