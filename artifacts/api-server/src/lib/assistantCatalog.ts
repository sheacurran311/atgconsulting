/**
 * General assistants and self-hosted claws.
 * Seeded unverified. Shea verifies a row before any client can see it.
 * Descriptions stay general. No prices, benchmarks, or feature lists that go stale.
 */
import type { PrismaClient } from "@prisma/client";
import { CLAW_SAFETY_NOTE } from "./catalogKinds";

export interface AssistantSeed {
  slug: string;
  kind: "model" | "claw";
  name: string;
  maker: string;
  sourceUrl: string;
  goodFor: string;
  tierFit: "all";
  requiresModels: string[];
  setupDifficulty: string;
  hostingRequirement: string;
  safetyNote: string;
}

export const ASSISTANT_SEEDS: AssistantSeed[] = [
  {
    slug: "model-grok",
    kind: "model",
    name: "Grok",
    maker: "xAI",
    sourceUrl: "https://grok.com",
    goodFor: "A general assistant for drafting and questions.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-claude",
    kind: "model",
    name: "Claude",
    maker: "Anthropic",
    sourceUrl: "https://claude.ai",
    goodFor: "A general assistant for drafting and for reading files you choose to attach.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-chatgpt",
    kind: "model",
    name: "ChatGPT",
    maker: "OpenAI",
    sourceUrl: "https://chatgpt.com",
    goodFor: "A general assistant for drafting and everyday questions.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-gemini",
    kind: "model",
    name: "Gemini",
    maker: "Google",
    sourceUrl: "https://gemini.google.com",
    goodFor: "A general assistant for drafting and questions.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-copilot",
    kind: "model",
    name: "Microsoft Copilot",
    maker: "Microsoft",
    sourceUrl: "https://copilot.microsoft.com",
    goodFor: "A general assistant worth a look if your team already works in Microsoft tools.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-perplexity",
    kind: "model",
    name: "Perplexity",
    maker: "Perplexity",
    sourceUrl: "https://www.perplexity.ai",
    goodFor: "An answer assistant for questions when you want links you can open and check.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-meta-ai",
    kind: "model",
    name: "Meta AI",
    maker: "Meta",
    sourceUrl: "https://www.meta.ai",
    goodFor: "A general assistant for drafting and questions.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-le-chat",
    kind: "model",
    name: "Le Chat",
    maker: "Mistral",
    sourceUrl: "https://chat.mistral.ai",
    goodFor: "A general assistant for drafting and questions.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "model-muse",
    kind: "model",
    name: "Muse",
    maker: "Meta",
    sourceUrl: "https://muse.ai/",
    goodFor: "A personal assistant from Meta, separate from Meta AI. If that page does not open, the product page is https://ai.meta.com/muse/.",
    tierFit: "all",
    requiresModels: [],
    setupDifficulty: "",
    hostingRequirement: "",
    safetyNote: "",
  },
  {
    slug: "claw-openclaw",
    kind: "claw",
    name: "OpenClaw",
    maker: "OpenClaw",
    sourceUrl: "https://github.com/openclaw/openclaw",
    goodFor: "A self-hosted assistant you run yourself and connect to a model provider you choose.",
    tierFit: "all",
    requiresModels: ["A model provider you configure"],
    setupDifficulty: "You install and host it yourself",
    hostingRequirement: "Your own computer or a server you control",
    safetyNote: CLAW_SAFETY_NOTE,
  },
  {
    slug: "claw-nanoclaw",
    kind: "claw",
    name: "NanoClaw",
    maker: "NanoClaw",
    sourceUrl: "https://github.com/nanocoai/nanoclaw",
    goodFor: "A smaller self-hosted agent. Its project describes agents running in containers.",
    tierFit: "all",
    requiresModels: ["Anthropic"],
    setupDifficulty: "You install and host it yourself",
    hostingRequirement: "Your own computer or a server you control",
    safetyNote: CLAW_SAFETY_NOTE,
  },
  {
    slug: "claw-zeroclaw",
    kind: "claw",
    name: "ZeroClaw",
    maker: "ZeroClaw",
    sourceUrl: "https://github.com/zeroclaw-labs/zeroclaw",
    goodFor: "A self-hosted agent program. You choose the model provider, including a local one.",
    tierFit: "all",
    requiresModels: ["A model provider you configure"],
    setupDifficulty: "You install and host it yourself",
    hostingRequirement: "Your own computer or a server you control",
    safetyNote: CLAW_SAFETY_NOTE,
  },
];

export async function seedAssistantCatalog(prisma: PrismaClient): Promise<void> {
  for (const seed of ASSISTANT_SEEDS) {
    const existing = await prisma.catalogItem.findUnique({ where: { slug: seed.slug } });
    if (existing) continue;
    await prisma.catalogItem.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        kind: seed.kind,
        sourceType: seed.kind,
        sourceUrl: seed.sourceUrl,
        maker: seed.maker,
        description: seed.goodFor,
        howItHelps: seed.goodFor,
        tags: JSON.stringify({ departments: [], tasks: [], industries: [] }),
        tierFit: seed.tierFit,
        requiresModels: JSON.stringify(seed.requiresModels),
        setupDifficulty: seed.setupDifficulty,
        hostingRequirement: seed.hostingRequirement,
        safetyNote: seed.safetyNote,
        verified: false,
        enabled: true,
        reviewStatus: "pending",
      },
    });
  }
}
