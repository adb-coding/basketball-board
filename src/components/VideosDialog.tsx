import { useEffect, useRef, useState } from 'react';
import type { PlayVideo } from '../models/types';
import { addVideo, deleteVideo, listVideos } from '../storage/db';
import { TrashIcon } from './icons';

interface Props {
  open: boolean;
  playId: string;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1000)} kB`;
}

/** example videos attached to the current play (stored locally, not part of JSON export) */
export function VideosDialog({ open, playId, onClose, onCountChange }: Props) {
  const [videos, setVideos] = useState<PlayVideo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void listVideos(playId).then((list) => {
      if (cancelled) return;
      setVideos(list);
      setUrls(Object.fromEntries(list.map((v) => [v.id, URL.createObjectURL(v.blob)])));
    });
    return () => {
      cancelled = true;
      setUrls((current) => {
        for (const url of Object.values(current)) URL.revokeObjectURL(url);
        return {};
      });
    };
  }, [open, playId]);

  if (!open) return null;

  const add = async (file: File) => {
    setBusy(true);
    try {
      const video = await addVideo(playId, file);
      setVideos((v) => [...v, video]);
      setUrls((u) => ({ ...u, [video.id]: URL.createObjectURL(video.blob) }));
      onCountChange?.(videos.length + 1);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (video: PlayVideo) => {
    await deleteVideo(video.id);
    URL.revokeObjectURL(urls[video.id]);
    setVideos((v) => v.filter((x) => x.id !== video.id));
    onCountChange?.(videos.length - 1);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Example videos</h2>
          <p className="muted">
            Attach game or practice footage of this play. Videos are stored on this device only.
          </p>
        </header>

        {videos.length === 0 && (
          <div className="empty-block">
            <p>No videos yet.</p>
            <p className="muted">Add a clip that shows how this play looks when it is run well.</p>
          </div>
        )}

        <div className="video-list">
          {videos.map((v) => (
            <div key={v.id} className="video-item">
              <video controls preload="metadata" src={urls[v.id]} />
              <div className="video-meta">
                <span className="video-name" title={v.name}>{v.name}</span>
                <span className="muted small">{formatSize(v.size)}</span>
                <button className="icon-btn" title="Remove video" onClick={() => void remove(v)}>
                  <TrashIcon size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void add(f);
            e.target.value = '';
          }}
        />
        <div className="modal-actions">
          <button className="primary-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Adding…' : 'Add video'}
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
