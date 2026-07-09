import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { useEditorStore } from '../store/editorStore';
import { useLibraryStore } from '../store/libraryStore';
import { useUiStore } from '../store/uiStore';
import { boardColors } from '../court/CourtLayer';
import { countVideos } from '../storage/db';
import { CourtStage } from './CourtStage';
import { Toolbar, TOOL_HOTKEYS } from './Toolbar';
import { Timeline } from './Timeline';
import { ExportDialog } from './ExportDialog';
import { VideosDialog } from './VideosDialog';
import { RosterPanel } from './RosterPanel';
import { BackIcon, ExportIcon, RedoIcon, ThemeIcon, UndoIcon } from './icons';

const COURT_LABEL: Record<string, string> = {
  'half-3x3': '3×3 · half court',
  'half-5v5': '5v5 · half court',
  'full-5v5': '5v5 · full court',
};

function usePlaybackLoop() {
  const playing = useEditorStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      useEditorStore.getState().tick(now - last);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}

function useEditorHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      const s = useEditorStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        s.redo();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        s.playing ? s.pausePlayback() : s.startPlayback();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.selectedActionId) s.deleteAction(s.selectedActionId);
        return;
      }
      if (e.key === 'Escape') {
        s.cancelDraft();
        s.selectAction(null);
        s.selectPlayer(null);
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = TOOL_HOTKEYS[e.key.toLowerCase()];
        if (tool) s.setTool(tool);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function PlayerPanel() {
  const play = useEditorStore((s) => s.play);
  const selectedPlayerId = useEditorStore((s) => s.selectedPlayerId);
  const player = play?.players.find((p) => p.id === selectedPlayerId);
  if (!play || !player) return null;
  const s = useEditorStore.getState;
  return (
    <div className="player-panel">
      <span className="muted small">{player.team === 'offense' ? 'Offense' : 'Defense'}</span>
      <input
        type="text"
        maxLength={3}
        value={player.label}
        onChange={(e) => s().updatePlayer(player.id, { label: e.target.value })}
      />
      <input
        type="color"
        title="Token color"
        value={player.color ?? (player.team === 'offense' ? '#f06511' : '#4ea8de')}
        onChange={(e) => s().updatePlayer(player.id, { color: e.target.value })}
      />
      <button className="icon-btn" title="Remove from every frame" onClick={() => s().removePlayer(player.id)}>
        ✕
      </button>
    </div>
  );
}

export function EditorPage({ onBack }: { onBack: () => void }) {
  const stageRef = useRef<Konva.Stage>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [videosOpen, setVideosOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const play = useEditorStore((s) => s.play);
  const previewTime = useEditorStore((s) => s.previewTime);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const teams = useLibraryStore((s) => s.teams);
  const plays = useLibraryStore((s) => s.plays);
  const refreshLibrary = useLibraryStore((s) => s.refresh);

  usePlaybackLoop();
  useEditorHotkeys();

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (play?.id) void countVideos(play.id).then(setVideoCount);
  }, [play?.id]);

  if (!play) return null;
  const s = useEditorStore.getState;

  const team = teams.find((t) => t.id === play.teamId);
  const colors = {
    ...boardColors(theme),
    ...(team?.color ? { offense: team.color } : {}),
  };

  // plays in the same playbook, for quick switching
  const playbook = plays.filter((p) => (play.teamId ? p.teamId === play.teamId : !p.teamId));

  const noteFrame =
    previewTime !== null
      ? play.frames.find((_, i) => {
          let t = 0;
          for (let j = 0; j < i; j++) t += play.frames[j].durationMs;
          return previewTime >= t && previewTime < t + play.frames[i].durationMs;
        })
      : null;

  return (
    <div className="editor-page">
      <header className="topbar">
        <button className="icon-btn" title="Back to library" onClick={onBack}>
          <BackIcon />
        </button>
        <input
          className="play-name"
          type="text"
          value={play.name}
          onChange={(e) => s().setPlayName(e.target.value)}
        />
        {playbook.length > 1 && (
          <select
            className="play-switcher"
            title="Open another play from this playbook"
            value={play.id}
            onChange={(e) => {
              const target = plays.find((p) => p.id === e.target.value);
              if (target) s().loadPlay(target);
            }}
          >
            {playbook.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <div className="spacer" />
        <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={past.length === 0} onClick={() => s().undo()}>
          <UndoIcon />
        </button>
        <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={future.length === 0} onClick={() => s().redo()}>
          <RedoIcon />
        </button>
        <span className="divider" />
        <button className="icon-btn hide-narrow" title="Toggle theme" onClick={toggleTheme}>
          <ThemeIcon />
        </button>
        <button className="primary-btn" title="Export" onClick={() => setExportOpen(true)}>
          <ExportIcon size={15} />
          <span className="btn-label">Export</span>
        </button>
      </header>

      <div className="metabar">
        <span className="court-chip">{COURT_LABEL[play.courtType]}</span>
        <label className="meta-field">
          Playbook
          <select
            value={play.teamId ?? ''}
            onChange={(e) => s().setTeamId(e.target.value || undefined)}
          >
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <input
          key={play.id}
          className="tags-input"
          type="text"
          placeholder="Tags, comma separated"
          defaultValue={play.tags.join(', ')}
          onBlur={(e) =>
            s().setPlayTags(
              e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            )
          }
        />
        <div className="spacer" />
        <button className={`ghost-btn ${rosterOpen ? 'active' : ''}`} onClick={() => setRosterOpen((v) => !v)}>
          Roster
        </button>
        <button className="ghost-btn" onClick={() => setVideosOpen(true)}>
          Videos{videoCount > 0 && <span className="badge">{videoCount}</span>}
        </button>
      </div>

      <div className="editor-body">
        <Toolbar />
        <div className="stage-wrap">
          <CourtStage stageRef={stageRef} colors={colors} />
          {noteFrame?.note && <div className="note-overlay">{noteFrame.note}</div>}
          <PlayerPanel />
          {rosterOpen && <RosterPanel onClose={() => setRosterOpen(false)} />}
        </div>
      </div>

      <Timeline />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} stageRef={stageRef} />
      <VideosDialog
        open={videosOpen}
        playId={play.id}
        onClose={() => setVideosOpen(false)}
        onCountChange={setVideoCount}
      />
    </div>
  );
}
