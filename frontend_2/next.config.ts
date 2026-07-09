import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy — defense-in-depth, scoped to what this app actually
 * loads:
 *   - script-src: self + Google Identity Services (the GIS client script). In
 *     dev, Next's HMR/runtime needs 'unsafe-eval'.
 *   - frame-src: accounts.google.com renders the Sign-in button + One-Tap in an
 *     iframe.
 *   - connect-src: self (every backend call is proxied through our same-origin
 *     /api/* routes — the browser never talks to BACKEND_URL directly) + Google
 *     auth endpoints used by GIS.
 *   - img-src: self + data: (inline SVG lettermarks) + Google's favicon service
 *     and gstatic (platform badge favicons, GIS button assets).
 *   - style-src: 'unsafe-inline' — the skeleton uses inline style={{}} pervasively
 *     and GIS injects inline styles; tighten when the design layer lands.
 */
function contentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "https://accounts.google.com",
    isDev ? "'unsafe-eval'" : "",
    // Next injects small inline bootstrap scripts; allow inline scripts. (A nonce
    // strategy can replace this once the design/build pass settles.)
    "'unsafe-inline'",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://www.google.com https://*.gstatic.com https://accounts.google.com",
    "font-src 'self' data:",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev build-activity indicator: bottom-right, out of the way of the account
  // control that sits bottom-left in the sidebar (REDESIGN-SPEC §6.5).
  devIndicators: {
    position: "bottom-right",
  },
  // The backend base URL is read ONLY on the server (BACKEND_URL). It is never
  // exposed to the browser — every backend call goes through a server route in
  // src/app/api/*. Do not add a NEXT_PUBLIC_ variant of it.
  async headers() {
    return [
      {
        // Apply the security headers to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
