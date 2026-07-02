"use client";

/**
 * BoardCanvas — the infinite canvas of result tables.
 *
 * State model:
 *   - `groups` (domain) is the source of truth: one entry per search run/seeded.
 *   - React Flow owns the live node array (`useNodesState`) so drag/pan/zoom stay
 *     fast and never write React state per frame.
 *   - When `groups` or the active strategy change, we re-derive the node set,
 *     PRESERVING the position of any node that already existed (so switching
 *     strategy or adding a search never yanks your laid-out tables around).
 *
 * Node actions (close / duplicate a search) go through board context; the canvas
 * maps them back onto `groups`, and the derive step reconciles the nodes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import type { Fic, SearchParams } from "@/lib/contracts";
import type { SearchResultGroup } from "@/lib/board/types";
import { DEFAULT_STRATEGY_ID, getStrategy } from "@/lib/board/strategies";
import { slotFor } from "@/lib/board/layout";
import { DEMO_SEARCHES } from "@/lib/demo/fixtures";

import { TableNode, type TableFlowNode } from "./TableNode";
import { BoardToolbar } from "./BoardToolbar";
import { SearchDock } from "./SearchDock";
import { BoardActionsContext, type BoardActions } from "./board-context";

const nodeTypes = { table: TableNode };

let groupSeq = 0;
const nextGroupId = () => `g${(++groupSeq).toString(36)}-${Date.now().toString(36)}`;

/** Rebuild the node set from groups × strategy, keeping existing positions. */
function deriveNodes(
  groups: SearchResultGroup[],
  strategyId: string,
  prev: TableFlowNode[]
): TableFlowNode[] {
  const strategy = getStrategy(strategyId);
  const prevById = new Map(prev.map((n) => [n.id, n]));
  const out: TableFlowNode[] = [];
  groups.forEach((group, gi) => {
    strategy.split(group).forEach((part, pi) => {
      const id = `${group.id}::${part.partKey}`;
      const existing = prevById.get(id);
      out.push({
        id,
        type: "table",
        position: existing?.position ?? slotFor(gi, pi),
        dragHandle: ".bnode__grip",
        selected: existing?.selected ?? false,
        data: {
          groupId: group.id,
          title: part.title,
          subtitle: part.subtitle,
          badge: part.badge,
          fics: part.fics,
          origin: group.origin,
        },
      });
    });
  });
  return out;
}

export function BoardCanvas() {
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [strategyId, setStrategyId] = useState<string>(DEFAULT_STRATEGY_ID);
  const [seeded, setSeeded] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);
  const { fitView } = useReactFlow();

  // Re-derive nodes whenever domain/strategy change, preserving live positions.
  useEffect(() => {
    setNodes((prev) => deriveNodes(groups, strategyId, prev));
  }, [groups, strategyId, setNodes]);

  // Fit the view only when the SET of nodes changes (add/remove/strategy), never
  // on drag — otherwise the canvas would snap back mid-drag.
  const idKey = nodes.map((n) => n.id).join("|");
  const prevIdKey = useRef("");
  useEffect(() => {
    if (idKey === prevIdKey.current) return;
    prevIdKey.current = idKey;
    if (!idKey) return;
    const raf = requestAnimationFrame(() =>
      fitView({ padding: 0.2, duration: 400, maxZoom: 1 })
    );
    return () => cancelAnimationFrame(raf);
  }, [idKey, fitView]);

  const addGroup = useCallback((group: SearchResultGroup) => {
    setGroups((prev) => [...prev, group]);
  }, []);

  const addLive = useCallback(
    (params: SearchParams, fics: Fic[], elapsedMs: number | null) => {
      addGroup({ id: nextGroupId(), params, fics, elapsedMs, origin: "live" });
    },
    [addGroup]
  );

  const seed = useCallback(() => {
    setGroups((prev) => [
      ...prev,
      ...DEMO_SEARCHES.map((d) => ({
        id: nextGroupId(),
        params: d.params,
        fics: d.fics,
        origin: "seed" as const,
      })),
    ]);
    setSeeded(true);
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const duplicateGroup = useCallback((groupId: string) => {
    setGroups((prev) => {
      const src = prev.find((g) => g.id === groupId);
      if (!src) return prev;
      return [...prev, { ...src, id: nextGroupId() }];
    });
  }, []);

  const clear = useCallback(() => {
    setGroups([]);
    setSeeded(false);
  }, []);

  // Seed the board once so the first paint shows real tables to interact with.
  const didSeed = useRef(false);
  useEffect(() => {
    if (didSeed.current) return;
    didSeed.current = true;
    seed();
  }, [seed]);

  const actions: BoardActions = useMemo(
    () => ({ removeGroup, duplicateGroup }),
    [removeGroup, duplicateGroup]
  );

  return (
    <div className="board-root">
      <BoardActionsContext value={actions}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          colorMode="light"
          fitView
          minZoom={0.2}
          maxZoom={1.75}
          nodesConnectable={false}
          elevateNodesOnSelect
          panOnScroll
          selectionOnDrag
          panOnDrag={[1, 2]}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1.4} />
          <MiniMap pannable zoomable nodeStrokeWidth={2} ariaLabel="Board minimap" />
          <Controls showInteractive={false} />

          <Panel position="top-left">
            <BoardToolbar
              strategyId={strategyId}
              onStrategyChange={setStrategyId}
              groupCount={groups.length}
              nodeCount={nodes.length}
              onFit={() => fitView({ padding: 0.2, duration: 400, maxZoom: 1 })}
              onClear={clear}
            />
          </Panel>

          <Panel position="bottom-center">
            <SearchDock onAddLive={addLive} onSeed={seed} seeded={seeded} />
          </Panel>
        </ReactFlow>
      </BoardActionsContext>
    </div>
  );
}
