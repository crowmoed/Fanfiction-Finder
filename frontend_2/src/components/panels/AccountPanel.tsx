"use client";

import Link from "next/link";

import { useAuth } from "@/lib/client/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { Icon } from "@/components/Icon";
import "./account-panel.css";

/** A small CTA to the sponsor-a-fandom flow — the app's only paid surface. */
function SponsorLink() {
  return (
    <Link href="/sponsor" className="account-sponsor-link">
      <Icon name="sparkle" size={16} />
      <span>
        Want a fandom that isn&apos;t here? <strong>Sponsor it →</strong>
      </span>
    </Link>
  );
}

/** Account panel (shown on the Account tab of Settings). */
export function AccountPanel() {
  const { status, user, signOut, refresh } = useAuth();

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
        <p className="muted" style={{ margin: 0 }}>
          Search is free and open — signing in just syncs your saved work. It&apos;s optional.
        </p>
        <GoogleSignIn />
        <SponsorLink />
      </div>
    );
  }

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <p className="settings-section-label">Account</p>
      <div className="card stack">
        <div className="row" style={{ gap: "0.6rem" }}>
          <span className="sidebar-avatar account-avatar" aria-hidden>
            {initial}
          </span>
          <strong>{user?.email}</strong>
        </div>
      </div>

      <SponsorLink />

      <div className="row">
        <button onClick={() => void refresh()}>Refresh</button>
        <span className="spacer" />
        <button className="btn-danger-ghost" onClick={signOut}>
          <Icon name="sign-out" size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
}
