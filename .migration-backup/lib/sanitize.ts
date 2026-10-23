// Input sanitisation helpers.
// Free-text fields go through sanitiseText before being interpolated into LLM prompts.

const MAX_FREE_TEXT = 280;
const MAX_SHORT_TEXT = 120;

/**
 * Strip control characters, zero-width chars, and normalise whitespace.
 * Also caps length to prevent oversized inputs reaching the LLM.
 */
export function sanitiseText(raw: string, maxLength = MAX_FREE_TEXT): string {
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "") // control + zero-width
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function sanitiseShortText(raw: string): string {
  return sanitiseText(raw, MAX_SHORT_TEXT);
}

/**
 * Wrap user-supplied text in XML-style delimiters so the LLM treats it as data,
 * not as instructions. Any attempt to close the tag is stripped.
 */
export function promptSafe(value: string, tag = "user_input"): string {
  const clean = value.replace(new RegExp(`</?${tag}>`, "gi"), "");
  return `<${tag}>${clean}</${tag}>`;
}
