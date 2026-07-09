"use client";

import { useState } from "react";

import { api, ApiError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth";
import { clearTokenIfUnauthorized } from "@/lib/client/token";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { Icon } from "@/components/Icon";
import "./account-panel.css";

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

/** Account panel (shown on the Account tab of Settings). */
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
      // A rejected token here means the session died — drop it so the UI flips
      // to the signed-out prompt instead of showing a stale account.
      if (e instanceof ApiError) clearTokenIfUnauthorized(e.status);
      setError(e instanceof ApiError ? e.message : "Something went wrong");
      setBusy(null);
    }
  };

  if (status === "loading") {
    return <p className="muted">Loading account…</p>;
  }

  if (status === "unreachable") {
    return (
      <div className="stack" style={{ gap: "1rem" }}>
        <div className="alert" data-tone="warn">
          <Icon name="alert" size={18} />
          <div>
            <p className="alert-title">Couldn&apos;t verify your account</p>
            <p>The server was unreachable. Your session may still be valid.</p>
          </div>
        </div>
        <div>
          <button onClick={() => void refresh()}>Retry</button>
        </div>
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <div className="stack" style={{ gap: "1rem" }}>
        <p className="muted" style={{ margin: 0 }}>Sign in to track usage and upgrade.</p>
        <GoogleSignIn />
      </div>
    );
  }

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();
  const tier = user?.tier ?? "free";

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <p className="settings-section-label">Account</p>
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row" style={{ gap: "0.6rem" }}>
            <span className="sidebar-avatar account-avatar" aria-hidden>
              {initial}
            </span>
            <strong>{user?.email}</strong>
          </div>
          <span className="plan-chip" data-tier={tier}>
            {tier}
          </span>
        </div>
        <span className="muted">
          Searches used this week: {user?.searches_used ?? 0}
        </span>
      </div>

      {error && (
        <div className="alert" data-tone="danger">
          <Icon name="alert" size={18} />
          <p>{error}</p>
        </div>
      )}

      {(user?.tier !== "paid" || user?.stripe_customer_id) && (
        <>
          <p className="settings-section-label">Billing</p>
          <div className="row">
            {user?.tier !== "paid" && (
              <button
                className="btn-primary"
                disabled={busy !== null}
                onClick={() => redirectTo("checkout", api.checkout)}
              >
                {busy === "checkout" ? (
                  <>
                    <Icon name="spinner" size={13} />
                    Redirecting…
                  </>
                ) : (
                  "Become a patron"
                )}
              </button>
            )}
            {user?.stripe_customer_id && (
              <button disabled={busy !== null} onClick={() => redirectTo("portal", api.billingPortal)}>
                {busy === "portal" ? (
                  <>
                    <Icon name="spinner" size={13} />
                    Redirecting…
                  </>
                ) : (
                  "Manage billing"
                )}
              </button>
            )}
          </div>
        </>
      )}

      <div className="row">
        <button disabled={busy !== null} onClick={() => void refresh()}>
          Refresh
        </button>
        <span className="spacer" />
        <button className="btn-danger-ghost" disabled={busy !== null} onClick={signOut}>
          <Icon name="sign-out" size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}
