import { Circle, Group, Line, Text } from 'react-konva';
import type Konva from 'konva';
import type { Player, Vec2 } from '../models/types';
import type { BoardColors } from '../court/CourtLayer';
import { useEditorStore } from '../store/editorStore';
import { clampToCourt } from '../models/play';

const R = 0.45;

interface Props {
  player: Player;
  pos: Vec2;
  colors: BoardColors;
  interactive: boolean;
  selected: boolean;
}

export function PlayerToken({ player, pos, colors, interactive, selected }: Props) {
  const color = player.color ?? (player.team === 'offense' ? colors.offense : colors.defense);

  const onDragStart = () => {
    useEditorStore.getState().beginGesture();
    useEditorStore.getState().selectPlayer(player.id);
  };
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const courtType = useEditorStore.getState().play!.courtType;
    const clamped = clampToCourt(e.target.position(), courtType);
    e.target.position(clamped);
    useEditorStore.getState().movePlayer(player.id, clamped);
  };

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable={interactive}
      listening={interactive}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onPointerDown={() => useEditorStore.getState().selectPlayer(player.id)}
    >
      {player.team === 'offense' ? (
        <>
          <Circle
            radius={R}
            fill={color}
            stroke={selected ? colors.inkSelected : 'rgba(0,0,0,0.45)'}
            strokeWidth={selected ? 0.09 : 0.05}
            shadowColor="black"
            shadowBlur={0.25}
            shadowOpacity={0.35}
          />
          <Text
            text={player.label}
            fill={colors.label}
            fontSize={0.52}
            fontStyle="bold"
            x={-R}
            y={-0.27}
            width={R * 2}
            align="center"
            listening={false}
          />
        </>
      ) : (
        <>
          {/* invisible hit area for easy dragging */}
          <Circle radius={0.55} fill="transparent" stroke={selected ? colors.inkSelected : undefined} strokeWidth={0.05} dash={[0.12, 0.12]} />
          <Line points={[-0.32, -0.32, 0.32, 0.32]} stroke={color} strokeWidth={0.14} lineCap="round" listening={false} />
          <Line points={[-0.32, 0.32, 0.32, -0.32]} stroke={color} strokeWidth={0.14} lineCap="round" listening={false} />
          <Text
            text={player.label}
            fill={color}
            fontSize={0.34}
            fontStyle="bold"
            x={0.3}
            y={0.22}
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

export function BallToken({ pos, colors, interactive }: { pos: Vec2; colors: BoardColors; interactive: boolean }) {
  const onDragStart = () => useEditorStore.getState().beginGesture();
  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    useEditorStore.getState().moveBall(e.target.position());
  };
  return (
    <Group x={pos.x} y={pos.y} draggable={interactive} listening={interactive} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Circle radius={0.28} fill={colors.ballFill} stroke={colors.ballStroke} strokeWidth={0.05} />
      <Line points={[-0.28, 0, 0.28, 0]} stroke={colors.ballStroke} strokeWidth={0.035} listening={false} />
      <Line points={[0, -0.28, 0, 0.28]} stroke={colors.ballStroke} strokeWidth={0.035} listening={false} />
    </Group>
  );
}
