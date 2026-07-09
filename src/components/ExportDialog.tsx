import { useState, type RefObject } from 'react';
import type Konva from 'konva';
import { useEditorStore } from '../store/editorStore';
import { exportGif, exportPdf, exportPng, exportVideo } from '../export/exporters';
import { downloadPlayJson } from '../storage/db';

interface Props {
  open: boolean;
  onClose: () => void;
  stageRef: RefObject<Konva.Stage>;
}

type Job = 'gif' | 'video' | 'png' | 'pdf' | null;

export function ExportDialog({ open, onClose, stageRef }: Props) {
  const play = useEditorStore((s) => s.play);
  const [job, setJob] = useState<Job>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gifWidth, setGifWidth] = useState(720);

  if (!open || !play) return null;
  const canAnimate = play.frames.length > 1;

  const run = async (kind: Exclude<Job, null>, fn: () => Promise<void>) => {
    if (job) return;
    setJob(kind);
    setProgress(0);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setJob(null);
    }
  };

  const ctx = () => ({ stage: stageRef.current!, play, onProgress: setProgress });

  return (
    <div className="modal-backdrop" onClick={() => !job && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export “{play.name}”</h2>

        <div className="export-row">
          <div>
            <strong>Animated GIF</strong>
            <p className="muted">Universal share format (chat, WhatsApp…)</p>
          </div>
          <select value={gifWidth} disabled={!!job} onChange={(e) => setGifWidth(Number(e.target.value))}>
            <option value={480}>480 px</option>
            <option value={720}>720 px</option>
            <option value={960}>960 px</option>
          </select>
          <button disabled={!!job || !canAnimate} onClick={() => run('gif', () => exportGif(ctx(), gifWidth))}>
            Export
          </button>
        </div>

        <div className="export-row">
          <div>
            <strong>Video (MP4/WebM)</strong>
            <p className="muted">Recorded in real time at 1280 px</p>
          </div>
          <button disabled={!!job || !canAnimate} onClick={() => run('video', () => exportVideo(ctx()))}>
            Export
          </button>
        </div>

        <div className="export-row">
          <div>
            <strong>PNG image</strong>
            <p className="muted">Current frame as a picture</p>
          </div>
          <button disabled={!!job} onClick={() => run('png', () => exportPng(ctx()))}>
            Export
          </button>
        </div>

        <div className="export-row">
          <div>
            <strong>PDF playbook</strong>
            <p className="muted">One page per frame, with notes</p>
          </div>
          <button disabled={!!job} onClick={() => run('pdf', () => exportPdf(ctx()))}>
            Export
          </button>
        </div>

        <div className="export-row">
          <div>
            <strong>Play file (JSON)</strong>
            <p className="muted">Import it in another Basketball Board</p>
          </div>
          <button disabled={!!job} onClick={() => downloadPlayJson(play)}>
            Export
          </button>
        </div>

        {!canAnimate && <p className="muted">Add at least 2 frames to export animations.</p>}
        {job && (
          <div className="progress">
            <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            <span>Exporting {job}… {Math.round(progress * 100)}%</span>
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button disabled={!!job} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
