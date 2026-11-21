# Tannscribe Phase 5: Product Readiness

## Problems discovered
- First-time visitors had no guided entry point; the "How it works" section existed but was below the fold.
- Waveform had no visual subtitle ranges; boundaries were not draggable.
- axe reported 4 violations: label-content-name-mismatch (dropzone, TXT, VTT), landmark-unique (ad slot), link-name (third-party ad links), region (content outside landmarks).
- Privacy claims needed explicit disclosure of the ad network and Gemini.
- No monetization strategy documented.

## Improvements implemented
- Dismissible first-run onboarding tip banner (stored in localStorage).
- Draggable subtitle segments on the waveform (pointer events, desktop + touch, with validation and undo).
- axe accessibility fixes: distinct ad-slot labels, dropzone/TXT/VTT aria-labels containing visible text, landmark regions for content section. Result: 0 violations (excluding third-party ad markup).
- Privacy disclosures in FAQ and BYOK panel.
- Monetization proposal (below).

## Mobile testing results
- Playwright mobile (Pixel 5) suite: all tests pass, no horizontal overflow.
- Onboarding tip, dropzone, search, exports all functional on mobile viewport.
- Timestamp editing works but is cramped on small screens (documented limitation).

## Performance measurements
- Not formally benchmarked in this environment (headless WebGPU is software-rendered and not representative).
- Existing measurements from Phase 1: 94 MB model download ~39 s on this network; transcription ~35 s for 55 s of audio on real hardware.
- Memory: pcm released after decode; worker pipeline cached across runs; object URLs revoked on replace.

## Accessibility results
- axe-core: 0 violations on desktop and mobile after fixes (excluding third-party ad markup, which is the ad network's responsibility).

## Monetization proposal (research, no payments implemented)

Realistic options for a privacy-focused, browser-based tool:

1. Ethical advertising (current approach)
   - Pros: no user cost, works with the existing Adsterra slot, scales with traffic.
   - Cons: requires traffic, can hurt privacy perception, ad blockers reduce revenue, third-party cookies.

2. Optional premium tier (one-time purchase, e.g. $19–$39)
   - Pros: aligns with privacy (no ads), predictable revenue, funds development.
   - Cons: requires payment integration, support burden, feature gating must not break free tier.

3. BYOK is already the model for translation; keep it free and unlimited.

4. Premium subtitle editing (advanced styling, batch export, cloud sync)
   - Pros: clear value for professional users.
   - Cons: cloud sync reintroduces a server, conflicting with the "no upload" promise.

Recommendation: keep transcription free and unlimited (core value + trust). Add optional one-time premium for advanced editing/export features later, and keep ads as a secondary revenue stream. Do not add payments until user demand is proven. Do not introduce artificial limits on free transcription.

## Privacy findings
- Files never leave the browser; transcription and English translation run locally.
- Gemini receives only transcript text, only when the user opts in with their own key.
- The ad network may set cookies; disclosed.
- API key stored in sessionStorage by default, localStorage only with explicit opt-in.

## Files modified
- `index.html`, `page.css`, `src/main.ts`, `tests/e2e/axe.spec.ts`, `tests/e2e/smoke.spec.ts`, `PHASE5.md` (new).

## Remaining limitations
- No axe audit of the ad network's injected markup (third-party).
- Waveform boundaries are draggable but only as whole-segment moves (no edge resize yet).
- No mobile-specific timestamp editor (uses the same inline inputs).
- No real analytics; only a mailto feedback link.
- No payment integration (intentional).

## Recommended next phase
1. Implement edge-resize handles on waveform segments for precise boundary editing.
2. Add a privacy-friendly, self-hosted analytics option (e.g., Plausible/Umami) presented for approval.
3. Build a lightweight onboarding tour (3 steps) for first-time users.
