import type Konva from 'konva';
import GIF from 'gif.js';
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import { jsPDF } from 'jspdf';
import type { Play } from '../models/types';
import { totalDuration } from '../animation/playback';
import { useEditorStore } from '../store/editorStore';
import { sanitizeFilename, triggerDownload } from '../storage/db';

export interface ExportContext {
  stage: Konva.Stage;
  play: Play;
  onProgress: (fraction: number) => void;
}

const HOLD_START_MS = 500;
const HOLD_END_MS = 900;

function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** capture the stage at a given playback time */
async function captureAt(stage: Konva.Stage, timeMs: number | null, pixelRatio: number) {
  useEditorStore.getState().setPreviewTime(timeMs);
  await nextPaint();
  return stage.toCanvas({ pixelRatio });
}

export async function exportGif(ctx: ExportContext, width = 720, fps = 15): Promise<void> {
  const { stage, play, onProgress } = ctx;
  const total = totalDuration(play);
  const pixelRatio = width / stage.width();
  const stepMs = 1000 / fps;

  const gif = new GIF({
    workers: 2,
    quality: 8,
    width: Math.round(stage.width() * pixelRatio),
    height: Math.round(stage.height() * pixelRatio),
    workerScript: gifWorkerUrl,
  });

  try {
    // opening hold on the starting formation
    gif.addFrame(await captureAt(stage, 0, pixelRatio), { delay: HOLD_START_MS, copy: true });
    for (let t = stepMs; t < total; t += stepMs) {
      gif.addFrame(await captureAt(stage, t, pixelRatio), { delay: stepMs, copy: true });
      onProgress((t / total) * 0.6);
    }
    // closing hold on the final formation
    gif.addFrame(await captureAt(stage, total, pixelRatio), { delay: HOLD_END_MS, copy: true });
  } finally {
    useEditorStore.getState().setPreviewTime(null);
  }

  const blob = await new Promise<Blob>((resolve) => {
    gif.on('progress', (p: number) => onProgress(0.6 + p * 0.4));
    gif.on('finished', resolve);
    gif.render();
  });
  triggerDownload(blob, `${sanitizeFilename(play.name)}.gif`);
}

function pickVideoMime(): string {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

export async function exportVideo(ctx: ExportContext, width = 1280): Promise<void> {
  const { stage, play, onProgress } = ctx;
  const total = totalDuration(play);
  const pixelRatio = width / stage.width();
  const w = Math.round(stage.width() * pixelRatio);
  const h = Math.round(stage.height() * pixelRatio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c2d = canvas.getContext('2d')!;
  const stream = canvas.captureStream(30);
  const mime = pickVideoMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const store = useEditorStore.getState;
  const draw = () => c2d.drawImage(stage.toCanvas({ pixelRatio }), 0, 0, w, h);

  try {
    store().setPreviewTime(0);
    await nextPaint();
    draw();
    recorder.start(200);

    // recording happens in real time: keep painting during holds and playback
    const holdStart = performance.now();
    while (performance.now() - holdStart < HOLD_START_MS) {
      draw();
      await nextPaint();
    }
    const t0 = performance.now();
    for (;;) {
      const t = performance.now() - t0;
      if (t >= total) break;
      store().setPreviewTime(t);
      await nextPaint();
      draw();
      onProgress(Math.min(1, t / total));
    }
    store().setPreviewTime(total);
    await nextPaint();
    const holdEnd = performance.now();
    while (performance.now() - holdEnd < HOLD_END_MS) {
      draw();
      await nextPaint();
    }
    recorder.stop();
    await stopped;
    await sleep(50);
  } finally {
    store().setPreviewTime(null);
  }

  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  triggerDownload(new Blob(chunks, { type: mime }), `${sanitizeFilename(play.name)}.${ext}`);
}

export async function exportPng(ctx: ExportContext, width = 1600): Promise<void> {
  const { stage, play } = ctx;
  const pixelRatio = width / stage.width();
  await nextPaint();
  const canvas = stage.toCanvas({ pixelRatio });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) {
    const frame = useEditorStore.getState().frameIndex + 1;
    triggerDownload(blob, `${sanitizeFilename(play.name)}-frame-${frame}.png`);
  }
}

export async function exportPdf(ctx: ExportContext): Promise<void> {
  const { stage, play, onProgress } = ctx;
  const store = useEditorStore.getState;
  const prevIndex = store().frameIndex;
  store().stopPlayback();

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;

  try {
    for (let i = 0; i < play.frames.length; i++) {
      store().setFrameIndex(i);
      await nextPaint();
      const canvas = stage.toCanvas({ pixelRatio: 2 });
      const img = canvas.toDataURL('image/jpeg', 0.92);

      if (i > 0) pdf.addPage();
      pdf.setFontSize(16);
      pdf.text(`${play.name} — ${i + 1}/${play.frames.length}`, margin, margin);
      const note = play.frames[i].note;
      pdf.setFontSize(11);
      if (note) pdf.text(note, margin, margin + 7, { maxWidth: pageW - margin * 2 });

      const top = margin + (note ? 12 : 5);
      const availW = pageW - margin * 2;
      const availH = pageH - top - margin;
      const ratio = Math.min(availW / canvas.width, availH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      pdf.addImage(img, 'JPEG', (pageW - imgW) / 2, top, imgW, imgH);
      onProgress((i + 1) / play.frames.length);
    }
  } finally {
    store().setFrameIndex(prevIndex);
  }

  triggerDownload(pdf.output('blob'), `${sanitizeFilename(play.name)}-playbook.pdf`);
}
