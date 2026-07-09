"use client";

/**
 * BoardView — the board as a VIEW of ONE search's results, embedded in /results.
 *
 * Not a separate destination: it takes the current (already facet-filtered)
 * result set + its per-variant lists, slices them with the active strategy
 * (combined / by platform / by rewritten prompt), and lays the slices out as
 * draggable tables on a pan/zoom canvas that fills the /results board
 * workspace (see .results-workspace in globals.css). Every slice renders the
 * ONE canonical <ResultsTable compact/> — the exact same object the Table view
 * uses.
 *
 * Ephemeral by design: positions are derived fresh whenever the slices change
 * (new search, new strategy, changed facets) and are never persisted. Dragging
 * works within the session for side-by-side comparison; navigating away forgets
 * it. That's the whole point — the board is a view, not saved state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  useViewport,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./board.css";

import type { Fic, SearchParams, SearchVariant } from "@/lib/contracts";
import type { NodePart, SearchResultGroup } from "@/lib/board/types";
import { STRATEGIES, DEFAULT_STRATEGY_ID, getStrategy } from "@/lib/board/strategies";
import { SliceNode, type SliceFlowNode } from "./SliceNode";
import { ResultsTable } from "@/components/ResultsTable";
import { Icon } from "@/components/Icon";

const nodeTypes = { slice: SliceNode };

// Slices stack VERTICALLY (like a document, scrolled with the wheel) instead of
// side-by-side: side-by-side forced fitView to zoom way out, which is what made
// table text unreadable. Slice width is 980px via `.bnode { width }` in board.css.
const ROW_GAP = 36;

/** Estimate a slice's rendered height from its content, so the vertical stack
 *  sits at consistent gaps instead of a fixed worst-case pitch (which left
 *  ~400px voids between short tables). Calibrated against the real DOM: header
 *  ≈48px (+~22 with a detail line), table header ≈35px, rows ≈38–44px, and the
 *  compact scroll area caps at 420px (`.rt-scroll--compact`). Slight
 *  over-estimates just widen a gap; they can never overlap. */
function estimatePartH(part: NodePart): number {
  const header = 48 + (part.detail ? 22 : 0);
  if (part.fics.length === 0) return header + 46; // "No results here." row
  return header + Math.min(35 + part.fics.length * 44, 420) + 2;
}

function Canvas({
  fics,
  variants,
  params,
}: {
  fics: Fic[];
  variants: SearchVariant[] | null;
  params: SearchParams;
}) {
  const [strategyId, setStrategyId] = useState<string>(DEFAULT_STRATEGY_ID);
  const [nodes, setNodes, onNodesChange] = useNodesState<SliceFlowNode>([]);
  const { setViewport } = useReactFlow();
  const viewport = useViewport();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasH, setCanvasH] = useState(0);

  // The current search as the board's single group (no persistence, no frames).
  const group = useMemo<SearchResultGroup>(
    () => ({ id: "current", params, fics, variants: variants ?? undefined, origin: "live" }),
    [params, fics, variants]
  );

  const parts = useMemo(() => getStrategy(strategyId).split(group), [strategyId, group]);

  // Re-derive nodes when `parts` changes, but distinguish two kinds of change:
  //   - STRUCTURAL (new search, or a strategy switch): lay slices out fresh in
  //     the default stack and fit the view.
  //   - everything else — a facet toggle that narrows rows within slices, or
  //     even removes/returns a whole bucket: surviving slices keep the user's
  //     in-session drag positions and the current pan/zoom (no relayout, no
  //     refit); an appearing slice just drops into its natural stack slot.
  // Keying "structural" off the part-id SET (the old scheme) made a facet click
  // that emptied one platform's bucket wipe EVERY slice's position — the exact
  // reset this split exists to prevent.
  const prevSearch = useRef<string>("");
  const prevStrategy = useRef<string>("");
  // Structural fits are deferred until ReactFlow reports the first slice's
  // measured dimensions — a bare rAF can fire before the fresh node is measured,
  // making fitView unreliable.
  const pendingFit = useRef<string | null>(null);

  // Slices always stack from (0,0), so a structural fit anchors the stack's
  // TOP to the canvas top and centers it horizontally at up-to-100% zoom.
  // (fitView centered the target node vertically, which parked a dead band of
  // empty canvas above the first table whenever it was shorter than the
  // viewport.) Width matches `.bnode` in board.css.
  const SLICE_W = 980;
  const fitTo = useCallback(
    () => {
      const el = canvasRef.current;
      if (!el || el.clientWidth === 0) return;
      // The viewport move animates; vestibular-safe users get an instant jump.
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = reduce ? 0 : 350;
      const pad = 16;
      const zoom = Math.min(1, (el.clientWidth - pad * 2) / SLICE_W);
      const x = Math.max(pad, (el.clientWidth - SLICE_W * zoom) / 2);
      void setViewport({ x, y: pad, zoom }, { duration });
    },
    [setViewport]
  );

  useEffect(() => {
    const searchSig = `${params.q}::${params.fandom}::${params.strict}`;
    const structural =
      searchSig !== prevSearch.current || strategyId !== prevStrategy.current;
    prevSearch.current = searchSig;
    prevStrategy.current = strategyId;

    setNodes((prev) => {
      const byId = structural ? null : new Map(prev.map((n) => [n.id, n]));
      let stackY = 0;
      return parts.map((part) => {
        const y = stackY;
        stackY += estimatePartH(part) + ROW_GAP;
        const existing = byId?.get(part.partKey);
        // Identical content → return the very same node object, so SliceNode's
        // memo() actually bails out for slices this update didn't touch.
        if (
          existing &&
          existing.data.fics === part.fics &&
          existing.data.title === part.title &&
          existing.data.detail === part.detail &&
          existing.data.badge?.label === part.badge?.label &&
          existing.data.badge?.tone === part.badge?.tone
        ) {
          return existing;
        }
        return {
          id: part.partKey,
          type: "slice" as const,
          position: existing?.position ?? { x: 0, y },
          dragHandle: ".bnode__grip",
          data: { title: part.title, detail: part.detail, badge: part.badge, fics: part.fics },
        };
      });
    });

    if (structural) {
      // Fit the FIRST slice at up-to-100% zoom (not the whole stack — that's
      // what made table text unreadably small). The rest of the stack is a
      // wheel-scroll away via panOnScroll. The fit itself fires from
      // handleNodesChange once the node reports real dimensions; the double-rAF
      // below is the fallback for structural changes that re-use identically
      // sized nodes (no dimension event).
      pendingFit.current = parts[0]?.partKey ?? null;
      if (!pendingFit.current) {
        fitTo();
        return;
      }
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (pendingFit.current) {
            pendingFit.current = null;
            fitTo();
          }
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
  }, [parts, strategyId, params.q, params.fandom, params.strict, setNodes, fitTo]);

  // Forward node changes, and complete a pending structural fit as soon as the
  // target slice has real measured dimensions.
  const handleNodesChange = useCallback<OnNodesChange<SliceFlowNode>>(
    (changes) => {
      onNodesChange(changes);
      const id = pendingFit.current;
      if (id && changes.some((c) => c.type === "dimensions" && c.id === id)) {
        pendingFit.current = null;
        requestAnimationFrame(() => fitTo());
      }
    },
    [onNodesChange, fitTo]
  );

  // Clipping fix (REDESIGN-SPEC §4.2): fitTo() only ran on a STRUCTURAL change
  // (new search / strategy switch). The 980px node itself never resizes, so
  // when the container gets narrower for any OTHER reason — window resize, or
  // the sidebar expanding and eating into .results-workspace's width via
  // --current-sidebar-w, with no new search involved — the zoom computed at
  // the old (wider) width goes stale and the node clips against the now-
  // narrower canvas. A ResizeObserver on the canvas element re-runs the same
  // fit-to-width math whenever clientWidth actually changes, independent of
  // the search lifecycle.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.clientWidth;
    setCanvasH(el.clientHeight);
    const ro = new ResizeObserver(() => {
      setCanvasH(el.clientHeight);
      const w = el.clientWidth;
      if (w === lastWidth || w === 0) return;
      lastWidth = w;
      fitTo();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitTo]);

  const active = getStrategy(strategyId);

  // "N more slices below" (REDESIGN-SPEC §4.4): count nodes whose top edge
  // sits below the canvas's current visible bottom edge, in screen space
  // (react-flow's transform is screen = canvasXY * zoom + viewport). Reruns
  // on every pan/zoom (useViewport) and on resize (canvasH), so it always
  // reflects what's actually on/off screen rather than a fixed "is this the
  // last slice" count.
  const overflowBelow = useMemo(() => {
    if (canvasH === 0 || nodes.length < 2) return 0;
    return nodes.filter((n) => n.position.y * viewport.zoom + viewport.y >= canvasH).length;
  }, [nodes, viewport, canvasH]);

  // Smooth-pans so the next off-screen slice's top edge lands just under the
  // canvas's top padding — the same anchor fitTo() uses for the first slice.
  const panToNextSlice = useCallback(() => {
    const target = nodes
      .filter((n) => n.position.y * viewport.zoom + viewport.y >= canvasH)
      .sort((a, b) => a.position.y - b.position.y)[0];
    if (!target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad = 16;
    void setViewport(
      { x: viewport.x, y: pad - target.position.y * viewport.zoom, zoom: viewport.zoom },
      { duration: reduce ? 0 : 350 }
    );
  }, [nodes, viewport, canvasH, setViewport]);

  // REDESIGN-SPEC §4.3: a single part means there's nothing to pan/zoom/
  // compare, so the react-flow canvas is pure overhead — render the one table
  // in normal page flow. Special case within that: if the lone part IS the
  // zero-results placeholder (strategies' `emptyPart()`, `fics.length === 0`),
  // show the empty state instead of an empty table shell (an empty `<thead>`
  // with no rows teaches nothing; the empty state at least offers a next
  // step). Both branches still mount every hook above unconditionally so hook
  // order never depends on the data shape.
  if (parts.length === 1) {
    const only = parts[0];
    if (only.fics.length === 0) {
      return (
        <div className="bview">
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon name="search" size={22} />
            </span>
            <h2 className="empty-state-title">No fics matched &quot;{params.q}&quot;.</h2>
            <p>Try loosening the wording, or turn off strict filters.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="bview bview--single">
        <div className="bnode" data-tone={only.badge?.tone ?? "all"}>
          <header className="bnode__grip" style={{ cursor: "default" }}>
            <div className="bnode__titles">
              <div className="bnode__title" role="heading" aria-level={3}>
                {only.badge && (
                  <span className="bnode__badge" data-tone={only.badge.tone}>
                    {only.badge.label}
                  </span>
                )}
                <span className="bnode__name">{only.title}</span>
              </div>
              {only.detail && <div className="bnode__detail">{only.detail}</div>}
            </div>
          </header>
          <ResultsTable fics={only.fics} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="bview">
      {/* The slice switcher lives in normal page flow ABOVE the canvas — a page
          control, not a floating panel that covers the first table. */}
      <div className="bview__bar">
        <div className="bswitch__seg" role="group" aria-label="Slice results by">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`bswitch__btn${s.id === strategyId ? " is-active" : ""}`}
              aria-pressed={s.id === strategyId}
              title={s.description}
              onClick={() => setStrategyId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* aria-live so switching strategies announces what the new slicing is. */}
        <span className="bswitch__hint" aria-live="polite">
          {active.description}
        </span>
      </div>

      <div className="board-root is-embedded" ref={canvasRef}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          onNodesChange={handleNodesChange}
          nodeTypes={nodeTypes}
          colorMode="light"
          minZoom={0.2}
          maxZoom={1.2}
          nodesConnectable={false}
          attributionPosition="bottom-left"
          // Slices are views, not documents: never let Delete/Backspace on a
          // selected slice remove it from the board.
          deleteKeyCode={null}
          // Double-clicking table controls (sort, more/less) must not zoom-jump.
          zoomOnDoubleClick={false}
          elevateNodesOnSelect
          panOnScroll
          // Default drag-to-pan (left button AND touch). The previous
          // selection-marquee-on-left-drag setup left touchscreens with no way
          // to pan at all, and turned copy-a-cell drags into surprise lassos.
        >
          {/* Cross (registration marks), not Dots: a print-shop imposition
              table reads as ruled-up paper, not generic canvas software
              (REDESIGN-SPEC §4.1). Color comes from --xy-background-pattern-
              color set on .board-root above, not a `color` prop here — that
              keeps every consumer of this component reading the ancestor's
              token instead of a value baked into JSX. */}
          <Background variant={BackgroundVariant.Cross} gap={56} size={6} />
          {/* Bottom-right, so the controls don't sit on top of the first slice
              column (nodes stack from x=0 at the left). */}
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
        {overflowBelow > 0 && (
          <button
            type="button"
            className="bview__more"
            onClick={panToNextSlice}
          >
            <Icon name="chevron-down" size={14} />
            {overflowBelow} more slice{overflowBelow === 1 ? "" : "s"} below
          </button>
        )}
      </div>
    </div>
  );
}

export function BoardView(props: {
  fics: Fic[];
  variants: SearchVariant[] | null;
  params: SearchParams;
}) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
