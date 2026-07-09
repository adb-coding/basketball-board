import { describe, expect, it } from 'vitest';
import { easeInOut, pathLength, pointAt, samplePlayback, totalDuration } from './playback';
import type { Play } from '../models/types';

const line = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
];

describe('path math', () => {
  it('pathLength sums segments', () => {
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBeCloseTo(5);
  });

  it('pointAt is arc-length parameterized', () => {
    expect(pointAt(line, 0.5)).toEqual({ x: 5, y: 0 });
    const bent = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
    ];
    expect(pointAt(bent, 0.5)).toEqual({ x: 6, y: 0 });
  });

  it('easeInOut is symmetric and bounded', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
});

function makePlay(): Play {
  return {
    id: 'p',
    name: 'test',
    tags: [],
    courtType: 'half-5v5',
    createdAt: 0,
    updatedAt: 0,
    players: [{ id: 'a', team: 'offense', label: '1' }],
    frames: [
      { id: 'f1', durationMs: 1000, positions: { a: { x: 0, y: 0 } }, ball: { holderId: 'a' }, actions: [] },
      { id: 'f2', durationMs: 1000, positions: { a: { x: 10, y: 0 } }, ball: { holderId: 'a' }, actions: [] },
    ],
  };
}

describe('playback sampling', () => {
  it('totalDuration counts transitions only', () => {
    expect(totalDuration(makePlay())).toBe(1000);
  });

  it('players sit at frame positions at segment bounds', () => {
    const play = makePlay();
    expect(samplePlayback(play, 0).positions.a).toEqual({ x: 0, y: 0 });
    expect(samplePlayback(play, 1000).positions.a).toEqual({ x: 10, y: 0 });
  });

  it('midpoint of an eased transition is halfway', () => {
    const play = makePlay();
    expect(samplePlayback(play, 500).positions.a.x).toBeCloseTo(5);
  });

  it('players follow a drawn movement path', () => {
    const play = makePlay();
    play.frames[0].actions.push({
      id: 'act',
      type: 'cut',
      playerId: 'a',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 5 },
        { x: 10, y: 5 },
        { x: 10, y: 0 },
      ],
    });
    const mid = samplePlayback(play, 500).positions.a;
    // halfway along the detour path (length 20) is (5, 5), not the straight-line (5, 0)
    expect(mid.y).toBeCloseTo(5);
  });

  it('ball follows a pass path', () => {
    const play = makePlay();
    play.frames[0].actions.push({
      id: 'pass',
      type: 'pass',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 8 },
      ],
    });
    const ball = samplePlayback(play, 500).ball!;
    expect(ball.y).toBeCloseTo(4);
  });
});
