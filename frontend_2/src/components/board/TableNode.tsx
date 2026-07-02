"use client";

/**
 * TableNode — the custom React Flow node: one result table on the board.
 *
 * The header (`.bnode__grip`) is the drag handle, so the table body stays fully
 * interactive (sort, scroll, select text). Header buttons carry `nodrag` so they
 * don't start a drag. Group-level actions (duplicate / close the search) come off
 * board context; collapse is local, per node.
 *
 * Typed against the base `NodeProps` (data cast to `TableNodeData`) on purpose —
 * it keeps `nodeTypes` assignable without React Flow's generic-variance friction.
 */
import { memo, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";

import type { TableNodeData } from "@/lib/board/types";
import { NodeTable } from "./NodeTable";
import { useBoardActions } from "./board-context";

/** The concrete React Flow node type this board uses. */
export type TableFlowNode = Node<TableNodeData, "table">;

function TableNodeImpl(props: NodeProps) {
  const data = props.data as TableNodeData;
  const selected = props.selected ?? false;
  const { removeGroup, duplicateGroup } = useBoardActions();
  const [collapsed, setCollapsed] = useState(false);
  const badge = data.badge;

  return (
    <div className={`bnode${selected ? " is-selected" : ""}`} data-tone={badge?.tone ?? "all"}>
      <header className="bnode__grip">
        <span className="bnode__dots" aria-hidden>
          ⠿
        </span>
        <div className="bnode__titles">
          <div className="bnode__title">
            {badge && (
              <span className="bnode__badge" data-tone={badge.tone}>
                {badge.label}
              </span>
            )}
            <span className="bnode__name" title={data.title}>
              {data.title}
            </span>
          </div>
          {data.subtitle && (
            <div className="bnode__sub" title={data.subtitle}>
              {data.subtitle}
            </div>
          )}
        </div>
        <div className="bnode__actions">
          <button
            type="button"
            className="bnode__btn nodrag"
            aria-label={collapsed ? "Expand table" : "Collapse table"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <button
            type="button"
            className="bnode__btn nodrag"
            aria-label="Duplicate this search"
            title="Duplicate this search"
            onClick={() => duplicateGroup(data.groupId)}
          >
            ⧉
          </button>
          <button
            type="button"
            className="bnode__btn nodrag"
            aria-label="Close this search"
            title="Close this search"
            onClick={() => removeGroup(data.groupId)}
          >
            ✕
          </button>
        </div>
      </header>
      {!collapsed && <NodeTable fics={data.fics} />}
    </div>
  );
}

export const TableNode = memo(TableNodeImpl);
