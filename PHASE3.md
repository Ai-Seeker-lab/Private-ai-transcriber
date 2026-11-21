# Tannscribe Phase 3: Production Readiness & Quality

## 1. Security issues discovered
- No innerHTML/eval/document.write in the codebase; all user content rendered via textContent. XSS surface is low.
- API key is sent in the Gemini query string (Google's required format). It is not logged, but it can appear in browser network panels. Acceptable and documented.
- Download filename was derived from untrusted clip name; sanitized in Phase 1/2.
- No Content Security Policy was set. Added a CSP meta tag (script-src allows https: so the Adsterra ad network can load; worker-src allows blob:).
- Dependency audit: dev-only vulnerabilities (esbuild/vite). No runtime dependencies beyond the CDN-loaded transformers.js.

## 2. Privacy issues discovered
- Transcription and English translation run entirely in the browser; no audio/video is uploaded.
- Gemini translation sends only transcript text, only when the user opts in with their own key.
- The Adsterra ad script is a third-party that may set cookies; disclosed in the FAQ and the "third-party network" label.
- Privacy notice now states these facts explicitly rather than claiming "100% private".

## 3. Accessibility issues discovered
- Focus visibility already existed (`:focus-visible` outline).
- Progress, empty, and failed regions lacked ARIA roles. Added `role="status"`/`aria-live="polite"` to progress, `role="status"` to empty, `role="alert"` to failed.
- Dropzone, waveform, search already had labels/keyboard support.
- No color-contrast changes were needed (dark theme verified readable).

## 4. Improvements implemented
- Security: CSP meta tag, filename sanitization (already), no unsafe rendering.
- Privacy: FAQ disclosure about third-party ads and Gemini; privacy note under the BYOK panel.
- Accessibility: ARIA roles on progress/empty/failed regions.
- Transcript editing: contenteditable cells now disable during transcription and re-enable on completion; undo/redo via Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y with a 600 ms debounced history snapshot.
- Subtitle export: verified SRT/VTT/TXT formatting, unicode, zero-length end handling, sanitization (covered by tests).
- Error handling: stage-specific labels ("Extracting audio from video"), cancel UI.
- SEO: JSON-LD WebApplication structured data, title/description/OG/Twitter already present.
- User feedback: "Send feedback" mailto link in the support modal.
- Testing: Vitest 17 tests + Playwright 14 tests (desktop + mobile), including export downloads.

## 5. Files modified
- `index.html`, `src/main.ts`, `AUDIT.md`-adjacent docs, `PHASE3.md` (new).

## 6. Dependencies added or removed
- None added in this phase (Vitest/Playwright added in Phase 2).

## 7. Tests performed and results
- `npm run build`: 0 TS errors, 0 Vite errors.
- `npm test`: 17/17 passed.
- `npm run test:e2e`: 14/14 passed (desktop + mobile).
- `sloplint`: 0 FAIL / 0 REFLEX / 0 WARN.
- Live deploy verified.

## 8. Remaining limitations
- No automated accessibility audit (axe) run; manual review only.
- CSP uses `https:` for script-src to accommodate the ad network, which is broader than ideal.
- Undo/redo history is in-memory only and resets on reload.
- No timestamp editing.

## 9. Recommended next phase
1. Run an axe-core accessibility audit and fix violations.
2. Add a strict CSP report-only mode first to discover breakage before enforcing.
3. Implement timestamp editing in the transcript table.
