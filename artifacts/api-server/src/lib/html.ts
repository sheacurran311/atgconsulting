/** Plain text only. Formatting comes from the export's own markup. */
export function escapeHtml(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
    : "";
}
