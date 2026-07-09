"use client";

/**
 * SliceNode — one draggable table on the board view.
 *
 * A "slice" is one part of the current search: a platform (AO3/FFN/Wattpad), a
 * rewritten-prompt variant, or the whole combined set — decided by the active
 * strategy. The node is just a labelled header (what this slice IS) over the ONE
 * canonical ResultsTable in `compact` mode. There is no per-search "frame" here:
 * the board renders a single search, and the /results page header already names
 * the query.
 *
 * The header (`.bnode__grip`) is the drag handle, so the table body stays fully
 * interactive (sort, scroll, quick-view). Buttons carry `nodrag`.
 */
import { memo, useId, useState } from "react";
import type { Node, NodeProps } from "@xyflow/react";

import type { Fic } from "@/lib/contracts";
import type { NodeBadge } from "@/lib/board/types";
import { ResultsTable } from "@/components/ResultsTable";
import { Icon } from "@/components/Icon";

export interface SliceNodeData {
  title: string;
  detail?: string;
  badge?: NodeBadge;
  fics: Fic[];
  [key: string]: unknown;
}

export type SliceFlowNode = Node<SliceNodeData, "slice">;

function SliceNodeImpl(props: NodeProps) {
  const data = props.data as SliceNodeData;
  const selected = props.selected ?? false;
  const [collapsed, setCollapsed] = useState(false);
  const badge = data.badge;
  const tableId = useId();

  return (
    <div className={`bnode${selected ? " is-selected" : ""}`} data-tone={badge?.tone ?? "all"}>
      <header className="bnode__grip">
        <span className="bnode__dots">
          <Icon name="grip" size={14} />
        </span>
        <div className="bnode__titles">
          {/* A real heading per slice, so AT users can jump slice-to-slice with
              the standard next-heading shortcut instead of reading linearly. */}
          <div className="bnode__title" role="heading" aria-level={3}>
            {badge && (
              <span className="bnode__badge" data-tone={badge.tone}>
                {badge.label}
              </span>
            )}
            <span className="bnode__name" title={data.title}>
              {data.title}
            </span>
          </div>
          {data.detail && (
            <div className="bnode__detail" title={data.detail}>
              {data.detail}
            </div>
          )}
        </div>
        <div className="bnode__actions">
          <button
            type="button"
            className="bnode__btn nodrag"
            aria-label={`${collapsed ? "Expand" : "Collapse"} ${data.title} table`}
            aria-expanded={!collapsed}
            aria-controls={tableId}
            onClick={() => setCollapsed((c) => !c)}
          >
            {/* One chevron that rotates on collapse (board.css keys off
                aria-expanded), instead of swapping icon names. */}
            <Icon name="chevron-down" size={14} />
          </button>
        </div>
      </header>
      {!collapsed && (
        <div id={tableId}>
          <ResultsTable fics={data.fics} compact />
        </div>
      )}
    </div>
  );
}

export const SliceNode = memo(SliceNodeImpl);
