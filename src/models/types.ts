export type CourtType = 'half-3x3' | 'half-5v5' | 'full-5v5';
export type Side = 'offense' | 'defense';

export type ActionType =
  | 'cut'
  | 'pass'
  | 'dribble'
  | 'screen'
  | 'shot'
  | 'handoff'
  | 'freehand';

export type Tool = 'select' | 'eraser' | ActionType;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: Side;
  label: string;
  color?: string;
}

export interface Action {
  id: string;
  type: ActionType;
  /** player the action originates from, when drawn starting on a token */
  playerId?: string;
  /** path in court meters */
  points: Vec2[];
}

export interface BallState {
  holderId?: string;
  pos?: Vec2;
}

export interface Frame {
  id: string;
  /** duration of the transition from this frame to the next one */
  durationMs: number;
  note?: string;
  positions: Record<string, Vec2>;
  ball: BallState;
  /** actions drawn on this frame, describing the transition to the next frame */
  actions: Action[];
}

export interface Play {
  id: string;
  name: string;
  tags: string[];
  courtType: CourtType;
  /** playbook this play belongs to; undefined = unassigned */
  teamId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  players: Player[];
  frames: Frame[];
}

export interface Team {
  id: string;
  name: string;
  /** used as the offense token color for this team's plays */
  color?: string;
  createdAt: number;
}

/** example video attached to a play, stored as a blob in IndexedDB */
export interface PlayVideo {
  id: string;
  playId: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: number;
}
