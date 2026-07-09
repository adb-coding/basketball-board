import type { Side } from '../models/types';
import { useEditorStore } from '../store/editorStore';
import { PlusIcon, TrashIcon } from './icons';

/** on-court roster editor: add or remove any offensive player or defender */
export function RosterPanel({ onClose }: { onClose: () => void }) {
  const play = useEditorStore((s) => s.play);
  if (!play) return null;
  const s = useEditorStore.getState;

  const side = (team: Side, title: string) => {
    const players = play.players.filter((p) => p.team === team);
    return (
      <div className="roster-side">
        <div className="roster-side-header">
          <h3>{title}</h3>
          <span className="muted small">{players.length}/5</span>
        </div>
        {players.map((p) => (
          <div key={p.id} className="roster-row">
            <span className={`roster-dot ${team}`} style={p.color ? { background: p.color } : undefined} />
            <input
              type="text"
              maxLength={3}
              value={p.label}
              onChange={(e) => s().updatePlayer(p.id, { label: e.target.value })}
            />
            <button
              className="icon-btn"
              title={`Remove ${p.label} from every frame`}
              onClick={() => s().removePlayer(p.id)}
            >
              <TrashIcon size={14} />
            </button>
          </div>
        ))}
        <button
          className="roster-add"
          disabled={players.length >= 5}
          onClick={() => s().addPlayer(team)}
        >
          <PlusIcon size={14} /> Add {team === 'offense' ? 'player' : 'defender'}
        </button>
      </div>
    );
  };

  return (
    <div className="roster-panel">
      <div className="roster-columns">
        {side('offense', 'Offense')}
        {side('defense', 'Defense')}
      </div>
      <div className="roster-footer">
        <button
          className="danger"
          disabled={play.players.length === 0}
          onClick={() => s().clearCourt()}
        >
          Clear court
        </button>
        <button onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
