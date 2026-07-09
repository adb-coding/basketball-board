import type { CourtType, Vec2 } from '../models/types';

/** FIBA dimensions, in meters */
export const FIBA = {
  courtWidth: 15,
  courtLength: 28,
  halfLength: 14,
  basketFromBaseline: 1.575,
  rimRadius: 0.225,
  backboardFromBaseline: 1.2,
  backboardWidth: 1.8,
  keyWidth: 4.9,
  keyLength: 5.8,
  ftCircleRadius: 1.8,
  threeRadius: 6.75,
  threeCornerFromSideline: 0.9,
  noChargeRadius: 1.25,
  centerCircleRadius: 1.8,
  lineWidth: 0.05,
} as const;

/** y (distance from baseline) where the straight corner-three segment meets the arc */
export function threeCornerY(): number {
  const dx = FIBA.courtWidth / 2 - FIBA.threeCornerFromSideline;
  return FIBA.basketFromBaseline + Math.sqrt(FIBA.threeRadius ** 2 - dx ** 2);
}

export function courtSize(type: CourtType): { w: number; h: number } {
  return type === 'full-5v5'
    ? { w: FIBA.courtLength, h: FIBA.courtWidth }
    : { w: FIBA.courtWidth, h: FIBA.halfLength };
}

/** basket centers in court coordinates for the given court type */
export function basketPositions(type: CourtType): Vec2[] {
  if (type === 'full-5v5') {
    return [
      { x: FIBA.basketFromBaseline, y: FIBA.courtWidth / 2 },
      { x: FIBA.courtLength - FIBA.basketFromBaseline, y: FIBA.courtWidth / 2 },
    ];
  }
  return [{ x: FIBA.courtWidth / 2, y: FIBA.basketFromBaseline }];
}

export interface CourtColors {
  floor: string;
  lines: string;
  key: string;
  rim: string;
}

/**
 * Draw one half-court in local coordinates (u = across the 15m width,
 * v = distance from baseline). Caller sets the canvas transform.
 */
function drawHalf(c: CanvasRenderingContext2D, colors: CourtColors, withHalfLine: boolean) {
  const F = FIBA;
  const cx = F.courtWidth / 2;
  const by = F.basketFromBaseline;

  // key (painted area)
  c.fillStyle = colors.key;
  c.fillRect(cx - F.keyWidth / 2, 0, F.keyWidth, F.keyLength);

  c.strokeStyle = colors.lines;
  c.lineWidth = F.lineWidth;

  // key outline
  c.strokeRect(cx - F.keyWidth / 2, 0, F.keyWidth, F.keyLength);

  // free-throw circle
  c.beginPath();
  c.arc(cx, F.keyLength, F.ftCircleRadius, 0, Math.PI * 2);
  c.stroke();

  // three-point line
  const cy3 = threeCornerY();
  const left = F.threeCornerFromSideline;
  const right = F.courtWidth - F.threeCornerFromSideline;
  const aLeft = Math.atan2(cy3 - by, left - cx);
  const aRight = Math.atan2(cy3 - by, right - cx);
  c.beginPath();
  c.moveTo(left, 0);
  c.lineTo(left, cy3);
  c.arc(cx, by, F.threeRadius, aLeft, aRight, true);
  c.lineTo(right, 0);
  c.stroke();

  // no-charge semicircle (opens toward halfcourt)
  c.beginPath();
  c.arc(cx, by, F.noChargeRadius, 0, Math.PI, false);
  c.stroke();

  // backboard + rim
  c.strokeStyle = colors.rim;
  c.beginPath();
  c.moveTo(cx - F.backboardWidth / 2, F.backboardFromBaseline);
  c.lineTo(cx + F.backboardWidth / 2, F.backboardFromBaseline);
  c.stroke();
  c.beginPath();
  c.arc(cx, by, F.rimRadius, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = colors.lines;

  if (withHalfLine) {
    // halfcourt line + half of the center circle
    c.beginPath();
    c.moveTo(0, F.halfLength);
    c.lineTo(F.courtWidth, F.halfLength);
    c.stroke();
    c.beginPath();
    c.arc(cx, F.halfLength, F.centerCircleRadius, Math.PI, Math.PI * 2, false);
    c.stroke();
  }
}

export function drawCourtLines(c: CanvasRenderingContext2D, type: CourtType, colors: CourtColors) {
  const { w, h } = courtSize(type);

  c.strokeStyle = colors.lines;
  c.lineWidth = FIBA.lineWidth;
  c.strokeRect(0, 0, w, h);

  if (type === 'full-5v5') {
    // left end: (u,v) -> (v,u)
    c.save();
    c.transform(0, 1, 1, 0, 0, 0);
    drawHalf(c, colors, false);
    c.restore();
    // right end: (u,v) -> (W-v,u)
    c.save();
    c.transform(0, 1, -1, 0, FIBA.courtLength, 0);
    drawHalf(c, colors, false);
    c.restore();
    // halfcourt line + full center circle
    c.strokeStyle = colors.lines;
    c.lineWidth = FIBA.lineWidth;
    c.beginPath();
    c.moveTo(FIBA.courtLength / 2, 0);
    c.lineTo(FIBA.courtLength / 2, FIBA.courtWidth);
    c.stroke();
    c.beginPath();
    c.arc(FIBA.courtLength / 2, FIBA.courtWidth / 2, FIBA.centerCircleRadius, 0, Math.PI * 2);
    c.stroke();
  } else {
    drawHalf(c, colors, true);
  }
}
