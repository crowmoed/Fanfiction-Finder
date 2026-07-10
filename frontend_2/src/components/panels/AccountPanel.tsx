"use client";

import { useAuth } from "@/lib/client/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { Icon } from "@/components/Icon";
import "./account-panel.css";

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
