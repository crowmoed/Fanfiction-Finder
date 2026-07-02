"use client";

/**
 * AccountButton — the account control pinned at the bottom of the rail. Shows the
 * signed-in email (or "Account") and opens a menu: Settings always, Sign out when
 * authenticated. Settings stays a modal (owned by AppShell); this just triggers
 * it. Anonymous users get Settings → the Account tab, where sign-in lives.
 */
import { useAuth } from "@/lib/client/auth";
import { Menu, MenuItem, MenuSeparator } from "./Menu";

export function AccountButton({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { status, user, signOut } = useAuth();
  const authed = status === "authenticated" && !!user;

  const label =
    authed && user?.email
      ? user.email
      : status === "loading"
        ? "Loading…"
        : "Account";
  const initial = authed ? (user?.email?.[0]?.toUpperCase() ?? "A") : "?";

  return (
    <Menu
      label="Account menu"
      placement="top-start"
      triggerClassName="sidebar-account"
      trigger={
        <>
          <span className="sidebar-avatar" aria-hidden>
            {initial}
          </span>
          <span className="sidebar-label truncate">{label}</span>
          <span className="sidebar-account-caret sidebar-label" aria-hidden>
            ⌃
          </span>
        </>
      }
    >
      <MenuItem onSelect={onOpenSettings}>Settings</MenuItem>
      {authed && (
        <>
          <MenuSeparator />
          <MenuItem danger onSelect={signOut}>
            Sign out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
