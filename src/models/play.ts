import type { BallState, CourtType, Play, Player, Frame, Vec2 } from './types';
import { basketPositions, courtSize } from '../court/geometry';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const DEFAULT_FRAME_DURATION = 1500;

/** offensive spots on a half court (basket at the top), 4-out-1-in style */
const HALF_SPOTS: Vec2[] = [
  { x: 7.5, y: 9.8 }, // 1 — top
  { x: 3.0, y: 7.8 }, // 2 — left wing
  { x: 12.0, y: 7.8 }, // 3 — right wing
  { x: 1.6, y: 1.6 }, // 4 — left corner
  { x: 13.4, y: 1.6 }, // 5 — right corner
];

function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function createPlay(courtType: CourtType, name = 'Untitled play', teamId?: string): Play {
  const count = courtType === 'half-3x3' ? 3 : 5;
  const basket = basketPositions(courtType)[0];
  const toFull = courtType === 'full-5v5';

  const players: Player[] = [];
  const positions: Record<string, Vec2> = {};

  for (let i = 0; i < count; i++) {
    const spot = toFull
      ? { x: HALF_SPOTS[i].y, y: HALF_SPOTS[i].x } // map half coords onto the left end
      : HALF_SPOTS[i];
    const off: Player = { id: uid(), team: 'offense', label: `${i + 1}` };
    const def: Player = { id: uid(), team: 'defense', label: `X${i + 1}` };
    players.push(off, def);
    positions[off.id] = spot;
    positions[def.id] = lerp(spot, basket, 0.35);
  }

  const ball: BallState = { holderId: players[0].id };
  const now = Date.now();
  return {
    id: uid(),
    name,
    tags: [],
    courtType,
    teamId,
    createdAt: now,
    updatedAt: now,
    players,
    frames: [{ id: uid(), durationMs: DEFAULT_FRAME_DURATION, positions, ball, actions: [] }],
  };
}

export function clonePlay(play: Play): Play {
  return JSON.parse(JSON.stringify(play)) as Play;
}

export function clampToCourt(pos: Vec2, courtType: CourtType, margin = 0.3): Vec2 {
  const { w, h } = courtSize(courtType);
  return {
    x: Math.min(w + margin, Math.max(-margin, pos.x)),
    y: Math.min(h + margin, Math.max(-margin, pos.y)),
  };
}

/** frame factory used when appending frames */
export function emptyFrameFrom(frame: Frame): Frame {
  return {
    id: uid(),
    durationMs: frame.durationMs,
    positions: { ...frame.positions },
    ball: { ...frame.ball },
    actions: [],
  };
}
