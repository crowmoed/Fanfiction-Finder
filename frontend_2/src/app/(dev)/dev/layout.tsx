import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FicFinder — Dev",
  robots: { index: false, follow: false }, // keep the dev surface out of search results
};

// The dev/demo surface — visually and structurally separate from the real app.
// A loud banner so it's never mistaken for production.
export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dev-shell">
      <header className="dev-bar">
        <strong>DEV / DEMOS</strong>
        <nav className="row" style={{ gap: "1rem" }}>
          <Link href="/dev">Demo index</Link>
          <Link href="/">← Back to app</Link>
        </nav>
      </header>
      <main className="dev-main">{children}</main>
    </div>
  );
}
