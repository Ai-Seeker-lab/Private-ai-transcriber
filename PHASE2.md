# Tannscribe Phase 2: Stability, Performance, and Testing

## 1. Technical report: existing mechanisms

### Model caching (before)
- transformers.js 4.3.2 with `env.useBrowserCache = true` and `env.cacheKey = "transformers-cache"`.
- Uses the browser **Cache API** (`caches.open`), not IndexedDB. transformers.js 4.3.2 has no IndexedDB support (`useIndexedDB` does not exist in this version), so a custom IndexedDB cache would have been a reimplementation of a supported extension point. The right move was to keep the Cache API and add status, size, clear, and quota handling.
- The worker caches the loaded pipeline in module scope, so repeat runs in the same tab skip both the download and re-instantiation.

### Cancellation (before)
- `cancel` set a module-level `cancelled` flag; the loop checked it at the top of each 30 s window, but the in-flight `pipe()` call still ran to completion. No session identity, so a late segment from a cancelled run could land in a later run. UI showed "Stopping".

### Performance (before)
- Whole-file decode via `AudioContext.decodeAudioData` then `OfflineAudioContext` resample to 16 kHz.
- `peaksFromPcm` sampled every 8th sample.
- No device-memory awareness.

## 2. Changes implemented

### Persistent caching (Cache API, no custom store)
- `inspectModelCache()` opens all caches, finds the one holding whisper/onnx files, counts entries and sums bytes.
- `clearModelCache()` deletes transformer/whisper caches.
- UI: `#cacheStatus` line (ready/empty, file count, size) and `#clearCache` button.
- Cache status refreshes on load and after each run.
- Quota errors during model load surface as a clear message ("Storage quota exceeded. Clear the cached model and retry.").

### Cancellation
- Worker sets `currentSession` per run and stamps every posted message with `sessionId`; main ignores stale-session messages, so a late segment from a cancelled run cannot corrupt a new run.
- Cancelled check now also runs immediately after `pipe()` resolves, so a window that finishes right after cancel exits instead of emitting.
- UI shows "Cancelling…" and disables the run button until the run settles; re-enabled in `finishRun`/`failRun`.
- `stopRun` sends `sessionId` with the cancel message.

### Low-end device optimization
- Detects `navigator.deviceMemory <= 4` or `hardwareConcurrency <= 2` and auto-selects Whisper tiny with an explanatory note.
- No aggressive GPU probing beyond the existing WebGPU presence check.

### Audio processing
- Empty/corrupted decode errors are now specific.
- Stage labels distinguish "Extracting audio from video" vs "Reading audio".
- Memory hygiene already in place (pcm released, object URLs revoked); unchanged.

### User feedback stages
- Reading the file → Extracting audio (from video) → Downloading the model (with %) → Listening X of Y (with elapsed seconds) → Finished / Cancelled / Failed.

### Automated testing
- Extracted pure helpers into `src/format.ts` (`pad`, `clock`, `stamp`, `size`, `sanitizeFilename`, `toSrtText`, `toVttText`) so they are unit-testable.
- Vitest 2.1.9 + jsdom: `tests/unit/format.test.ts` (17 tests).
- Playwright 1.49.1 with system Chrome: `tests/e2e/smoke.spec.ts` (7 scenarios × 2 viewports = 14 tests): page load, no horizontal overflow, search filter, editable cell, TXT/SRT/VTT exports.
- `npm test` and `npm run test:e2e` scripts added.

## 3. Files modified
- `src/main.ts`, `src/worker.ts`, `src/types.ts`, `src/format.ts` (new), `index.html`, `page.css`
- `tests/unit/format.test.ts`, `tests/e2e/smoke.spec.ts` (new)
- `vitest.config.ts`, `playwright.config.ts` (new)
- `package.json`, `.gitignore`

## 4. Build and test results
- `npm run build`: 0 TypeScript errors, 0 Vite errors.
- `npm test` (Vitest): 17/17 passed.
- `npm run test:e2e` (Playwright): 14/14 passed (desktop + mobile).
- `sloplint`: 0 FAIL, 0 REFLEX, 0 WARN.
- Live deploy verified: new bundle served, cache status line and clear button present.

## 5. Remaining limitations
- No IndexedDB model cache (transformers.js 4.3.2 has no support); Cache API is used, with status/size/clear/quota handling.
- Whole-file decode remains; guarded by the 1 GB limit.
- Cancel waits for the current 30 s window.
- Timestamps are not editable (text only).
- Transcription worker is not unit-tested (requires the model); covered by E2E only at UI level.
- No low-memory simulation tested.

## 6. Recommended next improvements
1. Add a Web Worker-based audio decoder fallback and chunked decoding for files above ~200 MB.
2. Expose a `cancel()` that aborts the in-flight `pipe()` via an AbortController once transformers.js supports it, instead of waiting for the window.
3. Add component-level tests for `loadFile` validation paths using a mocked `AudioContext`.
