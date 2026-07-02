"use client";

/**
 * SidebarRow — one recent-search row: a link to that search's results plus a
 * kebab menu (Open / Pin / Copy link / Remove). Pinned rows show a ★ marker. The
 * kebab stays hidden until the row is hovered or focused (or its menu is open),
 * so the list reads calm but every action is reachable by keyboard and touch.
 */
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { removeHistory, type HistoryEntry } from "@/lib/client/history";
import { pinKey, togglePin } from "@/lib/client/sidebarPins";
import { Menu, MenuItem, MenuSeparator } from "./Menu";

export function SidebarRow({
  entry,
  href,
  active,
  pinned,
}: {
  entry: HistoryEntry;
  href: string;
  active: boolean;
  pinned: boolean;
}) {
  const router = useRouter();
  const rowRef = useRef<HTMLLIElement>(null);
  const key = pinKey(entry.q, entry.fandom, entry.strict);

  const copyLink = async () => {
    try {
      const url = new URL(href, window.location.origin).toString();
      await navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard unavailable/blocked — nothing to recover, stay silent */
    }
  };

  // Removing a row unmounts its own kebab, so hand keyboard focus to a neighbour
  // (rows are keyed by id, so sibling DOM nodes survive the re-render) instead of
  // dropping it to <body>.
  const remove = () => {
    const li = rowRef.current;
    const neighbour = (li?.nextElementSibling ??
      li?.previousElementSibling) as HTMLElement | null;
    const nextFocus = neighbour?.querySelector<HTMLElement>(".sidebar-row-kebab");
    removeHistory(entry.id);
    if (nextFocus) requestAnimationFrame(() => nextFocus.focus());
  };

  return (
    <li className="sidebar-row" ref={rowRef}>
      <Link
        href={href}
        className="sidebar-search-item"
        title={`${entry.q} · ${entry.fandom}${pinned ? " · pinned" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {pinned && (
          <span className="sidebar-row-pin" aria-hidden>
            ★
          </span>
        )}
        <span className="sidebar-label truncate">{entry.q}</span>
      </Link>
      <Menu
        label={`Actions for search: ${entry.q}`}
        placement="bottom-end"
        triggerClassName="sidebar-row-kebab"
        trigger={<span aria-hidden>⋯</span>}
      >
        <MenuItem onSelect={() => router.push(href)}>Open</MenuItem>
        <MenuItem onSelect={() => togglePin(key)}>
          {pinned ? "Unpin" : "Pin"}
        </MenuItem>
        <MenuItem onSelect={copyLink}>Copy link</MenuItem>
        <MenuSeparator />
        <MenuItem danger onSelect={remove}>
          Remove
        </MenuItem>
      </Menu>
    </li>
  );
}
