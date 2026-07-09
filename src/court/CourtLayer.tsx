import { Rect, Shape } from 'react-konva';
import type { CourtType } from '../models/types';
import { courtSize, drawCourtLines, type CourtColors } from './geometry';
import type { Theme } from '../store/uiStore';

export interface BoardColors extends CourtColors {
  /** color used for drawn actions (cuts, passes, screens…) */
  ink: string;
  inkSelected: string;
  offense: string;
  defense: string;
  ballFill: string;
  ballStroke: string;
  label: string;
}

export function boardColors(theme: Theme): BoardColors {
  if (theme === 'light') {
    return {
      floor: '#e3b57e',
      key: '#d69c54',
      lines: '#fdf6ec',
      rim: '#b91c1c',
      ink: '#22304a',
      inkSelected: '#b91c1c',
      offense: '#f06511',
      defense: '#2a6db8',
      ballFill: '#c2540a',
      ballStroke: '#5b2708',
      label: '#ffffff',
    };
  }
  return {
    floor: '#1c222c',
    key: '#242c39',
    lines: '#8794aa',
    rim: '#f06511',
    ink: '#ffc53d',
    inkSelected: '#ff7d6b',
    offense: '#f06511',
    defense: '#4ea8de',
    ballFill: '#f06511',
    ballStroke: '#6b2a0c',
    label: '#ffffff',
  };
}

export function CourtLayer({ type, colors }: { type: CourtType; colors: BoardColors }) {
  const { w, h } = courtSize(type);
  return (
    <>
      <Rect
        x={-0.9}
        y={-0.9}
        width={w + 1.8}
        height={h + 1.8}
        fill={colors.floor}
        cornerRadius={0.25}
        listening={false}
      />
      <Shape
        listening={false}
        sceneFunc={(ctx) => drawCourtLines(ctx._context, type, colors)}
      />
    </>
  );
}
