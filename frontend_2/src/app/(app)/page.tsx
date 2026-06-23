"use client";

import { useRouter } from "next/navigation";

import type { SearchParams } from "@/lib/contracts";
import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  const router = useRouter();

  const go = (params: SearchParams) => {
    const qs = new URLSearchParams({
      q: params.q,
      fandom: params.fandom,
      strict: String(params.strict ?? false),
    });
    router.push(`/results?${qs.toString()}`);
  };

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="stack" style={{ gap: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>FicFinder</h1>
        <p className="muted" style={{ margin: 0 }}>
          Semantic search for fanfiction across AO3, FFN, and Wattpad. Describe what
          you want — not just keywords.
        </p>
      </header>

      <SearchForm onSubmit={go} />
    </div>
  );
}
