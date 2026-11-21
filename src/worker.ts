/// <reference lib="webworker" />

// transformers.js is loaded at runtime from the CDN so it is never bundled
// into the app and the initial download stays small.
//
// The load is lazy and started from inside the message handler on purpose.
// A top-level await here would leave the worker without a message listener
// while the module resolves, and any run request posted during that window
// would be dispatched to an empty scope and lost.
const LIB_URLS = [
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js',
  'https://unpkg.com/@huggingface/transformers@4.3.2/dist/transformers.min.js',
];

interface TransformersLib {
  pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<any>;
  env: { allowLocalModels: boolean; useBrowserCache: boolean };
}

let libPromise: Promise<TransformersLib> | null = null;

async function importLib(): Promise<TransformersLib> {
  let lastError: unknown = null;
  for (const url of LIB_URLS) {
    try {
      const module = await import(/* @vite-ignore */ url);
      const lib = module as unknown as TransformersLib;
      lib.env.allowLocalModels = false;
      lib.env.useBrowserCache = true;
      return lib;
    } catch (error) {
      lastError = error;
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('The speech engine could not be downloaded.'));
}

function loadLib(): Promise<TransformersLib> {
  if (!libPromise) {
    libPromise = importLib();
    libPromise.catch(() => { libPromise = null; });
  }
  return libPromise;
}

const MODELS: Record<string, string> = {
  tiny: 'Xenova/whisper-tiny',
  base: 'Xenova/whisper-base',
};

const SAMPLE_RATE = 16000;
const WINDOW = 30;
const STRIDE = 5;
const QUIET = 0.012;

interface Loaded { key: string; pipe: any; device: string; }
let loaded: Loaded = { key: '', pipe: null, device: '' };
let cancelled = false;

const post = (message: unknown): void => self.postMessage(message);

function devicePlan(): { device: string; dtype: string }[] {
  const gpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
  return gpu
    ? [{ device: 'webgpu', dtype: 'q4' }, { device: 'wasm', dtype: 'q8' }]
    : [{ device: 'wasm', dtype: 'q8' }];
}

function downloadReporter(): (event: any) => void {
  const files = new Map<string, { loaded: number; total: number }>();
  return (event: any) => {
    if (!event || !event.file) return;
    if (event.status === 'progress' || event.status === 'done') {
      const total = event.total || files.get(event.file)?.total || 0;
      const done = event.status === 'done' ? total : event.loaded || 0;
      files.set(event.file, { loaded: done, total });
    } else {
      return;
    }
    let done = 0;
    let total = 0;
    for (const f of files.values()) {
      done += f.loaded;
      total += f.total;
    }
    if (!total) return;
    post({ type: 'download', file: event.file, loaded: done, total, progress: Math.min(100, (done / total) * 100) });
  };
}

async function getPipeline(model: string): Promise<any> {
  const key = MODELS[model] || MODELS.tiny;
  if (loaded.pipe && loaded.key === key) {
    post({ type: 'ready', model: key, device: loaded.device, cached: true });
    return loaded.pipe;
  }

  post({ type: 'status', text: 'Loading the speech engine' });
  const { pipeline } = await loadLib();

  let lastError: unknown = null;
  for (const option of devicePlan()) {
    try {
      post({ type: 'status', text: 'Loading ' + key.split('/')[1] + ' on ' + option.device });
      const pipe = await pipeline('automatic-speech-recognition', key, {
        device: option.device,
        dtype: option.dtype,
        progress_callback: downloadReporter(),
      });
      loaded = { key, pipe, device: option.device };
      post({ type: 'ready', model: key, device: option.device, cached: false });
      return pipe;
    } catch (error) {
      lastError = error;
      post({ type: 'status', text: option.device + ' did not start, trying the next backend' });
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('no usable backend'));
}

function isQuiet(slice: Float32Array): boolean {
  let sum = 0;
  for (let i = 0; i < slice.length; i += 64) sum += slice[i] * slice[i];
  return Math.sqrt(sum / Math.max(1, Math.ceil(slice.length / 64))) < QUIET;
}

async function transcribe({ audio, model, task, language }: { audio: Float32Array; model: string; task?: string; language?: string }): Promise<void> {
  cancelled = false;
  const pipe = await getPipeline(model);
  const duration = audio.length / SAMPLE_RATE;

  post({ type: 'status', text: 'Listening' });
  post({ type: 'start', duration });

  let start = 0;
  let emittedEnd = -1;
  let index = 0;

  const options: { return_timestamps: boolean; task?: string; language?: string } = { return_timestamps: true };
  if (task === 'translate') options.task = 'translate';
  if (language) options.language = language;

  while (start < duration) {
    if (cancelled) {
      post({ type: 'cancelled' });
      return;
    }

    const end = Math.min(start + WINDOW, duration);
    const from = Math.floor(start * SAMPLE_RATE);
    const to = Math.min(Math.floor(end * SAMPLE_RATE), audio.length);
    const slice = audio.subarray(from, to);

    if (slice.length > SAMPLE_RATE / 2 && !isQuiet(slice)) {
      let result: any = null;
      try {
        result = await pipe(slice, options);
      } catch (error) {
        post({ type: 'status', text: 'That window failed: ' + ((error as Error)?.message || 'unknown') });
      }

      const chunks = result && Array.isArray(result.chunks) && result.chunks.length
        ? result.chunks
        : result && result.text
          ? [{ timestamp: [0, end - start], text: result.text }]
          : [];

      for (const chunk of chunks) {
        const text = String(chunk.text || '').trim();
        if (!text) continue;
        const stamp = chunk.timestamp || [];
        const t0 = start + (typeof stamp[0] === 'number' ? stamp[0] : 0);
        const t1 = start + (typeof stamp[1] === 'number' ? stamp[1] : end - start);
        if (t1 <= emittedEnd + 0.05) continue;
        emittedEnd = Math.max(emittedEnd, t1);
        post({ type: 'segment', segment: { id: index++, start: t0, end: t1, text } });
      }
    }

    post({ type: 'progress', done: end, total: duration });

    if (end >= duration) break;
    start = end - STRIDE;
  }

  post({ type: 'status', text: 'Finished' });
  post({ type: 'done', duration, segments: index });
}

// Registered synchronously, before anything asynchronous runs, so a run
// request that arrives early is handled instead of dropped.
self.addEventListener('message', (event: MessageEvent) => {
  const data = (event.data || {}) as { type?: string; audio?: Float32Array; model?: string; task?: string; language?: string };

  if (data.type === 'run') {
    transcribe({ audio: data.audio as Float32Array, model: data.model || 'tiny', task: data.task, language: data.language }).catch((error) => {
      post({ type: 'error', text: (error as Error)?.message || String(error) });
    });
    return;
  }

  if (data.type === 'cancel') {
    cancelled = true;
    post({ type: 'status', text: 'Stopping after this window' });
  }
});

export {};
