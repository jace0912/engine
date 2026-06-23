// ZCFM — Zero-Capacity First Move. Ultra-small moves for near-zero capacity.
//
// A valid ZCFM move requires NONE of: money, planning, sustained attention,
// a new skill, external approval, or outcome dependency. Success means the
// move was attempted or completed — not that the situation was solved.
// Fixed templated text only; no generated advice.

export interface ZcfmMove {
  id: string;
  text: string;
}

export const zcfmMoves: ZcfmMove[] = [
  { id: 'jaw', text: 'Let your jaw unclench, just for this moment.' },
  { id: 'shoulders', text: 'Let your shoulders drop a little.' },
  { id: 'breath_out', text: 'Let one breath out slowly. That is the whole move.' },
  { id: 'feet', text: 'Notice your feet touching the floor.' },
  { id: 'eyes', text: 'Let your eyes rest closed for one breath.' },
];

/** Deterministically pick one move, varying it as moves are completed. */
export function zcfmMoveForCount(count: number): ZcfmMove {
  const index = ((count % zcfmMoves.length) + zcfmMoves.length) % zcfmMoves.length;
  return zcfmMoves[index];
}
