/**
 * Skeleton — a single shimmering placeholder block. Compose these into
 * content-shaped loaders (see ResultsSkeleton, FicDetailSkeleton). Width/height
 * are inline so callers size each line; everything else is the .skeleton class.
 *
 * Accessible: marked aria-hidden (it's decorative); the surrounding container
 * should carry aria-busy and a visually-hidden "Loading" label where relevant.
 */
import type { CSSProperties } from "react";

export function Skeleton({
  width = "100%",
  height = "1em",
  radius,
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      aria-hidden
      style={{
        width,
        height,
        ...(radius !== undefined ? { borderRadius: radius } : null),
        ...style,
      }}
    />
  );
}
