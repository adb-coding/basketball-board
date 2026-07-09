import { useEffect, useMemo, useRef, useState } from 'react';
import type { CourtType, Play, Team } from '../models/types';
import { useLibraryStore, type TeamFilter } from '../store/libraryStore';
import { useUiStore } from '../store/uiStore';
import { downloadPlayJson, parsePlayFile, savePlay } from '../storage/db';
import { PlayThumbnail } from './PlayThumbnail';
import { PlusIcon, ThemeIcon, TrashIcon } from './icons';
import logoUrl from '../assets/logo.png';

const COURT_LABEL: Record<CourtType, string> = {
  'half-3x3': '3×3 · half',
  'half-5v5': '5v5 · half',
  'full-5v5': '5v5 · full',
};

const NEW_PLAY_OPTIONS: { type: CourtType; label: string; hint: string }[] = [
  { type: 'half-3x3', label: '3×3 half court', hint: '3 attackers, 3 defenders' },
  { type: 'half-5v5', label: '5v5 half court', hint: 'set plays, BLOB/SLOB' },
  { type: 'full-5v5', label: '5v5 full court', hint: 'press, transition' },
];

interface Props {
  onOpen: (play: Play) => void;
  onNew: (courtType: CourtType, teamId?: string) => void;
}

function TeamRow({ team, count }: { team: Team; count: number }) {
  const { selectedTeam, selectTeam, renameTeam, setTeamColor, removeTeam } = useLibraryStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);

  if (editing) {
    return (
      <div className="team-row editing">
        <input
          type="color"
          value={team.color ?? '#f06511'}
          title="Team color"
          onChange={(e) => void setTeamColor(team.id, e.target.value)}
        />
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          onBlur={() => {
            if (name.trim()) void renameTeam(team.id, name.trim());
            setEditing(false);
          }}
        />
        <button
          className="icon-btn"
          title={`Delete team (its plays are kept)`}
          onClick={() => {
            if (confirm(`Delete team "${team.name}"? Its plays are kept and become unassigned.`)) {
              void removeTeam(team.id);
            }
          }}
        >
          <TrashIcon size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      className={`nav-item ${selectedTeam === team.id ? 'active' : ''}`}
      onClick={() => selectTeam(team.id)}
      onDoubleClick={() => setEditing(true)}
    >
      <span className="team-dot" style={{ background: team.color ?? 'var(--accent)' }} />
      <span className="nav-label">{team.name}</span>
      <span className="nav-count">{count}</span>
      <span
        className="nav-edit"
        title="Rename or delete team"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        ✎
      </span>
    </button>
  );
}

export function LibraryPage({ onOpen, onNew }: Props) {
  const { plays, teams, selectedTeam, selectTeam, loaded, refresh, remove, duplicate, createTeam } =
    useLibraryStore();
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const countFor = (filter: TeamFilter) =>
    plays.filter((p) =>
      filter === 'all' ? true : filter === 'unassigned' ? !p.teamId : p.teamId === filter,
    ).length;

  const inTeam = plays.filter((p) =>
    selectedTeam === 'all' ? true : selectedTeam === 'unassigned' ? !p.teamId : p.teamId === selectedTeam,
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of inTeam) for (const t of p.tags) set.add(t);
    return [...set].sort();
  }, [inTeam]);

  const filtered = inTeam.filter((p) => {
    if (tag && !p.tags.includes(tag)) return false;
    const q = query.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
  });

  const heading =
    selectedTeam === 'all'
      ? 'All plays'
      : selectedTeam === 'unassigned'
        ? 'Unassigned plays'
        : (teamById.get(selectedTeam)?.name ?? 'Playbook');

  const importFile = async (file: File) => {
    try {
      const play = parsePlayFile(await file.text());
      if (selectedTeam !== 'all' && selectedTeam !== 'unassigned') play.teamId = selectedTeam;
      await savePlay(play);
      await refresh();
    } catch {
      alert('Could not import: not a valid play file.');
    }
  };

  const submitNewTeam = () => {
    const name = newTeamName.trim();
    if (name) {
      void createTeam(name).then((t) => selectTeam(t.id));
    }
    setNewTeamName('');
    setAddingTeam(false);
  };

  return (
    <div className="library-page">
      <aside className="sidebar">
        <div className="wordmark">
          <img className="wordmark-icon" src={logoUrl} alt="" />
          <span>
            Basketball<br />Board
          </span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${selectedTeam === 'all' ? 'active' : ''}`}
            onClick={() => selectTeam('all')}
          >
            <span className="nav-label">All plays</span>
            <span className="nav-count">{countFor('all')}</span>
          </button>

          <div className="nav-section">Teams</div>
          {teams.map((t) => (
            <TeamRow key={t.id} team={t} count={countFor(t.id)} />
          ))}
          {countFor('unassigned') > 0 && teams.length > 0 && (
            <button
              className={`nav-item ${selectedTeam === 'unassigned' ? 'active' : ''}`}
              onClick={() => selectTeam('unassigned')}
            >
              <span className="nav-label muted">Unassigned</span>
              <span className="nav-count">{countFor('unassigned')}</span>
            </button>
          )}

          {addingTeam ? (
            <div className="team-row editing">
              <input
                type="text"
                autoFocus
                placeholder="Team name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitNewTeam();
                  if (e.key === 'Escape') setAddingTeam(false);
                }}
                onBlur={submitNewTeam}
              />
            </div>
          ) : (
            <button className="nav-item nav-new" onClick={() => setAddingTeam(true)}>
              <PlusIcon size={14} /> New team
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => fileRef.current?.click()}>Import play</button>
          <button className="icon-btn" title="Toggle theme" onClick={toggleTheme}>
            <ThemeIcon />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = '';
          }}
        />
      </aside>

      <main className="library-main">
        <header className="library-header">
          <h1>{heading}</h1>
          <div className="spacer" />
          <input
            type="search"
            placeholder="Search plays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="menu-anchor">
            <button className="primary-btn" onClick={() => setNewMenuOpen((v) => !v)}>
              <PlusIcon size={15} /> New play
            </button>
            {newMenuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setNewMenuOpen(false)} />
                <div className="menu">
                  {NEW_PLAY_OPTIONS.map((o) => (
                    <button
                      key={o.type}
                      className="menu-item"
                      onClick={() => {
                        setNewMenuOpen(false);
                        onNew(
                          o.type,
                          selectedTeam !== 'all' && selectedTeam !== 'unassigned' ? selectedTeam : undefined,
                        );
                      }}
                    >
                      <span>{o.label}</span>
                      <span className="muted small">{o.hint}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        {allTags.length > 0 && (
          <div className="library-filter">
            {allTags.map((t) => (
              <button
                key={t}
                className={`tag-chip ${tag === t ? 'active' : ''}`}
                onClick={() => setTag(tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="library-grid">
          {filtered.map((p) => (
            <article key={p.id} className="play-card" onClick={() => onOpen(p)}>
              <div className="card-thumb">
                <PlayThumbnail play={p} teamColor={p.teamId ? teamById.get(p.teamId)?.color : undefined} />
              </div>
              <div className="card-body">
                <h3>{p.name}</h3>
                <p className="card-meta">
                  <span className="court-chip">{COURT_LABEL[p.courtType]}</span>
                  <span className="muted small">
                    {p.frames.length} frame{p.frames.length !== 1 ? 's' : ''}
                  </span>
                  {selectedTeam === 'all' && p.teamId && teamById.get(p.teamId) && (
                    <span className="muted small">· {teamById.get(p.teamId)!.name}</span>
                  )}
                </p>
                {p.tags.length > 0 && (
                  <p className="card-tags">
                    {p.tags.map((t) => (
                      <span key={t} className="tag-chip small">
                        {t}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => void duplicate(p)}>Duplicate</button>
                <button onClick={() => downloadPlayJson(p)}>JSON</button>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"?`)) void remove(p.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {loaded && filtered.length === 0 && (
            <div className="empty-block library-empty">
              <p>{plays.length === 0 ? 'Your playbook is empty.' : 'No plays match.'}</p>
              <p className="muted">
                {plays.length === 0
                  ? 'Create your first play with the “New play” button.'
                  : 'Try a different search or clear the tag filter.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
