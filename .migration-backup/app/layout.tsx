import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "ATG Consulting | AI Sales Workflows for Small Businesses and Independent Reps",
    template: "%s | ATG Consulting",
  },
  description:
    "Let AI handle the busywork in your sales process: prospecting, research, outreach drafts, follow-ups, and CRM upkeep. Self-serve, guided, or done for you. Based in Castle Rock, CO.",
  keywords: [
    "AI sales workflow",
    "AI for small business sales",
    "AI for independent sales reps",
    "AI prospecting setup",
    "AI consultant Castle Rock CO",
    "Denver small business AI help",
  ],
  metadataBase: new URL("https://atgconsulting.io"),
  openGraph: {
    type: "website",
    url: "https://atgconsulting.io",
    siteName: "ATG Consulting",
    title: "ATG Consulting | AI Sales Workflows for Small Businesses and Independent Reps",
    description:
      "Let AI handle the busywork in your sales process: prospecting, research, outreach drafts, follow-ups, and CRM upkeep. Self-serve, guided, or done for you. Based in Castle Rock, CO.",
    images: [{ url: "/brand/logos/ATG_logo_A_primary_transparent.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ATG Consulting | AI Sales Workflows for Small Businesses and Independent Reps",
    description:
      "Let AI handle the busywork in your sales process: prospecting, research, outreach drafts, follow-ups, and CRM upkeep. Self-serve, guided, or done for you. Based in Castle Rock, CO.",
    images: ["/brand/logos/ATG_logo_A_primary_transparent.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://atgconsulting.io" },
  icons: {
    icon: "/brand/logos/svg/optionA_icon.svg",
    apple: "/brand/logos/ATG_icon_A_512_transparent.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-screen bg-white font-sans">
        <Nav />
        {children}
      </body>
    </html>
  );
}
