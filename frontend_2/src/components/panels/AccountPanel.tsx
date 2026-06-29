"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";

/**
 * Only follow a billing redirect to Stripe's own https domains. The URL comes
 * from our backend, but validating it here is cheap open-redirect defense — a
 * compromised/buggy upstream can't bounce the user to an arbitrary site.
 */
function isStripeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      (u.hostname === "stripe.com" || u.hostname.endsWith(".stripe.com"))
    );
  } catch {
    return false;
  }
}

/** Account panel (shown in the Account modal). */
export function AccountPanel() {
  const { status, user, signOut, refresh } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = async (label: string, fn: () => Promise<{ url: string }>) => {
    setBusy(label);
    setError(null);
    try {
      const { url } = await fn();
      if (!isStripeUrl(url)) {
        setError("Got an unexpected billing redirect. Please try again.");
        setBusy(null);
        return;
      }
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
      setBusy(null);
    }
  };

  if (status === "loading") {
    return <p className="muted">Loading account…</p>;
  }

  if (status === "anonymous") {
    return (
      <div className="stack" style={{ gap: "1rem" }}>
        <p className="muted" style={{ margin: 0 }}>Sign in to track usage and upgrade.</p>
        <GoogleSignIn />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>{user?.email}</strong>
          <span className="tag">{user?.tier}</span>
        </div>
        <span className="muted">
          Searches used this week: {user?.searches_used ?? 0}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="row">
        {user?.tier !== "paid" && (
          <button disabled={busy !== null} onClick={() => redirectTo("checkout", api.checkout)}>
            {busy === "checkout" ? "Redirecting…" : "Become a patron"}
          </button>
        )}
        {user?.stripe_customer_id && (
          <button disabled={busy !== null} onClick={() => redirectTo("portal", api.billingPortal)}>
            {busy === "portal" ? "Redirecting…" : "Manage billing"}
          </button>
        )}
        <button disabled={busy !== null} onClick={() => void refresh()}>
          Refresh
        </button>
        <span className="spacer" />
        <button onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}
