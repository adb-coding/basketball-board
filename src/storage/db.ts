import Dexie, { type Table } from 'dexie';
import type { Play, PlayVideo, Team } from '../models/types';
import { uid } from '../models/play';

class BoardDb extends Dexie {
  plays!: Table<Play, string>;
  teams!: Table<Team, string>;
  videos!: Table<PlayVideo, string>;

  constructor() {
    super('basketball-board');
    this.version(1).stores({ plays: 'id, name, updatedAt' });
    this.version(2).stores({
      plays: 'id, name, updatedAt, teamId',
      teams: 'id, name',
      videos: 'id, playId',
    });
  }
}

export const db = new BoardDb();

export async function savePlay(play: Play): Promise<void> {
  await db.plays.put(play);
}

export async function listPlays(): Promise<Play[]> {
  return db.plays.orderBy('updatedAt').reverse().toArray();
}

export async function getPlay(id: string): Promise<Play | undefined> {
  return db.plays.get(id);
}

export async function deletePlay(id: string): Promise<void> {
  await db.plays.delete(id);
  await db.videos.where('playId').equals(id).delete();
}

// ---- teams ----

export async function listTeams(): Promise<Team[]> {
  return db.teams.orderBy('name').toArray();
}

export async function saveTeam(team: Team): Promise<void> {
  await db.teams.put(team);
}

export async function deleteTeam(id: string): Promise<void> {
  await db.teams.delete(id);
  // plays survive their team; they become unassigned
  await db.plays.where('teamId').equals(id).modify((p) => {
    delete p.teamId;
  });
}

// ---- example videos ----

export async function listVideos(playId: string): Promise<PlayVideo[]> {
  return db.videos.where('playId').equals(playId).toArray();
}

export async function addVideo(playId: string, file: File): Promise<PlayVideo> {
  const video: PlayVideo = {
    id: uid(),
    playId,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };
  await db.videos.put(video);
  return video;
}

export async function deleteVideo(id: string): Promise<void> {
  await db.videos.delete(id);
}

export async function countVideos(playId: string): Promise<number> {
  return db.videos.where('playId').equals(playId).count();
}

export function downloadPlayJson(play: Play) {
  const blob = new Blob([JSON.stringify(play, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${sanitizeFilename(play.name)}.play.json`);
}

export function parsePlayFile(text: string): Play {
  const data = JSON.parse(text) as Play;
  if (!data || !Array.isArray(data.frames) || !Array.isArray(data.players) || !data.courtType) {
    throw new Error('Not a valid play file');
  }
  // fresh id so an import never overwrites an existing play
  data.id = uid();
  data.updatedAt = Date.now();
  return data;
}

export function sanitizeFilename(name: string): string {
  return name.trim().replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '-').toLowerCase() || 'play';
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
