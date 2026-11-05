/**
 * Catalog kinds. Clients only see verified, enabled rows.
 * Models are general assistants. Claws are self-hosted agents that need a model.
 */

export const CATALOG_KINDS = ["template", "model", "claw"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const CLAW_SAFETY_NOTE =
  "This runs with your own keys on your own machine. Review the permissions it asks for before you install it. The ATG app never connects to it and never stores those keys.";

export function clientCanSeeCatalogItem(item: { verified: boolean; enabled: boolean }): boolean {
  return item.verified === true && item.enabled === true;
}

export function isCatalogKind(value: string | undefined): value is CatalogKind {
  return value === "template" || value === "model" || value === "claw";
}
