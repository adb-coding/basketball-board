import type { ReactNode } from 'react';
import type { Tool } from '../models/types';
import { useEditorStore } from '../store/editorStore';
import {
  CutIcon,
  DribbleIcon,
  EraserIcon,
  HandoffIcon,
  PassIcon,
  PenIcon,
  ScreenIcon,
  SelectIcon,
  ShotIcon,
} from './icons';

const TOOLS: { tool: Tool; label: string; icon: ReactNode }[] = [
  { tool: 'select', label: 'Select / move (V)', icon: <SelectIcon /> },
  { tool: 'cut', label: 'Cut — solid arrow (C)', icon: <CutIcon /> },
  { tool: 'dribble', label: 'Dribble / drive — zigzag arrow (D)', icon: <DribbleIcon /> },
  { tool: 'pass', label: 'Pass — dashed arrow (P)', icon: <PassIcon /> },
  { tool: 'screen', label: 'Screen — line with bar (S)', icon: <ScreenIcon /> },
  { tool: 'shot', label: 'Shot — double arrow (T)', icon: <ShotIcon /> },
  { tool: 'handoff', label: 'Handoff (H)', icon: <HandoffIcon /> },
  { tool: 'freehand', label: 'Freehand pen (F)', icon: <PenIcon /> },
  { tool: 'eraser', label: 'Eraser (E)', icon: <EraserIcon /> },
];

export const TOOL_HOTKEYS: Record<string, Tool> = {
  v: 'select',
  c: 'cut',
  d: 'dribble',
  p: 'pass',
  s: 'screen',
  t: 'shot',
  h: 'handoff',
  f: 'freehand',
  e: 'eraser',
};

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          className={`tool-btn ${tool === t.tool ? 'active' : ''}`}
          title={t.label}
          aria-label={t.label}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => setTool(t.tool)}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
