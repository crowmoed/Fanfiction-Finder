"use client";

/**
 * PlatformLogo — the source site's real favicon, with an original lettermark
 * tile as the fallback.
 *
 * The real mark is each site's own favicon, fetched by domain via Google's
 * favicon service (the site serves the artwork; we don't reproduce it). If the
 * request fails — offline, blocked, 404 — we fall back to an original
 * brand-colored lettermark SVG so a badge always renders. Plain <img> (not
 * next/image) so no image-host config is needed.
 *
 * Brand colors (fallback tile): AO3 maroon #990000 · Wattpad orange #FF6122 ·
 * FFN navy #2b3a67. These literals are DELIBERATE: they're the external
 * platforms' own brand identities (data baked into an image, like a favicon),
 * not Ficwell theme paint — they must never swap with a theme, so they stay
 * out of the token system (see DESIGN.md · Color).
 */
import { useState } from "react";

import type { Platform } from "@/lib/contracts";

interface Brand {
  name: string;
  /** Domain whose favicon represents the platform. */
  domain: string;
  /** Fallback lettermark tile. */
  bg: string;
  fg: string;
  text: string;
  fontSize: number;
}

const BRANDS: Record<string, Brand> = {
  AO3: {
    name: "Archive of Our Own",
    domain: "archiveofourown.org",
    bg: "#990000",
    fg: "#ffffff",
    text: "AO3",
    fontSize: 8.5,
  },
  FFN: {
    name: "FanFiction.net",
    domain: "fanfiction.net",
    bg: "#2b3a67",
    fg: "#ffffff",
    text: "ff",
    fontSize: 12,
  },
  Wattpad: {
    name: "Wattpad",
    domain: "wattpad.com",
    bg: "#ff6122",
    fg: "#ffffff",
    text: "W",
    fontSize: 13,
  },
};

const FALLBACK: Brand = {
  name: "source",
  domain: "",
  bg: "#444444",
  fg: "#ffffff",
  text: "↗",
  fontSize: 12,
};

/** Original lettermark fallback tile (used when the favicon can't load). */
function LetterTile({
  brand,
  size,
  decorative,
}: {
  brand: Brand;
  size: number;
  decorative: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : brand.name}
      aria-hidden={decorative || undefined}
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect x="0" y="0" width="24" height="24" rx="4" fill={brand.bg} />
      <text
        x="12"
        y="12"
        fill={brand.fg}
        fontSize={brand.fontSize}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="-0.3"
      >
        {brand.text}
      </text>
    </svg>
  );
}

export function PlatformLogo({
  platform,
  size = 20,
  decorative = false,
}: {
  platform: Platform;
  size?: number;
  /** Mark the icon decorative (empty alt / aria-hidden) when adjacent text
   *  already names the platform, so screen readers don't announce it twice. */
  decorative?: boolean;
}) {
  const brand = BRANDS[platform] ?? FALLBACK;
  const [failed, setFailed] = useState(false);

  if (failed || !brand.domain) {
    return <LetterTile brand={brand} size={size} decorative={decorative} />;
  }

  // Google's favicon service returns the site's real favicon by domain.
  const src = `https://www.google.com/s2/favicons?domain=${brand.domain}&sz=64`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external favicon, intentionally not next/image (no host config)
    <img
      src={src}
      alt={decorative ? "" : brand.name}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ display: "block", flexShrink: 0, borderRadius: "var(--r-xs)" }}
    />
  );
}

/** Display name for a platform, for tooltips/aria. */
export function platformName(platform: Platform): string {
  return (BRANDS[platform] ?? FALLBACK).name;
}
