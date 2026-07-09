# Basketball Board — Play Designer

Web app to draw, animate and share basketball plays. Supports 3×3 (half court) and 5v5 (half + full court, FIBA dimensions). Everything runs client-side and offline — plays are stored in the browser (IndexedDB), so the app is ready to be wrapped with Capacitor for Android later.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (court geometry, playback math)
npm run build      # typecheck + production build in dist/
```

## Features

- **Courts**: FIBA half court (3×3 and 5v5) and full court, with accurate lines (key, free-throw circle, three-point line with corner segments, no-charge arc, center circle).
- **Players & ball**: draggable tokens — offense as numbered circles, defense as X marks; drop the ball onto a player to assign possession. Rename/recolor a player by selecting it.
- **Drawing tools** with standard coaching notation:
  - Cut — solid arrow
  - Pass — dashed arrow
  - Dribble/drive — zigzag arrow
  - Screen — line ending in a perpendicular bar
  - Shot — double-headed arrow
  - Handoff — line with an open circle
  - Freehand pen + eraser
  Start a line on a token to attach it to that player.
- **Animation**: frame-based. Draw movement paths, hit **+** — players are carried to the end of their paths in the new frame; a pass hands the ball to the receiver. Playback tweens along the drawn paths with play/pause/stop, scrubbing, loop and 0.5×–2× speed. Per-frame notes are shown as an overlay during playback, and each transition has its own duration.
- **Exports**: animated GIF (480/720/960 px), video (MP4 where the browser supports it, WebM otherwise), PNG of the current frame, multi-page PDF playbook (one frame per page with notes), and a JSON play file for sharing/importing.
- **Teams & playbooks**: create teams in the library sidebar (double-click or ✎ to rename, pick a team color — it becomes the offense token color). Each team has its own playbook; plays can also stay unassigned. Switch between a playbook's plays directly from the editor top bar.
- **Roster control**: the Roster panel adds or removes any attacker or defender (0–5 per side) across every frame — including a fully empty court via "Clear court".
- **Example videos**: attach video files to a play (game/practice footage), watch them inline, stored locally in IndexedDB. Not part of the JSON export.
- **Library**: autosaved plays with mini-court thumbnails, search, tags, duplicate, delete, JSON import/export.
- **Extras**: undo/redo (Ctrl+Z / Ctrl+Shift+Z), tool hotkeys (V C D P S T H F E), Space to play, dark/light theme, touch-friendly (pointer events, responsive layout), PWA manifest.

## Architecture

| Piece | Where |
|---|---|
| Data model (Play/Frame/Action/Player) | `src/models/types.ts` |
| FIBA court geometry + canvas drawing | `src/court/geometry.ts`, `src/court/CourtLayer.tsx` |
| Editor state, undo/redo, autosave | `src/store/editorStore.ts` (zustand) |
| Playback engine (arc-length path tweening) | `src/animation/playback.ts` |
| Marker rendering (notation shapes) | `src/components/ActionShapes.tsx` |
| Canvas stage + input handling | `src/components/CourtStage.tsx` (react-konva) |
| Exports (GIF/video/PNG/PDF) | `src/export/exporters.ts` (gif.js, MediaRecorder, jsPDF) |
| Persistence | `src/storage/db.ts` (Dexie/IndexedDB) |

Coordinates are stored in **court meters** and scaled at render time, so plays are resolution-independent and export at any size.

## Android port (later)

The app has no server dependency and uses pointer events throughout. Porting path:

```bash
npm run build
npx cap init && npx cap add android
npx cap sync && npx cap open android
```
