import { useEffect, useRef, useState, type RefObject } from 'react';
import { Group, Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import { courtSize } from '../court/geometry';
import { BoardColors, CourtLayer } from '../court/CourtLayer';
import { useEditorStore } from '../store/editorStore';
import { ballDisplayPos, samplePlayback } from '../animation/playback';
import { ActionShape } from './ActionShapes';
import { BallToken, PlayerToken } from './PlayerToken';
import type { ActionType, Vec2 } from '../models/types';

const DRAW_TOOLS: ReadonlySet<string> = new Set([
  'cut',
  'pass',
  'dribble',
  'screen',
  'shot',
  'handoff',
  'freehand',
]);

/** court margin in meters — tighter on small screens so the court gets the pixels */
function stagePad(w: number, h: number): number {
  return Math.min(w, h) < 520 ? 0.55 : 1.1;
}

interface Props {
  stageRef: RefObject<Konva.Stage>;
  colors: BoardColors;
}

export function CourtStage({ stageRef, colors }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 400 });

  const play = useEditorStore((s) => s.play);
  const frameIndex = useEditorStore((s) => s.frameIndex);
  const tool = useEditorStore((s) => s.tool);
  const draft = useEditorStore((s) => s.draft);
  const previewTime = useEditorStore((s) => s.previewTime);
  const selectedActionId = useEditorStore((s) => s.selectedActionId);
  const selectedPlayerId = useEditorStore((s) => s.selectedPlayerId);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  if (!play) return <div className="stage-container" ref={containerRef} />;

  const { w: cw, h: ch } = courtSize(play.courtType);
  const pad = stagePad(size.w, size.h);
  const scale = Math.max(
    1,
    Math.min(size.w / (cw + pad * 2), size.h / (ch + pad * 2)),
  );
  const offX = (size.w - cw * scale) / 2;
  const offY = (size.h - ch * scale) / 2;

  const frame = play.frames[frameIndex];
  const sample = previewTime !== null ? samplePlayback(play, previewTime) : null;
  const positions = sample ? sample.positions : frame.positions;
  const ballPos = sample ? sample.ball : ballDisplayPos(frame, frame.positions);
  const actionsFrame = sample ? play.frames[sample.segment] : frame;
  const interactive = tool === 'select' && previewTime === null;
  const drawing = DRAW_TOOLS.has(tool) && previewTime === null;

  const toCourt = (): Vec2 | null => {
    const p = stageRef.current?.getPointerPosition();
    if (!p) return null;
    return { x: (p.x - offX) / scale, y: (p.y - offY) / scale };
  };

  const onPointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (!drawing) {
      // clicking empty court with select tool clears the selection
      if (tool === 'select' && e.target === e.target.getStage()) {
        useEditorStore.getState().selectAction(null);
        useEditorStore.getState().selectPlayer(null);
      }
      return;
    }
    const pt = toCourt();
    if (!pt) return;
    // start from a nearby player token when there is one
    let playerId: string | undefined;
    let best = 0.75;
    for (const p of play.players) {
      const pp = frame.positions[p.id];
      if (!pp) continue;
      const d = Math.hypot(pp.x - pt.x, pp.y - pt.y);
      if (d < best) {
        best = d;
        playerId = p.id;
      }
    }
    const start = playerId ? frame.positions[playerId] : pt;
    useEditorStore.getState().startDraft(tool as ActionType, start, playerId);
  };

  const onPointerMove = () => {
    if (!useEditorStore.getState().draft) return;
    const pt = toCourt();
    if (pt) useEditorStore.getState().extendDraft(pt);
  };

  const onPointerUp = () => {
    if (useEditorStore.getState().draft) useEditorStore.getState().commitDraft();
  };

  const onActionPointerDown = (id: string) => (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (tool === 'eraser') {
      useEditorStore.getState().deleteAction(id);
      e.cancelBubble = true;
    } else if (tool === 'select') {
      useEditorStore.getState().selectAction(id);
      e.cancelBubble = true;
    }
  };

  return (
    <div
      className="stage-container"
      ref={containerRef}
      style={{ cursor: drawing ? 'crosshair' : tool === 'eraser' ? 'not-allowed' : 'default' }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Layer>
          <Group x={offX} y={offY} scaleX={scale} scaleY={scale}>
            <CourtLayer type={play.courtType} colors={colors} />
            {actionsFrame.actions.map((a) => (
              <ActionShape
                key={a.id}
                action={a}
                ink={a.id === selectedActionId ? colors.inkSelected : colors.ink}
                selected={a.id === selectedActionId}
                onPointerDown={onActionPointerDown(a.id)}
              />
            ))}
            {draft && (
              <ActionShape
                action={{ id: '__draft', type: draft.type, playerId: draft.playerId, points: draft.points }}
                ink={colors.ink}
                draft
              />
            )}
            {play.players.map((p) => {
              const pos = positions[p.id];
              if (!pos) return null;
              return (
                <PlayerToken
                  key={p.id}
                  player={p}
                  pos={pos}
                  colors={colors}
                  interactive={interactive}
                  selected={p.id === selectedPlayerId}
                />
              );
            })}
            {ballPos && <BallToken pos={ballPos} colors={colors} interactive={interactive} />}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}
