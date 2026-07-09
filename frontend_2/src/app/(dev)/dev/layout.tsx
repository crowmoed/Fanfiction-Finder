import Link from "next/link";
import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import "./dev.css";

export const metadata: Metadata = {
  // `absolute` opts out of the root title template (no " · Ficwell" suffix).
  title: { absolute: "Ficwell Dev" },
  robots: { index: false, follow: false }, // keep the dev surface out of search results
};

// The dev/demo surface — visually and structurally separate from the real app.
// A loud banner so it's never mistaken for production.
export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate the whole /dev/* tree in production unless demos are explicitly enabled.
  // Server-side (this layout is a Server Component) so the routes truly 404 —
  // /dev/seed can inject a fake user and clobber real localStorage, so hiding the
  // sidebar link (NEXT_PUBLIC_ENABLE_DEMOS) isn't enough on its own. In local dev
  // the demos always work.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ENABLE_DEMOS !== "1"
  ) {
    notFound();
  }

  return (
    <div className="dev-shell">
      <header className="dev-bar">
        <strong>DEV / DEMOS</strong>
        <nav className="dev-nav">
          <Link href="/dev">Demo index</Link>
          <Link href="/" className="row" style={{ gap: "0.3rem" }}>
            <Icon name="chevron-left" size={14} />
            Back to app
          </Link>
        </nav>
      </header>
      <main className="dev-main">{children}</main>
    </div>
  );
}
