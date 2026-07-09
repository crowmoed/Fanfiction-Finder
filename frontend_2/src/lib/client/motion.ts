"use client";

/**
 * Shared motion primitives for the "bring it to life" motion pass.
 *
 * These centralise two patterns the design already used ad-hoc so new surfaces
 * don't re-implement them: a reduced-motion check (previously inlined in Toast,
 * Modal, SearchForm, BoardView) and the number count-up + hold-then-remove exit
 * idioms the recon flagged as worth sharing.
 *
 * Everything here honours the design laws: reduced motion always has a calm,
 * instant path, and the animated values are transform/opacity-friendly (a
 * count-up mutates text content, not layout).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** SSR-safe layout effect (avoids the useLayoutEffect-on-server warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Count a number up from `from` to `target` over `duration` (ease-out), but
 * only while `enabled` is true and reduced motion is off. Returns the final
 * value on the server and on the very first client paint (so it hydrates
 * cleanly), then — inside a layout effect, before the browser paints — resets
 * to `from` and animates, so there's no flash of the final value first.
 *
 * Callers gate `enabled` on the same "fresh / earned" flags the stamp uses
 * (e.g. a non-cached result set, an animate-eligible seal), so it never replays
 * on a plain revisit.
 */
export function useCountUp(
  target: number,
  {
    enabled = true,
    duration = 320,
    from = 0,
  }: { enabled?: boolean; duration?: number; from?: number } = {}
): number {
  const [value, setValue] = useState(target);

  useIsoLayoutEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    setValue(from); // committed before paint → no flash of the final value
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);

  return value;
}

/**
 * Toast/Modal's "play an exit, THEN remove" idiom, generalised. `startLeave`
 * flips `leaving` true so the caller can apply an exit class, waits `ms`, then
 * calls `onRemove`. Under reduced motion it removes immediately (no delay,
 * matching Toast.reducedMotion()).
 */
export function useLeave(
  onRemove: () => void,
  ms = 160
): { leaving: boolean; startLeave: () => void } {
  const [leaving, setLeaving] = useState(false);
  const cbRef = useRef(onRemove);
  cbRef.current = onRemove;
  const startedRef = useRef(false);

  const startLeave = useCallback(() => {
    if (startedRef.current) return; // guard double-fire (e.g. rapid clicks)
    startedRef.current = true;
    if (prefersReducedMotion()) {
      cbRef.current();
      return;
    }
    setLeaving(true);
    window.setTimeout(() => cbRef.current(), ms);
  }, [ms]);

  return { leaving, startLeave };
}
