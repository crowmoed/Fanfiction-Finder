"use client";

/**
 * SidebarItem — one row in the sidebar. Renders a Next <Link> (with automatic
 * active-route detection via aria-current) or a <button>, sharing one icon+label
 * shape so nav links, the CTA, and action buttons stay visually consistent. When
 * the rail is collapsed the label is hidden by CSS; `title` keeps a native
 * tooltip so the icon is still identifiable.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/Icon";

type Variant = "cta" | "link" | "dev" | "util";

const CLASS: Record<Variant, string> = {
  cta: "sidebar-cta",
  link: "sidebar-link",
  dev: "sidebar-dev",
  util: "sidebar-util",
};

/* The quiet registers (foot utilities, dev) run a step smaller than nav so
   their icons don't outweigh their 13px labels. */
const ICON_SIZE: Record<Variant, number> = {
  cta: 16,
  link: 16,
  dev: 14,
  util: 14,
};

export function SidebarItem({
  icon,
  label,
  href,
  onClick,
  variant = "link",
  active,
}: {
  icon: IconName;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  /** Force active state; for links, defaults to `pathname === href`. */
  active?: boolean;
}) {
  const pathname = usePathname();
  const cls = CLASS[variant];

  const body = (
    <>
      <span className="sidebar-ic" aria-hidden>
        <Icon name={icon} size={ICON_SIZE[variant]} />
      </span>
      <span className="sidebar-label truncate">{label}</span>
    </>
  );

  if (href) {
    const isActive = active ?? pathname === href;
    return (
      <Link
        href={href}
        className={cls}
        title={label}
        aria-current={isActive ? "page" : undefined}
      >
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} title={label} onClick={onClick}>
      {body}
    </button>
  );
}
