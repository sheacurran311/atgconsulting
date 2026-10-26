/**
 * WorkflowTemplate admin routes.
 * Admin can view, edit, enable/disable, and reset-to-default any template.
 * Each template is exportable as a SKILL.md for Grok Bot / Claude / ChatGPT.
 *
 * GET    /admin/workflow-templates              — list all
 * GET    /admin/workflow-templates/:slug        — get one
 * PATCH  /admin/workflow-templates/:slug        — edit (name, description, systemPrompt, etc.)
 * POST   /admin/workflow-templates/:slug/reset  — reset to code default
 * GET    /admin/workflow-templates/:slug/skill  — download as SKILL.md
 *
 * Public (client):
 * GET    /workflow-templates                    — list enabled templates (no prompts, just metadata)
 */

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db";
import { withUser, requireAuth, requireAdmin } from "../lib/auth";
import { TEMPLATE_SEEDS, renderSkillMd } from "../lib/templates";

const router = Router();

// ── Public: list enabled templates (metadata only, no system prompts) ────────

router.get("/workflow-templates", withUser, requireAuth, async (_req, res) => {
  const templates = await prisma.workflowTemplate.findMany({
    where: { enabled: true },
    orderBy: { name: "asc" },
    select: {
      slug: true, name: true, description: true,
      verticalTags: true, minTier: true, inputSchema: true,
      outputFormat: true, version: true,
    },
  });
  res.json(templates);
});

// ── Admin: list all (with full content) ──────────────────────────────────────

router.get("/admin/workflow-templates", withUser, requireAdmin, async (_req, res) => {
  const templates = await prisma.workflowTemplate.findMany({ orderBy: { slug: "asc" } });
  res.json(templates);
});

// ── Admin: get one ───────────────────────────────────────────────────────────

router.get("/admin/workflow-templates/:slug", withUser, requireAdmin, async (req, res) => {
  const t = await prisma.workflowTemplate.findUnique({ where: { slug: req.params.slug as string } });
  if (!t) { res.status(404).json({ error: "Template not found." }); return; }
  res.json(t);
});

// ── Admin: edit ──────────────────────────────────────────────────────────────

const TemplatePatchSchema = z.object({
  name:               z.string().min(1).max(200).optional(),
  description:        z.string().max(1000).optional(),
  verticalTags:       z.string().optional(), // JSON array string
  minTier:            z.enum(["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"]).optional(),
  systemPrompt:       z.string().min(1).max(20_000).optional(),
  userPromptTemplate: z.string().max(10_000).optional(),
  inputSchema:        z.string().optional(),
  outputFormat:       z.string().max(2000).optional(),
  enabled:            z.boolean().optional(),
});

router.patch("/admin/workflow-templates/:slug", withUser, requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  const existing = await prisma.workflowTemplate.findUnique({ where: { slug } });
  if (!existing) { res.status(404).json({ error: "Template not found." }); return; }

  const parsed = TemplatePatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(422).json({ error: "Validation failed.", issues: parsed.error.flatten() }); return; }

  const updated = await prisma.workflowTemplate.update({
    where: { slug },
    data: { ...parsed.data, version: existing.version + 1 },
  });
  res.json(updated);
});

// ── Admin: reset to code default ─────────────────────────────────────────────

router.post("/admin/workflow-templates/:slug/reset", withUser, requireAdmin, async (req, res) => {
  const slug = req.params.slug as string;
  const seed = TEMPLATE_SEEDS.find((s) => s.slug === slug);
  if (!seed) { res.status(404).json({ error: "No code default found for this slug." }); return; }

  const existing = await prisma.workflowTemplate.findUnique({ where: { slug } });
  if (!existing) { res.status(404).json({ error: "Template not found." }); return; }

  const updated = await prisma.workflowTemplate.update({
    where: { slug },
    data: {
      name:               seed.name,
      description:        seed.description,
      verticalTags:       JSON.stringify(seed.verticalTags),
      minTier:            seed.minTier,
      systemPrompt:       seed.systemPrompt,
      userPromptTemplate: seed.userPromptTemplate,
      inputSchema:        seed.inputSchema,
      outputFormat:       seed.outputFormat,
      version:            existing.version + 1,
    },
  });
  res.json({ ...updated, _resetTo: "code default" });
});

// ── Admin: export as SKILL.md ─────────────────────────────────────────────────

router.get("/admin/workflow-templates/:slug/skill", withUser, requireAdmin, async (req, res) => {
  const t = await prisma.workflowTemplate.findUnique({ where: { slug: req.params.slug as string } });
  if (!t) { res.status(404).json({ error: "Template not found." }); return; }
  const md = renderSkillMd(t);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${t.slug}.skill.md"`);
  res.send(md);
});

export default router;
