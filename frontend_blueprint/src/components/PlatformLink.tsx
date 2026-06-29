/**
 * PlatformLink — an outbound "open on the source site" button. Pairs the site's
 * favicon with an external-link arrow (↗) inside a bordered button so it clearly
 * reads as "this leaves the app and opens the original site", not decoration.
 */
import type { Platform } from "@/lib/contracts";
import { PlatformLogo, platformName } from "@/components/PlatformLogo";

export function PlatformLink({
  url,
  platform,
  size = 18,
}: {
  url: string;
  platform: Platform;
  size?: number;
}) {
  const name = platformName(platform);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="platform-link"
      title={`Open on ${name} (opens in a new tab)`}
      aria-label={`Open on ${name} (opens in a new tab)`}
    >
      <PlatformLogo platform={platform} size={size} />
      <span className="platform-link-ext" aria-hidden>
        ↗
      </span>
    </a>
  );
}
