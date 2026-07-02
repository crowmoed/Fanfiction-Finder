/**
 * board/layout.ts — where freshly-created nodes get placed.
 *
 * Groups stack in horizontal bands (one band per search); the parts of a group
 * run left-to-right within their band. Positions are only computed for NEW
 * nodes — once a node exists, its (possibly dragged) position is preserved, so
 * switching strategies or adding a search never yanks existing tables around.
 */
export const NODE_WIDTH = 560;

const COL_GAP = 40;
const ROW_GAP = 72;
const BAND_HEIGHT = 520;

export function slotFor(groupIndex: number, partIndex: number): { x: number; y: number } {
  return {
    x: partIndex * (NODE_WIDTH + COL_GAP),
    y: groupIndex * (BAND_HEIGHT + ROW_GAP),
  };
}
