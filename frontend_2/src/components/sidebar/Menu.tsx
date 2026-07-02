"use client";

/**
 * Menu — an accessible, dependency-free dropdown menu built on the native
 * Popover API. The popover renders in the browser's top layer, so it escapes the
 * sidebar's `overflow: hidden` with no z-index juggling and gets light-dismiss
 * (Esc + outside-click) for free. We add the WAI-ARIA menu keyboard model on top:
 * roving focus (Arrow/Home/End), focus the first item on open, close on Tab-out,
 * and return focus to the trigger.
 *
 * Positioning is done by hand (no anchor-positioning dependency) from the
 * trigger's rect: placement decides which corner anchors, a transform aligns the
 * far edge without needing to measure the menu, and a clamp keeps it on-screen.
 */
import { useCallback, useId, useRef, useState, type ReactNode } from "react";

type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

const ITEM_SELECTOR =
  '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';

export function Menu({
  label,
  trigger,
  children,
  placement = "bottom-end",
  triggerClassName,
  menuClassName,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  placement?: Placement;
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Anchor the menu to the trigger. Uses only the trigger's rect + a transform
  // to align the far edge, so it needs no measurement of the menu itself and can
  // run before paint (in beforetoggle) without a flash.
  const place = useCallback(() => {
    const t = triggerRef.current;
    const m = menuRef.current;
    if (!t || !m) return;
    const r = t.getBoundingClientRect();
    const gap = 6;
    const bottom = placement.startsWith("bottom");
    const end = placement.endsWith("end");
    m.style.left = `${Math.round(end ? r.right : r.left)}px`;
    m.style.top = `${Math.round(bottom ? r.bottom + gap : r.top - gap)}px`;
    m.style.transform = `translate(${end ? "-100%" : "0px"}, ${bottom ? "0px" : "-100%"})`;
  }, [placement]);

  // Nudge back on-screen if the placed menu overflows the viewport (e.g. a kebab
  // near the bottom of the recents scroll). Runs once the menu is measurable.
  const clampIntoView = useCallback(() => {
    const m = menuRef.current;
    if (!m) return;
    const rect = m.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    let dy = 0;
    if (rect.right > window.innerWidth - pad) dx = window.innerWidth - pad - rect.right;
    if (rect.left + dx < pad) dx = pad - rect.left;
    if (rect.bottom > window.innerHeight - pad) dy = window.innerHeight - pad - rect.bottom;
    if (rect.top + dy < pad) dy = pad - rect.top;
    if (dx || dy) {
      m.style.left = `${parseFloat(m.style.left || "0") + dx}px`;
      m.style.top = `${parseFloat(m.style.top || "0") + dy}px`;
    }
  }, []);

  const focusItem = useCallback((index: number) => {
    const m = menuRef.current;
    if (!m) return;
    const items = Array.from(m.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
    if (!items.length) return;
    const i = ((index % items.length) + items.length) % items.length;
    items[i]?.focus();
  }, []);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const m = menuRef.current;
    if (!m) return;
    const items = Array.from(m.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
    const current = items.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(items.length - 1);
        break;
      case "Tab":
        // Menus don't hold Tab focus — close and let focus flow on naturally.
        m.hidePopover();
        break;
      default:
        break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Arrow keys open the menu and land on the first item (native click already
    // toggles it, so this only handles the keyboard-open-and-focus affordance).
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      menuRef.current?.showPopover();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={triggerClassName}
        onKeyDown={onTriggerKeyDown}
      >
        {trigger}
      </button>
      <div
        ref={menuRef}
        id={id}
        popover="auto"
        className={menuClassName ? `menu ${menuClassName}` : "menu"}
        data-placement={placement}
        onBeforeToggle={(e: React.ToggleEvent<HTMLDivElement>) => {
          if (e.newState === "open") place();
        }}
        onToggle={(e: React.ToggleEvent<HTMLDivElement>) => {
          const isOpen = e.newState === "open";
          setOpen(isOpen);
          if (isOpen) {
            place();
            clampIntoView();
            requestAnimationFrame(() => focusItem(0));
          } else if (
            document.activeElement === document.body &&
            triggerRef.current?.isConnected
          ) {
            // Item-click closes leave focus on <body>; send it back to the trigger.
            triggerRef.current.focus();
          }
        }}
        onKeyDown={onMenuKeyDown}
      >
        <div className="menu-inner" role="menu" aria-label={label}>
          {children}
        </div>
      </div>
    </>
  );
}

export function MenuItem({
  children,
  onSelect,
  danger,
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      className={danger ? "menu-item menu-item-danger" : "menu-item"}
      onClick={(e) => {
        (e.currentTarget.closest("[popover]") as HTMLElement | null)?.hidePopover();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="menu-sep" role="separator" />;
}
