import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";
import { AuthProvider } from "@/lib/client/auth";

/*
 * Three voices (see DESIGN.md / REDESIGN-SPEC §1.1): the tool speaks in
 * Source Sans 3, fiction reads in Source Serif 4, and display headlines are
 * carried by Fraunces (variable — opsz/SOFT/WONK axes exposed so the utility
 * classes in globals.css can dial each headline's optical size and warmth).
 * Fraunces is display-ONLY; it never sets numerals (non-tabular digits).
 */
const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});
const serif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif-loaded",
  display: "swap",
});
const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  // Template so server pages set a short title (e.g. "Search history") and it
  // renders as "Search history · Ficwell"; `default` is used where none is set.
  title: { default: "Ficwell", template: "%s · Ficwell" },
  description: "Semantic search for fanfiction across AO3, FFN, and Wattpad.",
  applicationName: "Ficwell",
};

export const viewport: Viewport = {
  themeColor: "#fbfaf7", // keep in sync with --paper in globals.css
  colorScheme: "light",
};

// Root layout is intentionally chrome-free: each route group provides its own
// shell. (app) renders the sidebar AppShell; (dev) renders a minimal dev header.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${display.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
        {/* Privacy-friendly, cookieless product + performance analytics. Both
            load after hydration and are no-ops until enabled in the Vercel
            project (Analytics → pageviews + custom events; Speed Insights →
            Web Vitals). */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
