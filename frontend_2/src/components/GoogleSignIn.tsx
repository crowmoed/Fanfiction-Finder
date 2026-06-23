"use client";

/**
 * GoogleSignIn — renders the Google Identity Services button and exchanges the
 * returned ID token for a session via useAuth().loginWithIdToken.
 *
 * Skeleton-friendly: if NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset (typical in local
 * dev without OAuth configured), it renders a clear notice instead of a broken
 * button — so the page is still demonstrable. The demo harness signs in without
 * Google entirely.
 */

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/client/auth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Minimal typing for the GIS global we touch.
interface GoogleId {
  accounts: {
    id: {
      initialize: (cfg: {
        client_id: string;
        callback: (resp: { credential?: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleId;
  }
}

export function GoogleSignIn() {
  const { loginWithIdToken } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp) => {
          if (!resp.credential) return;
          try {
            await loginWithIdToken(resp.credential);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Sign-in failed");
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
      });
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [loginWithIdToken]);

  if (!CLIENT_ID) {
    return (
      <div className="skeleton-banner">
        Google sign-in is not configured (set NEXT_PUBLIC_GOOGLE_CLIENT_ID). The
        demo harness can simulate a signed-in session without Google.
      </div>
    );
  }

  return (
    <div className="stack">
      <div ref={ref} />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
