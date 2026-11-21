# Tannscribe: Audit Report

Date: 2026-11-21
Scope: full codebase under `tannscribe/` (Vite + TypeScript, plain HTML/CSS, no framework).

## 1. Architecture

- **Frontend**: plain HTML/CSS/JS served by Vite. Entry `src/main.ts`, worker `src/worker.ts`.
- **Transcription engine**: `@huggingface/transformers` 4.3.2, loaded at runtime from jsDelivr (unpkg fallback), running `automatic-speech-recognition` with `Xenova/whisper-tiny` (q4 on WebGPU, q8 on WASM) or `Xenova/whisper-base`.
- **Audio pipeline**: `AudioContext.decodeAudioData` on the whole file, then `OfflineAudioContext` resamples to 16 kHz mono `Float32Array`, transferred to the worker.
- **Worker**: module worker. Registers its `message` listener synchronously; loads the library lazily. Transcribes in 30 s windows with a 5 s stride overlap, deduped via `emittedEnd`.
- **State**: in-memory `state` object plus a `rows` array. Demo data in `src/data.ts` (real waveform bars, 98 languages, 8 transcript lines).
- **Storage**: Gemini key in `localStorage`. Model cached by the browser (Cache API via transformers.js `useBrowserCache`).
- **Deploy**: Cloudflare Pages, static `dist/`. `base: './'`.

## 2. Features present

- Demo clip playback with waveform seek and live row highlight.
- File upload (audio/video), decode to 16 kHz PCM, live waveform.
- Transcribe (keep spoken language) vs Translate to English (Whisper `task`).
- Tiny / base model choice, WebGPU with WASM fallback, q4/q8 quantization.
- Live download progress and live segments with timestamps.
- Exports: TXT (with timestamps), SRT, VTT.
- Copy to clipboard, download source video.
- BYOK Gemini translator (collapsible, key in localStorage, clear button).
- SEO/FAQ section, ad slots, support modal.
- robots.txt, sitemap.xml.

## 3. Problems found

### Reliability

- **R1 (fixed earlier)**: worker lost the `run` message because the listener was registered after a top-level `await import`. Fixed by registering the listener first and loading lazily.
- **R2**: `loadFile` does not guard against a run already in progress; calling it twice starts two pipelines and corrupts `state.segments`.
- **R3**: no file size limit; `decodeAudioData` on a multi-GB file OOMs the tab.
- **R4**: empty/corrupted files surface a generic "The browser could not open that file" or "could not be read"; no specific cause.
- **R5**: cancel sets a flag but the current 30 s window still runs to completion; no hard abort of `pipe()`.
- **R6**: no `beforeunload` guard, so a completed transcript is lost on refresh/navigation.
- **R7**: no confirmation before replacing an existing transcript with a new file.
- **R8**: `failRun` does not revoke the object URL or free `state.pcm`; minor leak on repeated failures.
- **R9**: `baseName()` is derived from `clipName.textContent` and used directly as a download filename; a hostile filename (path separators, control chars) is not sanitized.
- **R10**: model download cannot be cancelled; a failed download leaves `libPromise` nulled (good) but the worker stays alive.

### Performance

- **P1**: `decodeToPcm` reads the whole file into an `ArrayBuffer` and decodes it at once. Acceptable up to a few hundred MB; dangerous above.
- **P2**: `peaksFromPcm` walks every 8th sample; fine.
- **P3**: the worker keeps the pipeline cached across runs (good) but never terminates, so memory stays allocated for the whole session (intended, enables instant re-runs).
- **P4**: no IndexedDB; transformers.js uses the Cache API, which the browser may evict under storage pressure. No quota handling.
- **P5**: WebGPU path uses q4 (~94 MB). WASM path uses q8. No detection of low-memory devices to prefer tiny/q4.

### UX

- **U1**: no drag-and-drop upload area; only a hidden file input behind a button.
- **U2**: no file size in the metadata line; dimensions only.
- **U3**: no "remove / replace file" action; uploading a new file silently replaces.
- **U4**: no elapsed time or estimated remaining time during transcription.
- **U5**: transcript cells are not editable; exports use the original transcription only.
- **U6**: no search within the transcript.
- **U7**: progress stages are coarse ("Reading the file", "Starting the model", "Listening X of Y"); no explicit "Extracting audio" / "Processing transcript" / "Completed".
- **U8**: empty/corrupted/unsupported files produce a generic failure panel.
- **U9**: mobile: engine controls wrap, but the waveform and table can overflow on very small screens (verified OK at 375, but no reserved space for the ad).

### Translation

- **T1**: Gemini errors are reported as `Gemini returned <status>` with no distinction between 401 (bad key), 429 (rate limit), 403, network failure.
- **T2**: API key is stored in `localStorage` (persistent). No session-only option.
- **T3**: no privacy note that transcript text is sent to Google.
- **T4**: no input validation on the key beyond trim.
- **T5**: translation progress is a single "Translating..." string; no stage feedback.

### Privacy / security

- **S1**: ad script (Adsterra) sets third-party cookies; the page claims "Nothing is uploaded". The claim is true for files, but the ad network does track. FAQ should disclose.
- **S2**: Gemini key in `localStorage` persists across sessions and is readable by any script on the origin (XSS surface). Mitigated by using `textContent` everywhere (no innerHTML with user data found), but defense in depth: session storage + opt-in persist.
- **S3**: `baseName()` unsanitized (see R9).
- **S4**: no Content Security Policy. Inline handlers? None found. Could add a restrictive CSP, but the ad script and CDN import require allow-listing. Deferred.
- **S5**: dependency audit: 2 vulnerabilities (1 moderate, 1 high) reported by npm; both are dev-only (esbuild/vite). Acceptable for a static site, but should be noted.

### UI

- **D1**: overall structure is clean; spacing and typography are consistent. No major issues.
- **D2**: the `frame__cap` text is hardcoded to the demo clip ("CARRYMINATI PLAYS GTA VI, 2:50:31 into the stream") and is not updated for uploaded files (it is updated to `file.name` in `loadFile` — actually it is: `el.frameCap.textContent = file.name`). OK.
- **D3**: `metaSize` shows "1080 by 1920" for the demo but is stale after compression (now 540x960); data.ts updated. OK.

## 4. Architectural observations

- No framework; Vite bundles `src/main.ts` and `src/worker.ts` separately. Worker is a module worker.
- `state` is a single mutable object; no reactive layer. Fine for this size.
- `rows` is a parallel array kept in sync manually with DOM; `addSegment` appends. Editing would require syncing back.
- `ensureWorker()` creates one worker for the page lifetime. Good.

## 5. Highest-priority fixes (implemented in this pass)

1. Guard `loadFile` and `runEngine` against concurrent runs.
2. File validation: type, size limits (warn > 200 MB, hard limit 1 GB), empty file detection, specific decode errors.
3. `beforeunload` guard when a transcript exists.
4. Confirm before replacing an existing transcript.
5. Sanitize download filenames.
6. Drag-and-drop upload area.
7. File size in metadata + remove/replace action.
8. Elapsed time during processing.
9. Editable transcript segments synced to `state.segments`, used by exports.
10. Search within transcript.
11. Gemini: status-specific errors, session storage with opt-in persist, privacy note, key format hint.
12. FAQ disclosure about third-party ads.
13. Memory hygiene: free pcm on failure, revoke object URLs.

## 6. Remaining limitations

- No IndexedDB model cache; relies on browser Cache API (may be evicted).
- No true chunked audio decoding; whole file is decoded at once (guarded by size limit).
- Cancel waits for the current 30 s window.
- No automated test suite beyond the Puppeteer smoke harness.
- Ad network may not fill for all users (origin/geo gating).
- WebGPU availability varies; WASM fallback is slower.
- Mobile transcription of long files is memory-constrained.
- No editing of timestamps (text only).

## 7. Next three highest-impact improvements

1. IndexedDB-backed model cache with quota handling and resume.
2. Streaming/chunked audio decoding for files above ~200 MB.
3. A real automated test suite (Vitest + Playwright) covering exports and the worker.
