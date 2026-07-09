"use client";

/**
 * Toast — a minimal transient-feedback layer.
 *
 * Actions like copy-link and export previously gave zero confirmation (copy even
 * caught its own failure and stayed silent). This provides a tiny shared toaster:
 * `useToast()` returns a `toast(message, tone?, action?)` function, and a polite
 * live region announces it. `useToast()` is a no-op when no provider is mounted
 * (e.g. pure presentational demos), so callers never need to guard.
 *
 * Each tone gets a leading icon (F079/F202) since a background-color swap alone
 * isn't a sufficient distinguishing cue. Exit mirrors the entrance (F059/F203):
 * a toast is marked `.is-leaving` for one beat before it's actually removed from
 * state, so `toast-out` gets to play instead of an instant unmount — skipped
 * under prefers-reduced-motion, where the removal is immediate.
 *
 * A toast may carry ONE inline action (REDESIGN-SPEC §1.7), e.g. Saved's
 * Unfollow → Undo. It renders as a keyboard-reachable button, and the
 * auto-dismiss countdown pauses while the toast is hovered or focused so the
 * user isn't racing the timer to click Undo.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/Icon";

type ToastTone = "success" | "error" | "info";
interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

type ToastFn = (
  message: string,
  tone?: ToastTone,
  action?: ToastAction
) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const DISMISS_MS = 3200;
const LEAVE_MS = 160; // matches .toast.is-leaving / toast-out in globals.css

const TONE_ICON: Record<ToastTone, IconName> = {
  success: "check",
  error: "alert",
  info: "info",
};

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((message, tone = "info", action) => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, message, tone, action }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => (
          <ToastRow key={t.id} item={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * One toast owns its own dismiss countdown so hover/focus can pause it. The
 * countdown restarts from full whenever the pointer/focus leaves.
 */
function ToastRow({
  item,
  onDone,
}: {
  item: ToastItem;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Play the exit (toast-out), then remove. Shared by the auto-dismiss timer AND
  // the inline action button below, so dismissing via "Undo" mirrors the
  // entrance instead of hard-cutting (DESIGN.md's own example for "exits mirror
  // entrances"). Reduced motion removes immediately.
  const startLeave = useCallback(() => {
    if (reducedMotion()) {
      doneRef.current();
      return;
    }
    setLeaving(true);
    window.setTimeout(() => doneRef.current(), LEAVE_MS);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(startLeave, DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [paused, startLeave]);

  return (
    <div
      className={`toast${leaving ? " is-leaving" : ""}`}
      data-tone={item.tone}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* The tone icon settles a beat after the toast lands. */}
      <span className="pop-in" style={{ display: "inline-flex", animationDelay: "40ms" }}>
        <Icon name={TONE_ICON[item.tone]} size={15} />
      </span>
      <span className="toast-body">{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            item.action?.onClick();
            startLeave();
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}
