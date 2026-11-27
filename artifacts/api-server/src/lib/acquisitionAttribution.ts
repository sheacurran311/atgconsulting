import { z } from "zod";
import { industrySites } from "./industrySites";
import { transformationServices } from "./transformationServices";

const attribution = z.object({
  service: z.string().nullish(),
  industry: z.string().nullish(),
  channel: z.enum(["referral", "newsletter", "organic", "event", "outreach"]).nullish(),
}).strip();

export function acquisitionAttribution(input: unknown) {
  const result = attribution.safeParse(input);
  if (!result.success) return null;
  const {service, industry, channel} = result.data;
  const serviceId = service === "website" || transformationServices.some(item => item.id === service) ? service : null;
  const industryId = industrySites.some(item => item.slug === industry) ? industry : null;
  return serviceId || industryId || channel ? {serviceId, industryId, channel: channel ?? null} : null;
}
