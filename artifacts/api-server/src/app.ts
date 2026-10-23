import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { isIP } from "node:net";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

// Fail closed unless exact trusted proxy addresses/CIDRs are configured.
// Express then walks from the socket peer toward the first untrusted address,
// rather than blindly using the client-controlled leftmost forwarded header.
const trustedProxies = (process.env.TRUSTED_PROXY_CIDRS ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);
for (const proxy of trustedProxies) {
  const [address, prefix, ...extra] = proxy.split("/");
  const version = isIP(address!);
  if (!version || extra.length || (prefix !== undefined &&
    (!/^\d+$/.test(prefix) || Number(prefix) <= 0 || Number(prefix) > (version === 4 ? 32 : 128)))) {
    throw new Error("TRUSTED_PROXY_CIDRS must contain specific IP addresses or CIDRs, not wildcard trust.");
  }
}
app.set("trust proxy", trustedProxies.length ? trustedProxies : false);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.type === "entity.parse.failed" ? 400 : 500;
  if (status === 400) req.log.warn({ status }, "Invalid JSON request");
  else req.log.error({ err }, "Request failed");
  res.status(status).json({
    error: status === 400 ? "Invalid request body." : "Unable to save your submission. Please try again.",
  });
});

export default app;
