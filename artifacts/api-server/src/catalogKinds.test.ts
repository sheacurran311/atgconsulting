import assert from "node:assert/strict";
import test from "node:test";
import { ASSISTANT_SEEDS } from "./lib/assistantCatalog";
import { CLAW_SAFETY_NOTE, clientCanSeeCatalogItem } from "./lib/catalogKinds";

test("clients only see verified, enabled catalog rows", () => {
    assert.equal(clientCanSeeCatalogItem({ verified: false, enabled: true }), false);
    assert.equal(clientCanSeeCatalogItem({ verified: true, enabled: false }), false);
    assert.equal(clientCanSeeCatalogItem({ verified: true, enabled: true }), true);
});

test("assistant seeds", () => {
  const models = ASSISTANT_SEEDS.filter((seed) => seed.kind === "model");
  const claws = ASSISTANT_SEEDS.filter((seed) => seed.kind === "claw");
    assert.deepEqual(models.map((seed) => seed.name), [
      "Grok", "Claude", "ChatGPT", "Gemini", "Microsoft Copilot", "Perplexity", "Meta AI", "Le Chat",
    ]);
    assert.equal(ASSISTANT_SEEDS.some((seed) => /muse/i.test(seed.name)), false);
    for (const seed of models) {
      assert.equal(seed.kind, "model");
      assert.ok(seed.maker.length > 0);
      assert.ok(seed.sourceUrl.startsWith("https://"));
      assert.ok(seed.goodFor.length > 20);
      assert.equal(seed.tierFit, "all");
      assert.doesNotMatch(seed.goodFor, /\$|benchmark|%|faster|cheaper/i);
    }
    assert.ok(claws.length > 0);
    for (const seed of claws) {
      assert.equal(seed.safetyNote, CLAW_SAFETY_NOTE);
      assert.ok(seed.requiresModels.length > 0);
      assert.ok(seed.sourceUrl.startsWith("https://github.com/"));
      assert.ok(seed.hostingRequirement.length > 0);
    }
});
