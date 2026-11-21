# Tannscribe Phase 4: Professional Subtitle Editor

## Architecture changes
- Added a subtitle overlay element over the video player, driven by `updateSubtitleOverlay(time)` called from `paintPlayhead`.
- Added waveform segment overlays (`.wave__seg`) positioned by start/duration, clickable to seek.
- Added editable timestamps via double-click on the time button, with validation (start < end, non-negative, no overlap with neighbors).
- Added playback speed control (0.5x–2x) applied to the video element.
- Added a collapsible subtitle styling panel (size, color, background, opacity, alignment, position) applied to the overlay only (preview), not exports.
- Added undo/redo history (600 ms debounced snapshots, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y).

## Files modified
- `index.html`, `page.css`, `tokens.css`, `src/main.ts`
- `tests/e2e/smoke.spec.ts`

## Features implemented
- Video preview with subtitle overlay, speed control, synchronized active-segment highlighting and auto-scroll.
- Clicking a transcript segment seeks the video (existing `.tc` button).
- Editable timestamps with validation and immediate preview update.
- Waveform timeline with subtitle segment ranges, clickable.
- Subtitle styling preview (does not alter exported output).
- TXT/SRT/VTT exports use the latest edited text and timestamps.

## Tests and results
- `npm run build`: 0 TS errors, 0 Vite errors.
- `npm test`: 17/17 passed.
- `npm run test:e2e`: 22/22 passed (desktop + mobile), including the new timestamp/speed/overlay tests.
- `sloplint`: 0 FAIL / 0 REFLEX / 0 WARN.
- Live deploy verified.

## Performance considerations
- Waveform segments are re-rendered only on segment add / load.
- Subtitle overlay updates on `timeupdate` (already firing for the playhead).
- No duplicate audio decoding; `state.pcm` released after decoding.
- Undo history stores text arrays only, not DOM.

## Known limitations
- Timestamp editing is inline (double-click); no dedicated column.
- Waveform segment boundaries are not draggable (click-to-seek only).
- Styling is preview-only; exports are plain text.
- No video rendering or subtitle burning.
- Undo/redo history is in-memory and resets on reload.
- Mobile editing of timestamps is functional but cramped.
