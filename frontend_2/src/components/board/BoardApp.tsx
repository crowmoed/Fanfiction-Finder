"use client";

/**
 * BoardApp — client entry for the board route. Loads React Flow's base styles +
 * the board theme, and provides the React Flow context the canvas hooks need.
 */
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./board.css";

import { BoardCanvas } from "./BoardCanvas";

export function BoardApp() {
  return (
    <ReactFlowProvider>
      <BoardCanvas />
    </ReactFlowProvider>
  );
}
