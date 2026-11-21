# Tannscribe Phase 6: Final Editing Experience & Launch Preparation

## Audit and implementation plan

Phase 6 plan (from product owner):

1. Waveform edge resizing.
2. Dedicated mobile timestamp editor.
3. Three-step guided onboarding.
4. Analytics research (no install without approval).
5. Public launch preparation audit.
6. Expanded testing.
7. Final report.

Implementation was incremental, preserving all prior functionality (Phase 1-5 work untouched except where noted).

## Implemented in Phase 6

### 1. Waveform edge resizing (implemented)

- Pointer-down on a waveform subtitle segment classifies the gesture from pointer position
  relative to the segment box: inside the left edge zone -> `resize-start`, inside the right
  edge zone -> `resize-end`, otherwise -> `move`. Edge zone width = max(6px, 12% of segment width).
- Resize keeps a minimum segment duration of 0.3 s and prevents overlaps with neighbouring
  segments (prev/next). Move keeps the previous overlap validation and end-of-media clamp.
- Visual handles: `::before` / `::after` pseudo-elements on `.wave__seg` act as edge handles,
  revealed on hover and while `is-dragging`.
- Undo/redo: history snapshots now include segment start/end times as well as text, so drag
  and resize edits are undoable/redoable through the existing Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y flow.

### 2. Mobile timestamp editor (implemented)

- New toolbar button `#mobEdit` ("Edit times"), visible only at viewport width <= 40 rem
  (hidden on desktop).
- Opens `#mobileEditor` dialog listing every segment with Start/End numeric inputs (min 0,
  step 0.1, font-size 16 to avoid mobile zoom).
- Save validates each row (end > start, no overlap with neighbours) and applies valid rows in
  one history commit; Cancel closes without changes.
- Save refreshes transcript rows, waveform segments and subtitle overlay.

### 3. Three-step guided onboarding (implemented)

- Replaced the Phase 5 single dismissible tip with a modal dialog `#onboarding` (3 steps:
  Upload / Transcribe and edit / Preview and export).
- Controls: Next, Back, Skip, Finish (Finish shown as the primary action on the last step).
- Progress label ("Step X of 3") and per-step title/text.
- Dismissal persists via localStorage key `tannscribe.onboardingDone`.
- Restart available from the support dialog ("Restart the guided tour").
- Esc (cancel event) dismisses and persists.

## Analytics research (task 4 — research only, nothing installed)

Compared:

| Option | Cost | Privacy | Hosting | Ease | Data collected | Cookies |
| --- | --- | --- | --- | --- | --- | --- |
| None (current) | $0 | best | none | n/a | none | none |
| Plausible (self-hosted) | ~5-15 USD/mo VPS | strong (cookieless, GDPR-friendly) | self-host or hosted free tier (10k events/mo) | easy (script tag) | page views only, no PII, no custom events w/ content | none |
| Umami (self-hosted) | ~5-15 USD/mo VPS + DB | strong (cookieless) | self-host (Postgres) | moderate | page views only, aggregates | none |

Evaluation notes:
- All three can be cookieless; all can be self-hosted; all can exclude transcript/audio/API key content.
- Plausible is the front-runner for a future optional install (lightweight, cookieless, pageview-only, GDPR-friendly, easy to self-host).
- Umami requires a database and more setup.
- No analytics was installed in Phase 6; recommendation is to stay with "none" until real user
  feedback warrants it, then consider self-hosted Plausible with explicit owner approval.

## Launch preparation audit (task 5)

Checks performed against implementation:

- Homepage messaging: "How it works", "Private by design", formats/exports, FAQ. Claims match
  implementation (files stay on device; ad network may set cookies; Gemini only with user key).
- Privacy statements: aligned (local transcription, opt-in Gemini, ad disclosure).
- Error messages: existing engine/file/BYOK error paths retained.
- Browser compatibility: WebGPU/WASM fallback documented; model size ~94 MB.
- SEO metadata: robots.txt, sitemap.xml, OG/Twitter cards, JSON-LD, Google verification token (live-verified in Phase 3).
- Accessibility: axe clean (Phase 5).
- No new unsupported claims added in Phase 6.

## Testing (task 6)

Commands run:

- `npm run build` — clean (tsc --noEmit + vite build).
- `npm test` (Vitest) — 17/17 passed.
- `npx playwright test` — 34 passed, 4 skipped (axe suite skipped: `@axe-core/playwright` removed from package.json in Phase 5; axe itself validated clean in Phase 5).
- sloplint on `index.html` — clean.

New in Phase 6:

- `tests/e2e/waveform.spec.ts` (new): waveform drag moves timestamp; drag undo restores; edge resize updates start. Passed desktop + mobile.
- `tests/e2e/mobile-editor.spec.ts` (new): mobile edit dialog open/apply/save/close. Passed desktop + mobile.
- `tests/e2e/onboarding.spec.ts` (new): first-visit 3-step tour, skip persistence, restart. Passed desktop + mobile.
- Updated `smoke.spec.ts`, `waveform.spec.ts`, `mobile-editor.spec.ts` with `beforeEach` onboarding-dismiss init script (tour auto-opens on first visit and was intercepting clicks).

Final full run: **34 passed, 4 skipped** (2m 54s), across desktop and mobile viewports.

## Final report

### Implemented this phase
- Waveform edge-resize handles with validation and undo/redo.
- Mobile timestamp editor dialog (Start/End, save/cancel, validation).
- Three-step first-visit onboarding tour (Next/Back/Skip/Finish, persist, restart).

### Not implemented (by design / pending)
- No analytics installed (research documented; approval pending).
- No payment integration (Phase 5 recommendation stands).
- Ad network injected markup not axe-audited (third-party).
- Real-device performance measurements (headless only this phase).

### Remaining limitations
- Waveform edge handles are pseudo-element visuals; resize handled by pointer position with edge zones (no separate handle grabbers — acceptable for current pointer/touch model).
- Mobile editor dialog lists all segments (could paginate for very long transcripts).
- Desktop inline time editor retained; mobile uses dialog.
- Onboarding auto-opens on first visit only (persisted).

### Recommended next phase
1. Deploy Phase 6 build to Cloudflare Pages and verify live (push was blocked by git credential error during the session; deploy verification pending).
2. Real-device (phone) testing: touch drag, mobile editor, onboarding on a real handset.
3. Consider self-hosted Plausible install (owner approval required) once real usage data motivates it.
4. Consider premium subtitle-editing features per Phase 5 monetization proposal.
