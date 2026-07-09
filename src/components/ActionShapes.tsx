import { Arrow, Circle, Group, Line } from 'react-konva';
import type Konva from 'konva';
import type { Action, Vec2 } from '../models/types';
import { pathLength, pointAt } from '../animation/playback';

const STROKE = 0.09;
const HIT = 0.7;
const HEAD_LEN = 0.5;
const HEAD_W = 0.45;

function flat(points: Vec2[]): number[] {
  const out: number[] = [];
  for (const p of points) out.push(p.x, p.y);
  return out;
}

/** resample a polyline into points spaced `step` apart */
function resample(points: Vec2[], step: number): Vec2[] {
  const len = pathLength(points);
  const n = Math.max(2, Math.round(len / step));
  const out: Vec2[] = [];
  for (let i = 0; i <= n; i++) out.push(pointAt(points, i / n));
  return out;
}

/** zigzag polyline along the path (dribble notation) */
function zigzag(points: Vec2[]): Vec2[] {
  const base = resample(points, 0.4);
  const out: Vec2[] = [base[0]];
  for (let i = 1; i < base.length - 1; i++) {
    const prev = base[i - 1];
    const next = base[i + 1];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    const amp = i % 2 === 0 ? 0.16 : -0.16;
    out.push({ x: base[i].x + (-dy / d) * amp, y: base[i].y + (dx / d) * amp });
  }
  out.push(base[base.length - 1]);
  return out;
}

/** unit direction at the end of the path */
function endDirection(points: Vec2[]): Vec2 {
  const b = points[points.length - 1];
  let a = points[points.length - 2] ?? b;
  for (let i = points.length - 2; i >= 0; i--) {
    a = points[i];
    if (Math.hypot(b.x - a.x, b.y - a.y) > 0.15) break;
  }
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

interface Props {
  action: Action;
  ink: string;
  selected?: boolean;
  draft?: boolean;
  onPointerDown?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
}

export function ActionShape({ action, ink, selected, draft, onPointerDown }: Props) {
  const { type, points } = action;
  if (points.length < 2) return null;

  const common = {
    stroke: ink,
    strokeWidth: selected ? STROKE * 1.6 : STROKE,
    hitStrokeWidth: HIT,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
    opacity: draft ? 0.6 : 1,
    onPointerDown,
  };
  const head = { fill: ink, pointerLength: HEAD_LEN, pointerWidth: HEAD_W };
  const end = points[points.length - 1];
  const dir = endDirection(points);

  switch (type) {
    case 'cut':
    case 'freehand':
      return type === 'cut' ? (
        <Arrow {...common} {...head} points={flat(points)} tension={0.4} />
      ) : (
        <Line {...common} points={flat(points)} tension={0.4} />
      );

    case 'pass':
      return <Arrow {...common} {...head} points={flat(points)} dash={[0.35, 0.28]} />;

    case 'dribble':
      return <Arrow {...common} {...head} points={flat(zigzag(points))} tension={0.5} />;

    case 'screen': {
      // solid line ending in a perpendicular bar
      const barHalf = 0.4;
      const bar = [
        end.x - dir.y * barHalf,
        end.y + dir.x * barHalf,
        end.x + dir.y * barHalf,
        end.y - dir.x * barHalf,
      ];
      return (
        <Group>
          <Line {...common} points={flat(points)} tension={0.3} />
          <Line {...common} points={bar} />
        </Group>
      );
    }

    case 'shot': {
      // double arrowhead
      const back = { x: end.x - dir.x * 0.55, y: end.y - dir.y * 0.55 };
      const back2 = { x: back.x - dir.x * 0.01, y: back.y - dir.y * 0.01 };
      return (
        <Group>
          <Arrow {...common} {...head} points={flat(points)} />
          <Arrow {...common} {...head} points={flat([back2, back])} />
        </Group>
      );
    }

    case 'handoff':
      // short line with an open circle at the end (ball left for a teammate)
      return (
        <Group>
          <Line {...common} points={flat(points)} tension={0.3} />
          <Circle {...common} x={end.x} y={end.y} radius={0.22} />
        </Group>
      );

    default:
      return <Line {...common} points={flat(points)} />;
  }
}
