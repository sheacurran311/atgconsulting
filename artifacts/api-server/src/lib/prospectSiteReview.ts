import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

const agent = "ATGSiteReview";
const maximumPageBytes = 256 * 1024;
const maximumRobotsBytes = 64 * 1024;
const deniedIPv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) deniedIPv4.addSubnet(network, prefix, "ipv4");
const globalIPv6 = new BlockList();
globalIPv6.addSubnet("2000::", 3, "ipv6");
const deniedIPv6 = new BlockList();
for (const [network, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  deniedIPv6.addSubnet(network, prefix, "ipv6");
}

export function isPublicAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !deniedIPv4.check(address, "ipv4") :
    family === 6 && globalIPv6.check(address, "ipv6") && !deniedIPv6.check(address, "ipv6");
}

export function safeOfficialUrl(input: string) {
  try {
    const url = new URL(input.includes("://") ? input : "https://" + input);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      url.search || url.hash || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname)) return null;
    if (/\.(localhost|local|internal|invalid|test|onion|example|home|lan)$/.test(url.hostname)) return null;
    return url;
  } catch {return null;}
}

type Endpoint = {address: string; family: number};
type Page = {status: number; contentType: string; body: string};
type Reader = (url: URL, endpoint: Endpoint, limit: number) => Promise<Page>;
export function readPinnedPage(url: URL, endpoint: Endpoint, limit: number): Promise<Page> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET", agent: false, maxHeaderSize: 16 * 1024,
      signal: AbortSignal.timeout(6000), family: endpoint.family,
      headers: {"User-Agent": agent, Accept: "text/plain, text/html", "Accept-Encoding": "identity"},
      lookup: (_host, _options, callback) => callback(null, endpoint.address, endpoint.family),
    }, res => {
      res.once("error", reject);
      const status = res.statusCode ?? 0;
      const contentType = res.headers["content-type"] ?? "";
      if (status !== 200) {res.destroy(); resolve({status, contentType, body: ""}); return;}
      if (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") {
        res.destroy(new Error("The server returned unsupported content encoding.")); return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > limit) {res.destroy(new Error("The response exceeded the review size limit.")); return;}
        chunks.push(chunk);
      });
      res.once("end", () => resolve({status, contentType, body: Buffer.concat(chunks).toString("utf8")}));
    });
    req.on("error", reject);
    req.end();
  });
}

function disallowedPath(path: string, prefix: string, anchored: boolean) {
  const pieces = prefix.split("*");
  const first = pieces.shift() ?? "";
  if (!path.startsWith(first)) return false;
  if (!pieces.length) return !anchored || path === first;
  const last = anchored ? pieces.pop() ?? "" : "";
  const stop = path.length - last.length;
  if (anchored && !path.endsWith(last)) return false;
  let position = first.length;
  for (const piece of pieces) {
    if (!piece) continue;
    const start = path.indexOf(piece, position);
    if (start === -1) return false;
    position = start + piece.length;
  }
  return position <= stop;
}

export function robotsAllows(robots: string, path: string) {
  let applies = false;
  let hasRule = false;
  for (const line of robots.split(/\r?\n/)) {
    const [, directive, value] = line.replace(/#.*/, "").match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i) ?? [];
    if (!directive || value === undefined) continue;
    if (directive.toLowerCase() === "user-agent") {
      if (hasRule) applies = false;
      hasRule = false;
      applies ||= value === "*" || value.toLowerCase() === agent.toLowerCase();
    } else if (["allow", "disallow"].includes(directive.toLowerCase())) {
      hasRule = true;
      if (!applies || directive.toLowerCase() !== "disallow" || !value) continue;
      const end = value.endsWith("$");
      const prefix = end ? value.slice(0, -1) : value;
      if (disallowedPath(path, prefix, end)) return false;
    }
  }
  return true;
}

export async function reviewOfficialSite(input: string, resolve = (host: string) => lookup(host, {all: true}), read: Reader = readPinnedPage) {
  const url = safeOfficialUrl(input);
  if (!url) throw new Error("Use the final public HTTPS page with no query parameters.");
  let timer: NodeJS.Timeout | undefined;
  let answers: Endpoint[];
  try {
    answers = await Promise.race([
      resolve(url.hostname),
      new Promise<never>((_, reject) => {timer = setTimeout(() => reject(new Error("The DNS lookup timed out.")), 4000);}),
    ]);
  } finally {clearTimeout(timer);}
  if (!answers.length || answers.some(item => !isPublicAddress(item.address) || isIP(item.address) !== item.family)) {
    throw new Error("The site did not resolve to public addresses.");
  }
  const endpoint = answers[0]!;
  const robots = await read(new URL("/robots.txt", url), endpoint, maximumRobotsBytes);
  if ((robots.status === 200 && (!robots.contentType.includes("text/plain") || !robotsAllows(robots.body, url.pathname))) ||
    ![200, 404, 410].includes(robots.status)) throw new Error("The site's crawl policy prevents automated review.");
  const page = await read(url, endpoint, maximumPageBytes);
  if (page.status !== 200 || !page.contentType.toLowerCase().includes("text/html")) {
    throw new Error("The final official page did not return HTML. Review it manually.");
  }
  const markup = page.body.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const observations = [
    /<title\b[^>]*>\s*[^<\s]/i.test(markup) ? "A page title is present." : "No page title was observed in this HTML response.",
    /<meta\b[^>]*\bname\s*=\s*["']?viewport\b/i.test(markup) ? "A viewport meta tag is present." : "No viewport meta tag was observed in this HTML response.",
    /<form\b/i.test(markup) ? "A form element is present." : "No form element was observed in this HTML response. Check client-rendered forms manually.",
    /href\s*=\s*["']?tel:/i.test(markup) ? "A tap-to-call link is present." : "No tap-to-call link was observed in this HTML response.",
  ];
  return {sourceUrl: url.href, observations};
}
