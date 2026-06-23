import type { Metadata } from "next";

import "./globals.css";
import { AuthProvider } from "@/lib/client/auth";

export const metadata: Metadata = {
  title: "FicFinder",
  description: "Semantic search for fanfiction across AO3, FFN, and Wattpad.",
};

// Root layout is intentionally chrome-free: each route group provides its own
// shell. (app) renders the sidebar AppShell; (dev) renders a minimal dev header.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
