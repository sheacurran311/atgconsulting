import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

export const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

export const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#14213D",
    colorForeground: "#14213D",
    colorMutedForeground: "#536078",
    colorDanger: "#b42318",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#14213D",
    colorNeutral: "#14213D",
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: { width: "100%", display: "flex", justifyContent: "center" },
    cardBox: { width: "440px", maxWidth: "100%", background: "#ffffff", borderRadius: "1.25rem", overflow: "hidden" },
    card: { boxShadow: "none", border: "0", background: "transparent" },
    footer: { boxShadow: "none", border: "0", background: "transparent" },
    headerTitle: { color: "#14213D", fontWeight: 800 },
    headerSubtitle: { color: "#536078" },
    socialButtonsBlockButtonText: { color: "#14213D" },
    formFieldLabel: { color: "#14213D", fontWeight: 600 },
    footerActionLink: { color: "#14213D", fontWeight: 700 },
    footerActionText: { color: "#536078" },
    dividerText: { color: "#536078" },
    identityPreviewEditButton: { color: "#14213D" },
    formFieldSuccessText: { color: "#166534" },
    alertText: { color: "#b42318" },
    logoBox: { marginBottom: "1.25rem" },
    logoImage: { width: "180px", height: "auto" },
    socialButtonsBlockButton: { background: "#ffffff", border: "1px solid #d9e1ed" },
    formButtonPrimary: { background: "#14213D", color: "#ffffff", minHeight: "44px" },
    formFieldInput: { background: "#ffffff", color: "#14213D", border: "1px solid #b3c3da", minHeight: "44px" },
    footerAction: { background: "#f0f3f8" },
    dividerLine: { background: "#d9e1ed" },
    alert: { background: "#fff4f2" },
    otpCodeFieldInput: { color: "#14213D", borderColor: "#b3c3da" },
    formFieldRow: { marginBottom: "1rem" },
    main: { gap: "1.25rem" },
  },
};
