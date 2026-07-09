import { useEditorStore } from '../store/editorStore';
import { totalDuration } from '../animation/playback';
import { LoopIcon, PauseIcon, PlayIcon, PlusIcon, StopIcon, TrashIcon } from './icons';

const SPEEDS = [0.5, 0.75, 1, 1.5, 2];

export function Timeline() {
  const play = useEditorStore((s) => s.play);
  const frameIndex = useEditorStore((s) => s.frameIndex);
  const playing = useEditorStore((s) => s.playing);
  const previewTime = useEditorStore((s) => s.previewTime);
  const loop = useEditorStore((s) => s.loop);
  const speed = useEditorStore((s) => s.speed);
  const s = useEditorStore.getState;

  if (!play) return null;
  const frames = play.frames;
  const total = totalDuration(play);
  const canAnimate = frames.length > 1;
  const frame = frames[frameIndex];

  return (
    <div className="timeline">
      <div className="timeline-row transport-row">
        <button
          className="icon-btn"
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          disabled={!canAnimate}
          onClick={() => (playing ? s().pausePlayback() : s().startPlayback())}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className="icon-btn"
          title="Stop"
          disabled={previewTime === null}
          onClick={() => s().stopPlayback()}
        >
          <StopIcon />
        </button>
        <button
          className={`icon-btn ${loop ? 'active' : ''}`}
          title="Loop"
          onClick={() => s().toggleLoop()}
        >
          <LoopIcon />
        </button>
        <select
          className="speed-select"
          title="Playback speed"
          value={speed}
          onChange={(e) => s().setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <input
          className="scrub"
          type="range"
          min={0}
          max={Math.max(1, total)}
          step={16}
          disabled={!canAnimate}
          value={previewTime ?? 0}
          onChange={(e) => {
            s().pausePlayback();
            s().setPreviewTime(Number(e.target.value));
          }}
        />
        <span className="time-label">
          {((previewTime ?? 0) / 1000).toFixed(1)}s / {(total / 1000).toFixed(1)}s
        </span>
      </div>

      <div className="timeline-row frames-row">
        {frames.map((f, i) => (
          <div key={f.id} className={`frame-chip ${i === frameIndex && previewTime === null ? 'active' : ''}`}>
            <button className="frame-chip-main" onClick={() => s().setFrameIndex(i)}>
              {i + 1}
            </button>
            {i < frames.length - 1 && (
              <input
                className="frame-dur"
                type="number"
                min={0.2}
                max={10}
                step={0.1}
                title="Transition duration (seconds)"
                value={f.durationMs / 1000}
                onChange={(e) => {
                  s().setFrameIndex(i);
                  s().setFrameDuration(Number(e.target.value) * 1000);
                }}
              />
            )}
            {frames.length > 1 && (
              <button className="frame-del" title="Delete frame" onClick={() => s().deleteFrame(i)}>
                <TrashIcon size={12} />
              </button>
            )}
          </div>
        ))}
        <button className="icon-btn add-frame" title="Add frame (players move to the end of their drawn paths)" onClick={() => s().addFrame()}>
          <PlusIcon />
        </button>
      </div>

      <div className="timeline-row note-row">
        <input
          className="frame-note"
          type="text"
          placeholder={`Frame ${frameIndex + 1} note (shown during playback)…`}
          value={frame.note ?? ''}
          onChange={(e) => s().setFrameNote(e.target.value)}
        />
      </div>
    </div>
  );
}
