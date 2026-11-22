# Tannscribe — Soft Launch Report (Phase 8)

**App:** Tannscribe (free, client-side Whisper transcription/translation)
**Live URL:** https://private-ai-transcriber.chucklescrazy9.workers.dev/
**Date:** 2026-11-22
**Recommendation:** ⚠️ **Conditional go for soft launch.** All code paths are verified locally and the critical CSP blocker is fixed and deployed. Live end-to-end transcription could **not** be confirmed from this automated environment and must be verified in a real browser before any public announcement.

---

## 1. Production transcription result

**Status: NOT verified end-to-end on the live origin. Treated as a launch blocker until confirmed.**

- The deployed page now serves the fixed bundle (`index-Bwgq9kSV.js`) with `'unsafe-eval'` in the CSP meta tag and the `_headers` security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) are live.
- In an automated (Playwright) browser on the live origin, the model fetch from `huggingface.co` fails with `TypeError: Failed to fetch` / a CORS error (`No 'Access-Control-Allow-Origin' header`). The same fetch succeeds from `http://localhost` and from `curl` with the `workers.dev` Origin header, so this appears to be an environment/edge restriction rather than a code defect — most likely Cloudflare's edge (in front of the live site) or Hugging Face's browser-facing policy blocking automated requests.
- **Local verification (repeated, with the fixed build):** transcription completes end-to-end on both the WASM (q8) and WebGPU (q4) paths, with exports and editing working. See §2.

**Required action before launch:** open the live URL in a normal Chrome/Edge browser, drop a short WAV/MP3, and confirm a transcript appears. If it fails for real users, the likely culprits are the `Referrer-Policy: strict-origin-when-cross-origin` header (added in `_headers`) or Hugging Face blocking the `workers.dev` origin; mitigations are to relax that header or to move to a custom domain / self-host the model files.

---

## 2. Model download and cache results (local, verified)

| Path | Model size | Download time | Inference (15 s clip) | Total run |
|---|---|---|---|---|
| WASM (q8) | ≈ 42 MB (`encoder_model_quantized.onnx` 9.66 MB + `decoder_model_merged_quantized.onnx` 29.3 MB + tokenizers) | ~30 s (~1.5 MB/s) | ~15 s (≈ 1× realtime) | ~69 s warm |
| WebGPU (q4) | ≈ 94 MB (9.0 MB + 86.7 MB) | ~25 s | ~15 s | ~88 s (fresh cache) |
| 30-min file (WASM) | cached | 0 (cached) | ~30.8 min | 1,850 s, 373 segments, no crash/OOM |

- **Cache persistence:** survives reload ("Model cache: ready (7 files, 67 MB). Repeat runs skip the download."). Verified by reloading after a run.
- **Download speed:** ~1.5–2 MB/s on the test connection.
- **Memory:** 30-min run completed without OOM on 8 GB; no formal heap measurement was taken.

---

## 3. WebGPU and WASM results

| Backend | Available in test Chrome? | Verified? | Notes |
|---|---|---|---|
| WebGPU (q4) | Yes | ✅ Local | Preferred by `devicePlan()` when `'gpu' in navigator`. Downloads 2.2× more than WASM; produced a 3-segment transcript on the test clip. |
| WASM (q8) | Yes (fallback) | ✅ Local | Smaller download (42 MB), better transcript on the tested clip (6 segments vs. 3). Recommended as the default; needs more samples to decide. |

- Fallback logic: `devicePlan()` tries WebGPU first, then WASM; a quota/storage error aborts the whole run (by design — no silent partial load).
- **WASM fallback when WebGPU is unavailable:** not directly tested (no GPU-less Chrome available), but the code path is the same one exercised by forcing `gpu = false` in a local experiment, which succeeded.

---

## 4. Browser and device coverage

| Browser / device | Tested? | Result |
|---|---|---|
| Chromium (Desktop, Windows) | ✅ Automated + real transcription | Full suite 34 passed / 4 skipped. Real transcription verified (WASM + WebGPU). |
| Chromium (Pixel 5 mobile emulation) | ✅ Automated | Full suite 34 passed / 4 skipped. |
| Firefox | ❌ Not verified | Binary install left no runnable `firefox.exe`. Code uses standard APIs; plausibly works on modern Firefox (111+ for `color-mix`, 103+ for `:has()`). **Untested.** |
| Safari / WebKit | ❌ Not verified | Could not install WebKit. `showModal()` needs 15.4+, `color-mix()` 16.2+. **Untested.** |
| Android phone (real device) | ❌ Not performed | Manual checklist in `LAUNCH_READINESS.md` §8. |
| iPhone (real device) | ❌ Not performed | Manual checklist in `LAUNCH_READINESS.md` §8. |
| Windows desktop (real Chrome/Edge/Firefox) | ⚠️ Partial | Chrome verified by agent; Edge expected to match (Chromium); Firefox unverified. |
| Low-end laptop (2 cores, 4 GB) | ⚠️ Partial | Agent machine is 2-core/8 GB; 30-min file completed in ~31 min without OOM. True 4 GB machine not tested. |

---

## 5. Language test results

| Sample | Spoken language | Transcript produced? | Quality |
|---|---|---|---|
| Demo clip (Carryminati, Hinglish) | English (corrected in this phase) | ✅ 8 hardcoded lines | Demo data is real captions; now correctly labelled English. |
| `clip15.wav` (first 15 s of demo) | English | ✅ 6 segments | Plausible but noisy ("I think they can't get in the car.", "Galich, come on…"). Typical for `whisper-tiny` on music-heavy audio. |
| `clip15.wav` via WebGPU (q4) | English | ✅ 3 segments | Worse than WASM on this clip (fewer, coarser segments). |
| Non-English (Urdu/Hindi/etc.) | — | ❌ Not tested | **No non-English audio file was available.** The language selector is wired (98 languages from the model list) and the demo offers Hindi/Spanish sample translations, but no real non-English transcription was performed. **Marked unverified.** |

**Honest limitation:** transcription quality on noisy, music-heavy audio is limited by `whisper-tiny`. Users transcribing clean speech (podcasts, meetings, lectures) should see much better results; the demo clip is not representative of typical use.

---

## 6. Remaining known issues

1. **Live transcription unverified** (launch blocker) — see §1.
2. **Cache-Control merge:** Cloudflare's default `public, max-age=0, must-revalidate` is prepended to the `_headers` value on static assets, so immutable caching is **not** effective (`Cache-Control: public, max-age=0, must-revalidate, public, max-age=31536000, immutable`). Requires a zone-level cache rule or a Workers script.
3. **BYOK API key risk:** stored in `localStorage` only when the user opts in, but the Adsterra script runs on the same origin and can read it. Default is `sessionStorage`. Also, the key is sent as a URL query parameter (`?key=…`) to Gemini, which is standard for that API but means it can appear in proxy/network logs.
4. **Ad placeholders removed** (this phase) — the empty "Ad space, 300×250" boxes are gone; only the configured Adsterra native banner remains, and its auto-hide is now robust.
5. **Demo language inconsistency fixed** (this phase) — spoken language corrected to English.
6. **Flaky e2e under parallel load** on 2-core machines (2 mobile tests failed in one run, all green in two others) — test-infra, not product.
7. **No real-device testing performed** (Android/iPhone) — manual checklist outstanding.
8. **No non-English speech tested.**
9. **No corrupt-container test** (only a text file was rejected).
10. **Files > 200 MB** (warning dialog) and **> 1 GB** (hard limit) not exercised.

---

## 7. Privacy / security review

| Item | Status |
|---|---|
| Audio/video processing | ✅ 100% client-side. No file is uploaded. Verified by network inspection: the only outbound requests are to the CDN (transformers.js), Hugging Face (model files), Google Fonts, and Adsterra. |
| Transcript text | ✅ Never sent anywhere except the optional BYOK Gemini call (user-initiated, user's own key). |
| API keys | Stored in `sessionStorage` by default; `localStorage` only on explicit opt-in. Sent over HTTPS to `generativelanguage.googleapis.com`. Not logged by the app. Risk noted in §6 item 3. |
| Analytics / payments | ✅ None installed. |
| Personal data collection | ✅ None. |
| CSP | Meta tag: `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`. Functional (required by onnxruntime-web) but broad. No header-level CSP. |
| Security headers | ✅ Live: HSTS (`max-age=31536000; includeSubDomains`), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera/mic/geo/payment disabled. |
| HTTPS | ✅ TLS 1.3, HTTP/3. But plain HTTP still serves the app with no redirect (zone-level setting needed). |
| XSS | ✅ No `innerHTML`/`eval`/`document.write` in app code; transcript text via `textContent`. |
| File validation | ✅ Type + extension allow-list; 1 GB hard limit; 200 MB warning. |
| Third-party scripts | Adsterra native banner (idle-mounted, auto-hides after 15 s if unfilled). Not axe-audited. Loaded with `script-src https:`. |
| Privacy disclosures | The UI states "Whisper runs in this tab. Nothing is uploaded." and "Files stay on this machine." Accurate for transcription. The BYOK panel discloses that transcript text is sent to Google's Gemini API using the user's key. |

---

## 8. Final go / no-go recommendation

**Conditional go for soft launch.**

**Go, if:**
1. A real-browser smoke test on the live URL confirms a dropped file produces a transcript (the single biggest open item).
2. The manual device checklist (`LAUNCH_READINESS.md` §8) is completed on at least one real Android and one real iPhone.

**No-go triggers:**
- Live transcription fails for real users (treat as a launch blocker — see §1 mitigations).
- A real device cannot complete the flow (upload → transcribe → edit → export).

**Post-launch (first patch):**
- Fix the Cache-Control merge (zone-level rule) so hashed assets are cached immutably.
- Test and document non-English transcription.
- Tighten the CSP (move to a header, scope `script-src`).
- Reconsider the BYOK key persistence (in-memory only by default).
- Address the remaining low-priority items (demo clip, "Clear cached model" placement).

---

*Verified by: Phase 8 final pass. Local verification harnesses (`tests/perf/*`) were removed from the tree after use; findings are recorded in `LAUNCH_READINESS.md` and this report.*
