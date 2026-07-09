import { describe, expect, it } from 'vitest';
import { basketPositions, courtSize, threeCornerY, FIBA } from './geometry';

describe('court geometry', () => {
  it('half court is 15 x 14 m', () => {
    expect(courtSize('half-5v5')).toEqual({ w: 15, h: 14 });
    expect(courtSize('half-3x3')).toEqual({ w: 15, h: 14 });
  });

  it('full court is 28 x 15 m', () => {
    expect(courtSize('full-5v5')).toEqual({ w: 28, h: 15 });
  });

  it('corner three straight segment ends 2.99 m from the baseline (FIBA)', () => {
    expect(threeCornerY()).toBeCloseTo(2.99, 2);
  });

  it('baskets sit 1.575 m from each baseline', () => {
    expect(basketPositions('half-5v5')).toEqual([{ x: 7.5, y: FIBA.basketFromBaseline }]);
    const [left, right] = basketPositions('full-5v5');
    expect(left.x).toBeCloseTo(FIBA.basketFromBaseline);
    expect(right.x).toBeCloseTo(28 - FIBA.basketFromBaseline);
  });
});
