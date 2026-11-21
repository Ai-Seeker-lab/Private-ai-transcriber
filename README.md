# Tannscribe

Transcribe and translate video and audio entirely in the browser. Whisper runs on the user's
device through WebGPU or WebAssembly, so no file is ever uploaded and there is no server to pay for.

## What it does

- Decodes MP4, MOV, WebM, M4A, MP3, WAV and OGG in the tab, downmixed to 16 kHz mono.
- Transcribes with `Xenova/whisper-tiny` (default) or `Xenova/whisper-base`, streaming segments and
  timestamps into the table while it listens.
- Whisper's own `task` flag switches between **Transcribe** (keep the spoken language) and
  **Translate to English**, so the English path costs no extra model weight.
- Exports plain text, SRT and WebVTT, plus the source video.
- Optional collapsible panel that translates the SRT into any language using the user's own Google
  Gemini API key. The key lives in `localStorage` and goes straight to Google.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

`serve.cmd` does the same on Windows.

## Build

```bash
npm run build      # type-check, then bundle into dist/
npm run preview    # serve dist/ locally
```

`dist/` is a plain static folder. Upload it to Cloudflare Pages, Netlify, GitHub Pages or any static
host. There is no server-side code.

## Deploy to Cloudflare Pages

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 18 or newer |

## Layout

```
src/main.ts      UI, decoding, live segments, exports, BYOK translator
src/worker.ts    transformers.js, model load with WebGPU to WASM fallback, windowed transcription
src/data.ts      real waveform bars, 98-language list, sample transcript lines
src/types.ts     shared interfaces
public/          demo clip, poster, favicon (copied verbatim into dist/)
```

`transformers.js` is imported at runtime from jsDelivr and marked `@vite-ignore`, so it never enters
the bundle. Only `dist/transformers.min.js` is loadable in a browser; `transformers.web.js` resolves
a bare `onnxruntime-web/webgpu` specifier and fails.

## Notes

- The model downloads once (about 94 MB on the WebGPU path) and is cached by the browser after that.
- Whisper defaults to English when `language` is omitted, so the Spoken select is always sent.
- Audio is decoded on the main thread because `AudioContext` does not exist in workers; the PCM is
  transferred to the worker as a `Float32Array`.
- Speech-to-English translation is Whisper's built-in capability. Any other target language needs the
  BYOK panel.
