import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The backend base URL is read ONLY on the server (BACKEND_URL). It is never
  // exposed to the browser — every backend call goes through a server route in
  // src/app/api/*. Do not add a NEXT_PUBLIC_ variant of it.
};

export default nextConfig;
