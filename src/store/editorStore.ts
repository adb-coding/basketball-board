import { create } from 'zustand';
import type { ActionType, Play, Player, Side, Tool, Vec2 } from '../models/types';
import { clampToCourt, clonePlay, emptyFrameFrom, uid } from '../models/play';
import { courtSize } from '../court/geometry';
import { ballDisplayPos } from '../animation/playback';
import { totalDuration } from '../animation/playback';
import { savePlay } from '../storage/db';

const STRAIGHT_TOOLS: ReadonlySet<ActionType> = new Set(['pass', 'screen', 'shot', 'handoff']);
const MOVEMENT_TOOLS: ReadonlySet<ActionType> = new Set(['cut', 'dribble', 'freehand']);
const UNDO_LIMIT = 50;

interface Draft {
  type: ActionType;
  playerId?: string;
  points: Vec2[];
}

interface EditorState {
  play: Play | null;
  frameIndex: number;
  tool: Tool;
  selectedActionId: string | null;
  selectedPlayerId: string | null;
  draft: Draft | null;

  playing: boolean;
  /** non-null while playing or scrubbing: absolute playback time in ms */
  previewTime: number | null;
  loop: boolean;
  speed: number;

  past: Play[];
  future: Play[];

  loadPlay: (play: Play) => void;
  closePlay: () => void;
  setTool: (tool: Tool) => void;
  selectAction: (id: string | null) => void;
  selectPlayer: (id: string | null) => void;

  beginGesture: () => void;
  movePlayer: (playerId: string, pos: Vec2) => void;
  moveBall: (pos: Vec2) => void;
  giveBall: (playerId: string) => void;
  updatePlayer: (playerId: string, patch: Partial<Player>) => void;
  addPlayer: (side: Side) => void;
  removePlayer: (playerId: string) => void;
  clearCourt: () => void;
  setTeamId: (teamId: string | undefined) => void;

  startDraft: (type: ActionType, point: Vec2, playerId?: string) => void;
  extendDraft: (point: Vec2) => void;
  commitDraft: () => void;
  cancelDraft: () => void;
  deleteAction: (id: string) => void;

  setFrameIndex: (i: number) => void;
  addFrame: () => void;
  deleteFrame: (i: number) => void;
  setFrameDuration: (ms: number) => void;
  setFrameNote: (note: string) => void;
  setPlayName: (name: string) => void;
  setPlayTags: (tags: string[]) => void;

  undo: () => void;
  redo: () => void;

  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  tick: (dtMs: number) => void;
  setPreviewTime: (t: number | null) => void;
  toggleLoop: () => void;
  setSpeed: (s: number) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function persistSoon(get: () => EditorState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const play = get().play;
    if (!play) return;
    const copy = clonePlay(play);
    copy.updatedAt = Date.now();
    void savePlay(copy);
  }, 600);
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** snapshot the current play for undo; call before any mutation */
  const pushUndo = () => {
    const { play, past } = get();
    if (!play) return;
    set({ past: [...past.slice(-UNDO_LIMIT + 1), clonePlay(play)], future: [] });
  };

  /** apply a mutation to a cloned play and persist */
  const mutate = (fn: (play: Play) => void, withUndo = true) => {
    const play = get().play;
    if (!play) return;
    if (withUndo) pushUndo();
    const next = clonePlay(play);
    fn(next);
    set({ play: next });
    persistSoon(get);
  };

  return {
    play: null,
    frameIndex: 0,
    tool: 'select',
    selectedActionId: null,
    selectedPlayerId: null,
    draft: null,
    playing: false,
    previewTime: null,
    loop: false,
    speed: 1,
    past: [],
    future: [],

    loadPlay: (play) => {
      // flush the previous play so switching plays never drops pending edits
      const current = get().play;
      if (current && current.id !== play.id) {
        clearTimeout(saveTimer);
        const copy = clonePlay(current);
        copy.updatedAt = Date.now();
        void savePlay(copy);
      }
      set({
        play: clonePlay(play),
        frameIndex: 0,
        tool: 'select',
        selectedActionId: null,
        selectedPlayerId: null,
        draft: null,
        playing: false,
        previewTime: null,
        past: [],
        future: [],
      });
    },

    closePlay: () => {
      clearTimeout(saveTimer);
      const play = get().play;
      if (play) {
        const copy = clonePlay(play);
        copy.updatedAt = Date.now();
        void savePlay(copy);
      }
      set({ play: null, playing: false, previewTime: null });
    },

    setTool: (tool) => set({ tool, selectedActionId: null, selectedPlayerId: null }),
    selectAction: (id) => set({ selectedActionId: id, selectedPlayerId: null }),
    selectPlayer: (id) => set({ selectedPlayerId: id, selectedActionId: null }),

    beginGesture: () => pushUndo(),

    movePlayer: (playerId, pos) =>
      mutate((play) => {
        play.frames[get().frameIndex].positions[playerId] = clampToCourt(pos, play.courtType);
      }, false),

    moveBall: (pos) =>
      mutate((play) => {
        const frame = play.frames[get().frameIndex];
        let nearest: { id: string; d: number } | null = null;
        for (const p of play.players) {
          const pp = frame.positions[p.id];
          if (!pp) continue;
          const d = Math.hypot(pp.x - pos.x, pp.y - pos.y);
          if (d < 0.8 && (!nearest || d < nearest.d)) nearest = { id: p.id, d };
        }
        frame.ball = nearest
          ? { holderId: nearest.id }
          : { pos: clampToCourt(pos, play.courtType) };
      }, false),

    giveBall: (playerId) =>
      mutate((play) => {
        play.frames[get().frameIndex].ball = { holderId: playerId };
      }),

    updatePlayer: (playerId, patch) =>
      mutate((play) => {
        const p = play.players.find((pl) => pl.id === playerId);
        if (p) Object.assign(p, patch);
      }),

    addPlayer: (side) =>
      mutate((play) => {
        const teammates = play.players.filter((p) => p.team === side);
        if (teammates.length >= 5) return;
        // smallest free jersey number for this side
        let n = 1;
        const labels = new Set(teammates.map((p) => p.label));
        while (labels.has(side === 'offense' ? `${n}` : `X${n}`)) n++;
        const player: Player = {
          id: uid(),
          team: side,
          label: side === 'offense' ? `${n}` : `X${n}`,
        };
        // spawn along the bottom edge: offense from the left, defense from the right
        const { w, h } = courtSize(play.courtType);
        const idx = teammates.length;
        const pos: Vec2 =
          side === 'offense'
            ? { x: 1.2 + idx * 1.3, y: h - 1.2 }
            : { x: w - 1.2 - idx * 1.3, y: h - 1.2 };
        play.players.push(player);
        for (const frame of play.frames) frame.positions[player.id] = { ...pos };
        set({ selectedPlayerId: player.id });
      }),

    removePlayer: (playerId) =>
      mutate((play) => {
        play.players = play.players.filter((p) => p.id !== playerId);
        for (const frame of play.frames) {
          if (frame.ball.holderId === playerId) {
            // ball stays where its holder was
            frame.ball = { pos: ballDisplayPos(frame, frame.positions) ?? undefined };
          }
          delete frame.positions[playerId];
          frame.actions = frame.actions.filter((a) => a.playerId !== playerId);
        }
        if (get().selectedPlayerId === playerId) set({ selectedPlayerId: null });
      }),

    clearCourt: () =>
      mutate((play) => {
        play.players = [];
        for (const frame of play.frames) {
          frame.ball = { pos: ballDisplayPos(frame, frame.positions) ?? undefined };
          frame.positions = {};
          frame.actions = frame.actions.filter((a) => !a.playerId);
        }
        set({ selectedPlayerId: null });
      }),

    setTeamId: (teamId) =>
      mutate((play) => {
        play.teamId = teamId;
      }, false),

    startDraft: (type, point, playerId) =>
      set({ draft: { type, playerId, points: [point] }, selectedActionId: null }),

    extendDraft: (point) => {
      const draft = get().draft;
      if (!draft) return;
      if (STRAIGHT_TOOLS.has(draft.type)) {
        set({ draft: { ...draft, points: [draft.points[0], point] } });
      } else {
        const last = draft.points[draft.points.length - 1];
        if (Math.hypot(point.x - last.x, point.y - last.y) > 0.12) {
          set({ draft: { ...draft, points: [...draft.points, point] } });
        }
      }
    },

    commitDraft: () => {
      const { draft, frameIndex } = get();
      if (!draft) return;
      set({ draft: null });
      const pts = draft.points;
      const span = pts.length > 1 ? Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y) : 0;
      if (pts.length < 2 || span < 0.4) return;
      mutate((play) => {
        const frame = play.frames[frameIndex];
        if (MOVEMENT_TOOLS.has(draft.type) && draft.playerId) {
          // one movement path per player per frame
          frame.actions = frame.actions.filter(
            (a) => !(MOVEMENT_TOOLS.has(a.type) && a.playerId === draft.playerId),
          );
        }
        frame.actions.push({ id: uid(), type: draft.type, playerId: draft.playerId, points: pts });
      });
    },

    cancelDraft: () => set({ draft: null }),

    deleteAction: (id) =>
      mutate((play) => {
        const frame = play.frames[get().frameIndex];
        frame.actions = frame.actions.filter((a) => a.id !== id);
        if (get().selectedActionId === id) set({ selectedActionId: null });
      }),

    setFrameIndex: (i) => {
      const play = get().play;
      if (!play) return;
      set({
        frameIndex: Math.min(play.frames.length - 1, Math.max(0, i)),
        selectedActionId: null,
        playing: false,
        previewTime: null,
      });
    },

    addFrame: () => {
      const { frameIndex } = get();
      mutate((play) => {
        const current = play.frames[frameIndex];
        const next = emptyFrameFrom(current);
        // movement actions carry players to their path end in the new frame
        // (screen included: the screener walks to the screen spot)
        for (const a of current.actions) {
          if (a.playerId && ['cut', 'dribble', 'freehand', 'screen'].includes(a.type) && a.points.length > 1) {
            next.positions[a.playerId] = a.points[a.points.length - 1];
          }
        }
        // a pass hands the ball to the player closest to the pass end
        const pass = current.actions.find((a) => a.type === 'pass' && a.points.length > 1);
        if (pass) {
          const end = pass.points[pass.points.length - 1];
          let nearest: { id: string; d: number } | null = null;
          for (const p of play.players) {
            const pp = next.positions[p.id];
            if (!pp) continue;
            const d = Math.hypot(pp.x - end.x, pp.y - end.y);
            if (d < 1.5 && (!nearest || d < nearest.d)) nearest = { id: p.id, d };
          }
          if (nearest) next.ball = { holderId: nearest.id };
        }
        play.frames.splice(frameIndex + 1, 0, next);
      });
      set({ frameIndex: frameIndex + 1, selectedActionId: null });
    },

    deleteFrame: (i) => {
      const play = get().play;
      if (!play || play.frames.length <= 1) return;
      mutate((p) => {
        p.frames.splice(i, 1);
      });
      set({ frameIndex: Math.min(get().frameIndex, get().play!.frames.length - 1) });
    },

    setFrameDuration: (ms) =>
      mutate((play) => {
        play.frames[get().frameIndex].durationMs = Math.max(200, Math.min(10000, ms));
      }),

    setFrameNote: (note) =>
      mutate((play) => {
        play.frames[get().frameIndex].note = note;
      }, false),

    setPlayName: (name) =>
      mutate((play) => {
        play.name = name;
      }, false),

    setPlayTags: (tags) =>
      mutate((play) => {
        play.tags = tags;
      }, false),

    undo: () => {
      const { play, past, future } = get();
      if (!play || past.length === 0) return;
      const prev = past[past.length - 1];
      set({
        play: prev,
        past: past.slice(0, -1),
        future: [clonePlay(play), ...future],
        frameIndex: Math.min(get().frameIndex, prev.frames.length - 1),
        selectedActionId: null,
      });
      persistSoon(get);
    },

    redo: () => {
      const { play, past, future } = get();
      if (!play || future.length === 0) return;
      const next = future[0];
      set({
        play: next,
        past: [...past, clonePlay(play)],
        future: future.slice(1),
        frameIndex: Math.min(get().frameIndex, next.frames.length - 1),
        selectedActionId: null,
      });
      persistSoon(get);
    },

    startPlayback: () => {
      const play = get().play;
      if (!play || play.frames.length < 2) return;
      const total = totalDuration(play);
      const t = get().previewTime;
      set({ playing: true, previewTime: t === null || t >= total ? 0 : t });
    },

    pausePlayback: () => set({ playing: false }),

    stopPlayback: () => set({ playing: false, previewTime: null }),

    tick: (dtMs) => {
      const { play, playing, previewTime, loop, speed } = get();
      if (!play || !playing || previewTime === null) return;
      const total = totalDuration(play);
      let t = previewTime + dtMs * speed;
      if (t >= total) {
        if (loop) {
          t = t % total;
        } else {
          set({ playing: false, previewTime: null, frameIndex: play.frames.length - 1 });
          return;
        }
      }
      set({ previewTime: t });
    },

    setPreviewTime: (t) => set({ previewTime: t, playing: t === null ? false : get().playing }),
    toggleLoop: () => set({ loop: !get().loop }),
    setSpeed: (s) => set({ speed: s }),
  };
});
