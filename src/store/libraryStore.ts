import { create } from 'zustand';
import type { Play, Team } from '../models/types';
import { clonePlay, uid } from '../models/play';
import { deletePlay, deleteTeam, listPlays, listTeams, savePlay, saveTeam } from '../storage/db';

/** which playbook the library shows: every play, one team's, or plays without a team */
export type TeamFilter = 'all' | 'unassigned' | string;

interface LibraryState {
  plays: Play[];
  teams: Team[];
  selectedTeam: TeamFilter;
  loaded: boolean;
  refresh: () => Promise<void>;
  selectTeam: (filter: TeamFilter) => void;
  save: (play: Play) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (play: Play) => Promise<Play>;
  createTeam: (name: string, color?: string) => Promise<Team>;
  renameTeam: (id: string, name: string) => Promise<void>;
  setTeamColor: (id: string, color: string) => Promise<void>;
  removeTeam: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  plays: [],
  teams: [],
  selectedTeam: 'all',
  loaded: false,

  refresh: async () => {
    const [plays, teams] = await Promise.all([listPlays(), listTeams()]);
    set({ plays, teams, loaded: true });
  },

  selectTeam: (filter) => set({ selectedTeam: filter }),

  save: async (play) => {
    await savePlay(play);
    await get().refresh();
  },

  remove: async (id) => {
    await deletePlay(id);
    await get().refresh();
  },

  duplicate: async (play) => {
    const copy = clonePlay(play);
    copy.id = uid();
    copy.name = `${play.name} (copy)`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    await savePlay(copy);
    await get().refresh();
    return copy;
  },

  createTeam: async (name, color) => {
    const team: Team = { id: uid(), name, color, createdAt: Date.now() };
    await saveTeam(team);
    await get().refresh();
    return team;
  },

  renameTeam: async (id, name) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;
    await saveTeam({ ...team, name });
    await get().refresh();
  },

  setTeamColor: async (id, color) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;
    await saveTeam({ ...team, color });
    await get().refresh();
  },

  removeTeam: async (id) => {
    await deleteTeam(id);
    if (get().selectedTeam === id) set({ selectedTeam: 'all' });
    await get().refresh();
  },
}));
