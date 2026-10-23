/** Guided and white-glove clients have Shea as their operator. Self-serve and no plan do not. */
export function hasOperator(tier: string | null | undefined): boolean {
  return tier === "GUIDED" || tier === "WHITE_GLOVE";
}
