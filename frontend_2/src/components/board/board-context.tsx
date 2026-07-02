"use client";

/**
 * board-context — group-level actions a table node needs to reach (close the
 * search it belongs to, duplicate it). The canvas owns the state; nodes stay
 * presentational and pull these off context instead of threading callbacks
 * through React Flow's `data`. React 19 `use()` reads the context.
 */
import { createContext, use } from "react";

export interface BoardActions {
  removeGroup: (groupId: string) => void;
  duplicateGroup: (groupId: string) => void;
}

export const BoardActionsContext = createContext<BoardActions | null>(null);

export function useBoardActions(): BoardActions {
  const ctx = use(BoardActionsContext);
  if (!ctx) {
    throw new Error("useBoardActions must be used within <BoardCanvas>");
  }
  return ctx;
}
