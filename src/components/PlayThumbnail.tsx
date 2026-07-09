import type { Play } from '../models/types';
import { courtSize, FIBA, threeCornerY } from '../court/geometry';
import { ballDisplayPos } from '../animation/playback';

/** court lines for one half, in half-court coordinates (u across, v from baseline) */
function HalfLines({ withHalfLine }: { withHalfLine: boolean }) {
  const F = FIBA;
  const cx = F.courtWidth / 2;
  const cy3 = threeCornerY();
  const left = F.threeCornerFromSideline;
  const right = F.courtWidth - F.threeCornerFromSideline;
  return (
    <g className="thumb-lines">
      <rect x={cx - F.keyWidth / 2} y={0} width={F.keyWidth} height={F.keyLength} />
      <circle cx={cx} cy={F.keyLength} r={F.ftCircleRadius} />
      <path
        d={`M ${left} 0 L ${left} ${cy3} A ${F.threeRadius} ${F.threeRadius} 0 0 0 ${right} ${cy3} L ${right} 0`}
      />
      {withHalfLine && (
        <path
          d={`M 0 ${F.halfLength} H ${F.courtWidth} M ${cx - F.centerCircleRadius} ${F.halfLength} A ${F.centerCircleRadius} ${F.centerCircleRadius} 0 0 1 ${cx + F.centerCircleRadius} ${F.halfLength}`}
        />
      )}
    </g>
  );
}

/** static mini-preview of a play's first frame, rendered as pure SVG */
export function PlayThumbnail({ play, teamColor }: { play: Play; teamColor?: string }) {
  const { w, h } = courtSize(play.courtType);
  const frame = play.frames[0];
  const ball = ballDisplayPos(frame, frame.positions);
  const full = play.courtType === 'full-5v5';

  return (
    <svg
      className="play-thumb"
      viewBox={`-0.6 -0.6 ${w + 1.2} ${h + 1.2}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect className="thumb-floor" x={-0.6} y={-0.6} width={w + 1.2} height={h + 1.2} rx={0.5} />
      <g className="thumb-lines">
        <rect x={0} y={0} width={w} height={h} />
      </g>
      {full ? (
        <>
          <g transform="matrix(0 1 1 0 0 0)">
            <HalfLines withHalfLine={false} />
          </g>
          <g transform={`matrix(0 1 -1 0 ${FIBA.courtLength} 0)`}>
            <HalfLines withHalfLine={false} />
          </g>
          <g className="thumb-lines">
            <path d={`M ${w / 2} 0 V ${h}`} />
            <circle cx={w / 2} cy={h / 2} r={FIBA.centerCircleRadius} />
          </g>
        </>
      ) : (
        <HalfLines withHalfLine />
      )}
      {play.players.map((p) => {
        const pos = frame.positions[p.id];
        if (!pos) return null;
        return p.team === 'offense' ? (
          <circle
            key={p.id}
            className="thumb-offense"
            style={teamColor ? { fill: teamColor } : undefined}
            cx={pos.x}
            cy={pos.y}
            r={0.5}
          />
        ) : (
          <g key={p.id} className="thumb-defense">
            <path
              d={`M ${pos.x - 0.35} ${pos.y - 0.35} L ${pos.x + 0.35} ${pos.y + 0.35} M ${pos.x - 0.35} ${pos.y + 0.35} L ${pos.x + 0.35} ${pos.y - 0.35}`}
            />
          </g>
        );
      })}
      {ball && <circle className="thumb-ball" cx={ball.x} cy={ball.y} r={0.32} />}
    </svg>
  );
}
