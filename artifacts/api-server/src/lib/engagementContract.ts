import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

type Workspace = {clientId: string; workspace: string};
type Database = Pick<Prisma.TransactionClient, "engagementRevision">;
const revision = z.number().int().positive();

export const ContractSelection = z.object({
  expectedUpdatedAt: z.string().datetime(),
  additionalHourlyCents: z.number().int().min(10000).max(99999999),
  measurementVersion: revision,
  slaVersion: revision.nullable(),
  opportunityRefs: z.array(z.object({reference: z.string().regex(/^[A-Z0-9][A-Z0-9-]{0,26}$/), version: revision}).strict()).max(20).default([]),
}).strict();

const ContractBinding = z.object({
  proposalId: z.string(),
  approvedAt: z.string().datetime(),
  statementOfWorkDigest: z.string(),
  additionalHourlyCents: z.number().int().min(10000).max(99999999),
  measurementVersion: revision,
  slaVersion: revision.nullable(),
  estimateVersion: revision.nullable(),
  opportunities: z.array(z.object({reference: z.string(), version: revision})),
  digest: z.string(),
}).strict();
export type ContractBinding = z.infer<typeof ContractBinding>;
export const digestOf = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function newContractBinding(input: Omit<ContractBinding, "digest">): ContractBinding {
  return ContractBinding.parse({...input, digest: digestOf(input)});
}

export async function contractBindingFor(db: Database, scope: Workspace, proposalId: string) {
  const row = await db.engagementRevision.findFirst({
    where: {...scope, kind: "contract-binding", period: "", version: 1, status: "internal"},
  });
  if (!row) return null;
  const binding = ContractBinding.parse(JSON.parse(row.content));
  if (binding.proposalId !== proposalId) throw new Error("Proposal binding identity mismatch.");
  return binding;
}

export async function commercialReviewSources(db: Database, scope: Workspace) {
  const [measurement, sla, opportunities, transfer] = await Promise.all([
    db.engagementRevision.findFirst({
      where: {...scope, kind: "measurement", period: "", status: "published"}, orderBy: {version: "desc"},
    }),
    db.engagementRevision.findFirst({
      where: {...scope, kind: "sla", period: "", status: {in: ["published", "executed"]}}, orderBy: {version: "desc"},
    }),
    db.engagementRevision.findMany({
      where: {...scope, kind: "opportunity", status: "reviewed"}, orderBy: {version: "desc"}, distinct: ["period"], take: 100,
    }),
    db.engagementRevision.findFirst({
      where: {...scope, kind: "quote-transfer", period: "", status: "internal"}, orderBy: {createdAt: "desc"},
    }),
  ]);
  return {measurement, sla, opportunities, transfer};
}
