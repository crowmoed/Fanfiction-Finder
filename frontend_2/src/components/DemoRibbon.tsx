"use client";

/**
 * DemoRibbon — a slim, fixed banner shown across the app while demo mode is on,
 * so it's never a mystery that the data is fake. Its Exit button clears the flag
 * + the seeded local stores and reloads to a clean, real app.
 *
 * Rendered inside the app shell; renders nothing when demo mode is off. Reads the
 * flag via useSyncExternalStore (client-only) so toggling it anywhere — this
 * button, /dev/seed, or another tab — updates every mount live.
 */
import { useSyncExternalStore } from "react";

import { exitDemoMode, isDemoMode, subscribeDemoMode } from "@/lib/demo/demoMode";
import { Icon } from "@/components/Icon";
import "./demo-ribbon.css";

export function DemoRibbon() {
  const demoOn = useSyncExternalStore(
    subscribeDemoMode,
    () => isDemoMode(),
    () => false
  );

  if (!demoOn) return null;

  // exitDemoMode hard-reloads, so every module-level cache resets to the real app.
  const exit = () => exitDemoMode("/");

  return (
    <div className="demo-ribbon" role="status">
      <Icon name="info" size={14} />
      <span>
        <strong>Demo mode</strong>: fake data, no backend.
      </span>
      <button
        type="button"
        className="btn-sm demo-ribbon__exit"
        onClick={exit}
      >
        Exit
      </button>
    </div>
  );
}
