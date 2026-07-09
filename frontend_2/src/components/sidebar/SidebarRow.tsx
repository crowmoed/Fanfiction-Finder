"use client";

/**
 * SidebarRow — one recent-search row: a link to that search's results plus a
 * kebab menu (Open / Pin / Copy link / Remove). Pinned rows show a pin marker. The
 * kebab stays hidden until the row is hovered or focused (or its menu is open),
 * so the list reads calm but every action is reachable by keyboard and touch.
 */
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { removeHistory, type HistoryEntry } from "@/lib/client/history";
import { pinKey, togglePin } from "@/lib/client/sidebarPins";
import { useLeave } from "@/lib/client/motion";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icon";
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
  const toast = useToast();
  const key = pinKey(entry.q, entry.fandom, entry.strict);

  const copyLink = async () => {
    try {
      const url = new URL(href, window.location.origin).toString();
      await navigator.clipboard?.writeText(url);
      toast("Link copied to clipboard.");
    } catch {
      toast("Couldn't copy the link.", "error");
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
  // Play a brief exit before the row leaves the store (reduced motion removes
  // instantly). Mirrors History/Saved and the Toast/Modal idiom.
  const { leaving, startLeave } = useLeave(remove);

  return (
    <li
      className={`sidebar-row${leaving ? " sidebar-row--leaving" : ""}`}
      ref={rowRef}
    >
      <Link
        href={href}
        className="sidebar-search-item"
        title={`${entry.q} · ${entry.fandom}${pinned ? " · pinned" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {pinned && (
          <span className="sidebar-row-pin" aria-hidden>
            <Icon name="pin" size={11} />
          </span>
        )}
        <span className="sidebar-label truncate">{entry.q}</span>
      </Link>
      <Menu
        label={`Actions for search: ${entry.q}`}
        placement="bottom-end"
        triggerClassName="sidebar-row-kebab"
        trigger={<Icon name="dots" size={14} />}
      >
        <MenuItem onSelect={() => router.push(href)}>
          <Icon name="arrow-right" size={14} /> Open
        </MenuItem>
        <MenuItem onSelect={() => togglePin(key)}>
          <Icon name="pin" size={14} /> {pinned ? "Unpin" : "Pin"}
        </MenuItem>
        <MenuItem onSelect={copyLink}>
          <Icon name="copy" size={14} /> Copy link
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger onSelect={startLeave}>
          <Icon name="trash" size={14} /> Remove
        </MenuItem>
      </Menu>
    </li>
  );
}
