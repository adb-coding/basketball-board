import type { Action, Frame, Play, Vec2 } from '../models/types';

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function pathLength(points: Vec2[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

/** arc-length parameterized point along a polyline, t in [0,1] */
export function pointAt(points: Vec2[], t: number): Vec2 {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];
  const target = pathLength(points) * t;
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (walked + seg >= target && seg > 0) {
      return lerp(points[i - 1], points[i], (target - walked) / seg);
    }
    walked += seg;
  }
  return points[points.length - 1];
}

/** total playback duration: sum of transition durations (last frame has no transition) */
export function totalDuration(play: Play): number {
  let total = 0;
  for (let i = 0; i < play.frames.length - 1; i++) total += play.frames[i].durationMs;
  return total;
}

const MOVEMENT_TYPES = new Set(['cut', 'dribble', 'freehand']);

function movementAction(frame: Frame, playerId: string): Action | undefined {
  return frame.actions.find((a) => MOVEMENT_TYPES.has(a.type) && a.playerId === playerId);
}

export function ballDisplayPos(frame: Frame, positions: Record<string, Vec2>): Vec2 | null {
  if (frame.ball.holderId && positions[frame.ball.holderId]) {
    const p = positions[frame.ball.holderId];
    return { x: p.x + 0.45, y: p.y + 0.35 };
  }
  return frame.ball.pos ?? null;
}

export interface PlaybackSample {
  positions: Record<string, Vec2>;
  ball: Vec2 | null;
  segment: number;
  note?: string;
}

/** state of all entities at absolute playback time (ms) */
export function samplePlayback(play: Play, timeMs: number): PlaybackSample {
  const frames = play.frames;
  if (frames.length < 2) {
    const f = frames[0];
    return { positions: { ...f.positions }, ball: ballDisplayPos(f, f.positions), segment: 0, note: f.note };
  }

  // locate the active segment
  let seg = 0;
  let t0 = 0;
  while (seg < frames.length - 2 && timeMs >= t0 + frames[seg].durationMs) {
    t0 += frames[seg].durationMs;
    seg++;
  }
  const from = frames[seg];
  const to = frames[seg + 1];
  const raw = Math.min(1, Math.max(0, (timeMs - t0) / from.durationMs));
  const t = easeInOut(raw);

  const positions: Record<string, Vec2> = {};
  for (const player of play.players) {
    const a = from.positions[player.id];
    const b = to.positions[player.id] ?? a;
    if (!a) continue;
    const action = movementAction(from, player.id);
    if (action && action.points.length > 1) {
      // follow the drawn path; make sure it lands on the next frame position
      const pts = [...action.points];
      const last = pts[pts.length - 1];
      if (Math.hypot(last.x - b.x, last.y - b.y) > 0.05) pts.push(b);
      positions[player.id] = pointAt(pts, t);
    } else {
      positions[player.id] = lerp(a, b, t);
    }
  }

  // ball: follow a pass path if one exists, otherwise follow the holder / lerp
  let ball: Vec2 | null;
  const pass = from.actions.find((a) => a.type === 'pass' && a.points.length > 1);
  const fromBall = ballDisplayPos(from, positions);
  const toBall = ballDisplayPos(to, positions);
  if (pass) {
    ball = pointAt(pass.points, t);
  } else if (from.ball.holderId && from.ball.holderId === to.ball.holderId) {
    ball = fromBall;
  } else if (fromBall && toBall) {
    ball = lerp(fromBall, toBall, t);
  } else {
    ball = fromBall ?? toBall;
  }

  return { positions, ball, segment: seg, note: from.note };
}
