import { z } from "zod";

const row = z.object({
  label: z.string().trim().min(1).max(200),
  amount: z.string().regex(/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/),
}).strict();

export function cents(amount: string): number {
  const [dollars, fraction = ""] = amount.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

const rows = z.array(row).min(1).max(50);
export const quoteSchema = z.object({
  workstreams: rows,
  installments: rows,
}).strict().superRefine((quote, ctx) => {
  const total = (items: typeof quote.workstreams) => items.reduce((sum, item) => sum + cents(item.amount), 0);
  if (quote.workstreams.some(item => cents(item.amount) === 0) ||
      quote.installments.some(item => cents(item.amount) < 50)) {
    ctx.addIssue({ code: "custom", message: "Each workstream needs a positive fee and each installment must be at least $0.50." });
  }
  if (total(quote.workstreams) !== total(quote.installments)) {
    ctx.addIssue({ code: "custom", message: "Scheduled payments must equal the workstream fees." });
  }
});

export function reviewedInvestment(input: unknown) {
  const quote = quoteSchema.parse(input);
  const usd = (value: number) => (value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const format = (items: typeof quote.workstreams) => items.map(item => item.label + ": " + usd(cents(item.amount))).join("\n");
  return {
    tier: "Custom engagement", price: usd(quote.workstreams.reduce((sum, item) => sum + cents(item.amount), 0)),
    care: "", notes: "Workstreams\n" + format(quote.workstreams) + "\n\nPayment schedule (USD)\n" + format(quote.installments),
    quote,
  };
}

export function savedQuote(investment: string) {
  try { const result = quoteSchema.safeParse(JSON.parse(investment)?.quote); return result.success ? result.data : null; }
  catch { return null; }
}
