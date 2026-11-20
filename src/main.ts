import { DEMO } from './data';
import type { DemoLang, Segment, Task } from './types';
import '../tokens.css';
import '../base.css';
import '../page.css';

/// <reference types="vite/client" />

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector(selector) as T;

interface ElMap {
  player: HTMLVideoElement;
  wave: HTMLButtonElement;
  table: HTMLTableElement;
  tbody: HTMLTableSectionElement;
  langHead: HTMLTableCellElement;
  note: HTMLParagraphElement;
  toggle: HTMLButtonElement;
  copy: HTMLButtonElement;
  videoDl: HTMLButtonElement;
  txt: HTMLButtonElement;
  srt: HTMLButtonElement;
  vtt: HTMLButtonElement;
  pick: HTMLButtonElement;
  file: HTMLInputElement;
  spoken: HTMLSelectElement;
  task: HTMLSelectElement;
  model: HTMLSelectElement;
  run: HTMLButtonElement;
  engineNote: HTMLParagraphElement;
  progress: HTMLDivElement;
  fill: HTMLSpanElement;
  progressLabel: HTMLParagraphElement;
  clipName: HTMLHeadingElement;
  metaLength: HTMLSpanElement;
  metaSize: HTMLSpanElement;
  metaLines: HTMLSpanElement;
  empty: HTMLDivElement;
  emptyTitle: HTMLHeadingElement;
  emptyText: HTMLParagraphElement;
  failed: HTMLDivElement;
  frameCap: HTMLParagraphElement;
  support: HTMLDialogElement;
  supportOpen: HTMLButtonElement;
  supportLink: HTMLAnchorElement;
  byok: HTMLDetailsElement;
  byokKey: HTMLInputElement;
  byokLang: HTMLSelectElement;
  byokRun: HTMLButtonElement;
  byokOut: HTMLTextAreaElement;
  byokDl: HTMLButtonElement;
  byokStatus: HTMLParagraphElement;
  byokClear: HTMLButtonElement;
}

const el = {
  player: $('#player'),
  wave: $('#wave'),
  table: $('#lines'),
  tbody: $('#lines tbody'),
  langHead: $('#langHead'),
  note: $('#note'),
  toggle: $('#toggle'),
  copy: $('#copy'),
  videoDl: $('#videoDl'),
  txt: $('#txt'),
  srt: $('#srt'),
  vtt: $('#vtt'),
  pick: $('#pick'),
  file: $('#file'),
  spoken: $('#spoken'),
  task: $('#task'),
  model: $('#model'),
  run: $('#run'),
  engineNote: $('#engineNote'),
  progress: $('#progress'),
  fill: $('#progressFill'),
  progressLabel: $('#progressLabel'),
  clipName: $('#clipName'),
  metaLength: $('#metaLength'),
  metaSize: $('#metaSize'),
  metaLines: $('#metaLines'),
  empty: $('#empty'),
  emptyTitle: $('#emptyTitle'),
  emptyText: $('#emptyText'),
  failed: $('#failed'),
  frameCap: $('.frame__cap'),
  support: $('#support'),
  supportOpen: $('#supportOpen'),
  supportLink: $('#supportLink'),
  byok: $('#byok'),
  byokKey: $('#byokKey'),
  byokLang: $('#byokLang'),
  byokRun: $('#byokRun'),
  byokOut: $('#byokOut'),
  byokDl: $('#byokDl'),
  byokStatus: $('#byokStatus'),
  byokClear: $('#byokClear'),
} as ElMap;

const BARS = 160;
const SAMPLE_LANGS = ['hi', 'es'];
const DEMO_SPOKEN = 'hi';

interface State {
  mode: 'demo' | 'file';
  showingDemo: boolean;
  file: File | null;
  objectUrl: string | null;
  pcm: Float32Array | null;
  segments: Segment[];
  duration: number;
  showTranslation: boolean;
  busy: boolean;
  runTask: Task;
}

const state: State = {
  mode: 'demo',
  showingDemo: true,
  file: null,
  objectUrl: null,
  pcm: null,
  segments: [],
  duration: DEMO.clip.duration,
  showTranslation: true,
  busy: false,
  runTask: 'transcribe',
};

let rows: HTMLTableRowElement[] = [];
let worker: Worker | null = null;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

function clock(seconds: number): string {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const rest = value - minutes * 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

function stamp(seconds: number, comma: boolean): string {
  const total = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const secs = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${comma ? ',' : '.'}${pad(ms, 3)}`;
}

function size(bytes: number): string {
  if (!bytes) return '0 KB';
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? Math.round(bytes / 1024) + ' KB' : mb.toFixed(0) + ' MB';
}

function nameOf(code: string): string {
  const hit = DEMO.languages.find((language) => language.code === code);
  return hit ? hit.name : code;
}

function baseName(): string {
  return el.clipName.textContent.replace(/\.[^.]+$/, '') || 'transcript';
}

function flash(button: HTMLElement, text: string): void {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = original; }, 1600);
}

function fillSelect(select: HTMLSelectElement, defaultCode: string): void {
  const fragment = document.createDocumentFragment();
  for (const language of DEMO.languages) {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.name;
    fragment.appendChild(option);
  }
  select.appendChild(fragment.cloneNode(true));
  select.value = defaultCode;
}

function setTranslation(on: boolean): void {
  state.showTranslation = on;
  el.table.classList.toggle('is-one-column', !on);
  el.toggle.setAttribute('aria-pressed', String(on));
  el.toggle.textContent = on ? 'Hide translation' : 'Show translation';
}

function applyLanguage(code: string): void {
  const name = nameOf(code);
  el.langHead.textContent = name;

  if (state.showingDemo) {
    if (SAMPLE_LANGS.includes(code)) {
      rows.forEach((row, index) => {
        const cell = row.children[2] as HTMLTableCellElement | undefined;
        if (cell && DEMO.lines[index]) cell.textContent = DEMO.lines[index][code as 'hi' | 'es'];
      });
      setTranslation(true);
      el.toggle.hidden = false;
      el.note.hidden = true;
    } else {
      setTranslation(false);
      el.toggle.hidden = true;
      el.note.hidden = false;
      el.note.textContent = 'Hindi and Spanish are sample translations on this clip. A real run transcribes the spoken language, and English is the only translation that runs offline.';
    }
    return;
  }

  setTranslation(false);
  el.toggle.hidden = true;
  el.note.hidden = false;

  if (code === 'en') {
    el.note.textContent = state.runTask === 'translate'
      ? 'English, translated by Whisper during the run.'
      : 'Whisper listens in the spoken language. Press Transcribe again to get English.';
  } else {
    el.note.textContent = 'Whisper transcribed the spoken language. English is the only translation that runs offline, so ' + name + ' needs a translation model.';
  }
}

function drawBars(values: number[]): void {
  const fragment = document.createDocumentFragment();
  const bars: HTMLSpanElement[] = [];
  for (let i = 0; i < values.length; i++) {
    const bar = document.createElement('span');
    bar.className = 'wave__bar';
    bar.style.height = Math.max(3, Math.round(values[i] * 100)) + '%';
    fragment.appendChild(bar);
    bars.push(bar);
  }
  el.wave.replaceChildren(fragment);
  (el.wave as HTMLButtonElement & { bars: HTMLSpanElement[] }).bars = bars;
}

function paintPlayhead(): void {
  const duration = el.player.duration || state.duration;
  const ratio = duration ? Math.min(1, el.player.currentTime / duration) : 0;
  const bars = (el.wave as HTMLButtonElement & { bars?: HTMLSpanElement[] }).bars || [];
  const upTo = Math.round(ratio * bars.length);
  for (let i = 0; i < bars.length; i++) {
    bars[i].classList.toggle('is-played', i < upTo);
  }
  paintLiveRow(el.player.currentTime);
}

function paintLiveRow(time: number): void {
  let live = -1;
  for (let i = 0; i < rows.length; i++) {
    if (Number(rows[i].dataset.t) <= time) live = i;
  }
  rows.forEach((row, index) => row.classList.toggle('is-live', index === live));
}

function seekTo(seconds: number): void {
  const duration = el.player.duration || state.duration;
  el.player.currentTime = Math.min(Math.max(0, seconds), duration || 0);
  paintPlayhead();
}

function peaksFromPcm(pcm: Float32Array, count: number): number[] {
  const step = Math.floor(pcm.length / count) || 1;
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = i * step;
    const to = Math.min(from + step, pcm.length);
    let peak = 0;
    for (let j = from; j < to; j += 8) {
      const value = Math.abs(pcm[j]);
      if (value > peak) peak = value;
    }
    peaks.push(Math.min(1, peak * 2.2));
  }
  return peaks;
}

function rowFor(segment: Segment): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.dataset.t = String(segment.start);

  const cellTime = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tc';
  button.dataset.seek = String(segment.start);
  button.textContent = clock(segment.start);
  cellTime.appendChild(button);

  const cellText = document.createElement('td');
  cellText.textContent = segment.text;

  const cellTranslation = document.createElement('td');
  cellTranslation.className = 'tr-line';

  row.append(cellTime, cellText, cellTranslation);
  return row;
}

function clearRows(): void {
  el.tbody.replaceChildren();
  rows = [];
}

function addSegment(segment: Segment): void {
  state.segments.push(segment);
  el.tbody.appendChild(rowFor(segment));
  rows = Array.from(el.tbody.querySelectorAll('tr'));
  updateMeta();
  paintPlayhead();
}

function updateMeta(): void {
  const count = state.segments.length;
  el.metaLines.textContent = count + (count === 1 ? ' line' : ' lines');
  el.metaLength.textContent = state.duration ? state.duration.toFixed(1) + ' s' : 'length unknown';
}

function demoSegments(): Segment[] {
  return DEMO.lines.map((line, index) => ({
    start: line.t,
    end: index + 1 < DEMO.lines.length ? DEMO.lines[index + 1].t : DEMO.clip.duration,
    text: line.text,
  }));
}

function transcriptText(): string {
  const withTranslation = !el.table.classList.contains('is-one-column');
  return rows.map((row) => {
    const time = clock(Number(row.dataset.t));
    const said = row.children[1] ? row.children[1].textContent?.trim() ?? '' : '';
    const read = withTranslation && row.children[2] ? row.children[2].textContent?.trim() ?? '' : '';
    return read
      ? time + '  ' + said + '\n' + ' '.repeat(time.length + 2) + read
      : time + '  ' + said;
  }).join('\n');
}

function toSrt(): string {
  return state.segments.map((segment, index) => {
    const end = segment.end > segment.start ? segment.end : segment.start + 1;
    return (index + 1) + '\n' + stamp(segment.start, true) + ' --> ' + stamp(end, true) + '\n' + segment.text + '\n';
  }).join('\n');
}

function toVtt(): string {
  return 'WEBVTT\n\n' + state.segments.map((segment) => {
    const end = segment.end > segment.start ? segment.end : segment.start + 1;
    return stamp(segment.start, false) + ' --> ' + stamp(end, false) + '\n' + segment.text + '\n';
  }).join('\n');
}

function download(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function guardEmpty(button: HTMLButtonElement): boolean {
  if (state.segments.length) return false;
  flash(button, 'Nothing to export yet');
  return true;
}

async function copyTranscript(): Promise<void> {
  if (guardEmpty(el.copy)) return;
  const text = el.clipName.textContent + '\n\n' + transcriptText();
  try {
    await navigator.clipboard.writeText(text);
    flash(el.copy, 'Copied');
  } catch {
    flash(el.copy, 'Copy blocked by the browser');
  }
}

function downloadVideo(): void {
  const url = state.objectUrl || 'demo.mp4';
  const filename = state.file ? state.file.name : 'demo.mp4';
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  flash(el.videoDl, 'Downloading');
}

async function decodeToPcm(blob: Blob): Promise<Float32Array> {
  const buffer = await blob.arrayBuffer();
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('This browser cannot decode audio.');

  const context = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await context.decodeAudioData(buffer);
  } finally {
    if (context.close) context.close();
  }

  const rate = 16000;
  const frames = Math.max(1, Math.ceil(decoded.duration * rate));
  const offline = new OfflineAudioContext(1, frames, rate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return new Float32Array(rendered.getChannelData(0));
}

async function demoBlob(): Promise<Blob> {
  const response = await fetch('demo.mp4');
  if (!response.ok) throw new Error('The demo clip could not be loaded from this folder.');
  return response.blob();
}

async function sourcePcm(): Promise<Float32Array> {
  if (state.pcm) return state.pcm;
  return decodeToPcm(state.file || (await demoBlob()));
}

function setFill(ratio: number): void {
  el.fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, ratio)) + ')';
}

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.addEventListener('message', onWorkerMessage);
  worker.addEventListener('error', (event) => {
    failRun(new Error(event.message || 'The engine worker could not start.'));
  });
  return worker;
}

function onWorkerMessage(event: MessageEvent): void {
  const message = (event.data || {}) as Record<string, unknown>;
  switch (message.type) {
    case 'status':
      if (typeof message.text === 'string') el.progressLabel.textContent = message.text;
      break;
    case 'download': {
      const progress = Number(message.progress) || 0;
      setFill(progress / 100);
      el.progressLabel.textContent = 'Downloading the model, ' + Math.round(progress) + '% (' + size(Number(message.loaded)) + ' of ' + size(Number(message.total)) + ')';
      break;
    }
    case 'ready':
      el.engineNote.textContent = 'Whisper is running on ' + (message.device === 'webgpu' ? 'WebGPU' : 'the CPU') + '. Nothing is uploaded.';
      break;
    case 'start':
      setFill(0);
      break;
    case 'progress': {
      const done = Number(message.done) || 0;
      const total = Number(message.total) || 0;
      setFill(total ? done / total : 0);
      el.progressLabel.textContent = 'Listening ' + clock(done) + ' of ' + clock(total);
      break;
    }
    case 'segment':
      addSegment(message.segment as Segment);
      break;
    case 'done':
      finishRun(false);
      break;
    case 'cancelled':
      finishRun(true);
      break;
    case 'error':
      failRun(new Error(String(message.text || 'The engine stopped.')));
      break;
    default:
      break;
  }
}

async function runEngine(): Promise<void> {
  const task: Task = el.task.value === 'translate' ? 'translate' : 'transcribe';
  state.busy = true;
  state.runTask = task;
  state.showingDemo = false;
  state.segments = [];
  clearRows();

  el.table.hidden = false;
  el.empty.hidden = true;
  el.failed.hidden = true;
  el.toggle.hidden = true;
  el.note.hidden = true;
  el.progress.hidden = false;
  el.progressLabel.textContent = 'Reading the file';
  setFill(0.02);
  el.run.textContent = 'Stop';
  el.engineNote.textContent = 'Whisper runs in this tab. Nothing is uploaded.';
  updateMeta();

  try {
    const pcm = await sourcePcm();
    state.pcm = null;
    el.progressLabel.textContent = 'Starting the model';
    ensureWorker().postMessage(
      { type: 'run', audio: pcm, model: el.model.value, task, language: el.spoken.value || 'en' },
      [pcm.buffer]
    );
  } catch (error) {
    failRun(error instanceof Error ? error : new Error(String(error)));
  }
}

function stopRun(): void {
  if (worker) worker.postMessage({ type: 'cancel' });
  el.run.textContent = 'Stopping';
}

function finishRun(stopped: boolean): void {
  state.busy = false;
  el.run.textContent = state.segments.length ? 'Transcribe again' : 'Transcribe';
  el.progress.hidden = true;
  setFill(0);
  updateMeta();

  if (!state.segments.length) {
    el.table.hidden = true;
    el.empty.hidden = false;
    el.emptyTitle.textContent = stopped ? 'Stopped before any speech' : 'No speech found in that file';
    el.emptyText.textContent = stopped
      ? 'Nothing was kept. Press Transcribe to run it again.'
      : 'Whisper listened and found no speech. Try a louder recording, or the base model.';
  }

  el.note.hidden = false;
  el.note.textContent = state.runTask === 'translate'
    ? 'English, translated by Whisper during the run.'
    : 'Whisper transcribed the spoken language. English is the only translation that runs offline, so ' + nameOf(el.spoken.value) + ' needs a translation model.';
  // show the BYOK panel once we have a transcript
  if (state.segments.length) el.byok.hidden = false;
}

function failRun(error: Error): void {
  state.busy = false;
  el.run.textContent = 'Transcribe';
  el.progress.hidden = true;
  setFill(0);
  el.table.hidden = true;
  el.empty.hidden = true;
  el.failed.hidden = false;
  const line = el.failed.querySelector('p');
  if (line) line.textContent = String(error.message || error);
  el.engineNote.textContent = 'The engine stopped. Nothing was uploaded.';
}

function once(target: EventTarget, type: string, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    function cleanup(): void {
      clearTimeout(timer);
      target.removeEventListener(type, done);
      target.removeEventListener('error', bad);
    }
    function done(): void { cleanup(); resolve(); }
    function bad(): void { cleanup(); reject(new Error('The browser could not open that file.')); }
    const timer = setTimeout(bad, timeout || 10000);
    target.addEventListener(type, done, { once: true });
    target.addEventListener('error', bad, { once: true });
  });
}

async function loadFile(file: File): Promise<void> {
  const looksMedia = /^(video|audio)\//.test(file.type) || /\.(mp4|mov|webm|mkv|m4a|mp3|wav|ogg|oga|flac|aac)$/i.test(file.name);
  if (!looksMedia) {
    failRun(new Error('That file is not audio or video.'));
    return;
  }

  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = URL.createObjectURL(file);

  state.mode = 'file';
  state.showingDemo = false;
  state.file = file;
  state.pcm = null;
  state.segments = [];
  state.duration = 0;
  el.spoken.value = 'en';

  el.player.src = state.objectUrl;
  el.clipName.textContent = file.name;
  el.frameCap.textContent = file.name;
  el.toggle.hidden = true;
  el.note.hidden = true;
  el.empty.hidden = true;
  el.failed.hidden = true;
  el.byok.hidden = true;
  clearRows();

  try {
    await once(el.player, 'loadedmetadata', 10000);
  } catch (error) {
    failRun(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  state.duration = el.player.duration || 0;
  el.metaSize.textContent = el.player.videoWidth && el.player.videoHeight
    ? el.player.videoWidth + ' by ' + el.player.videoHeight
    : 'audio only';
  updateMeta();

  el.progress.hidden = false;
  el.progressLabel.textContent = 'Reading the file';
  setFill(0.04);

  try {
    const pcm = await decodeToPcm(file);
    state.pcm = pcm;
    drawBars(peaksFromPcm(pcm, BARS));
    paintPlayhead();
  } catch {
    el.wave.hidden = true;
  }

  el.progress.hidden = true;
  await runEngine();
}

function wire(): void {
  rows = Array.from(el.tbody.querySelectorAll('tr'));
  state.segments = demoSegments();
  state.duration = DEMO.clip.duration;

  fillSelect(el.spoken, DEMO_SPOKEN);
  fillSelect(el.byokLang, 'es');
  el.byok.hidden = true;

  drawBars(DEMO.bars);
  applyLanguage('hi');
  paintPlayhead();

  if (location.protocol === 'file:') {
    el.run.disabled = true;
    el.engineNote.textContent = 'Open this page over http. Double click serve.cmd in this folder, then use the address it opens.';
  }

  el.player.addEventListener('timeupdate', paintPlayhead);
  el.player.addEventListener('seeked', paintPlayhead);
  el.player.addEventListener('loadedmetadata', () => {
    if (state.mode === 'demo') {
      state.duration = el.player.duration || DEMO.clip.duration;
      updateMeta();
    }
    paintPlayhead();
  });

  el.wave.addEventListener('click', (event) => {
    const rect = el.wave.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * (el.player.duration || state.duration));
  });
  el.wave.addEventListener('keydown', (event) => {
    const duration = el.player.duration || state.duration;
    if (event.key === 'ArrowRight') { seekTo(el.player.currentTime + duration / 20); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { seekTo(el.player.currentTime - duration / 20); event.preventDefault(); }
  });

  el.table.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('.tc');
    if (button) seekTo(Number((button as HTMLButtonElement).dataset.seek));
  });

  el.toggle.addEventListener('click', () => setTranslation(!state.showTranslation));

  el.copy.addEventListener('click', copyTranscript);
  el.videoDl.addEventListener('click', downloadVideo);
  el.txt.addEventListener('click', () => {
    if (guardEmpty(el.txt)) return;
    download(baseName() + '.txt', el.clipName.textContent + '\n\n' + transcriptText(), 'text/plain');
  });
  el.srt.addEventListener('click', () => {
    if (guardEmpty(el.srt)) return;
    download(baseName() + '.srt', toSrt(), 'application/x-subrip');
  });
  el.vtt.addEventListener('click', () => {
    if (guardEmpty(el.vtt)) return;
    download(baseName() + '.vtt', toVtt(), 'text/vtt');
  });

  el.run.addEventListener('click', () => {
    if (state.busy) stopRun();
    else runEngine();
  });

  el.pick.addEventListener('click', () => el.file.click());
  el.file.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) loadFile(file);
  });

  el.spoken.addEventListener('change', () => applyLanguage(el.spoken.value === 'en' ? 'en' : el.spoken.value));

  el.supportOpen.addEventListener('click', () => {
    if (typeof el.support.showModal === 'function') el.support.showModal();
    else el.support.setAttribute('open', '');
  });
  el.support.addEventListener('click', (event) => {
    if (event.target === el.support) el.support.close();
  });
  el.supportLink.addEventListener('click', (event) => {
    if (el.supportLink.getAttribute('href') === '#') {
      event.preventDefault();
      flash(el.supportLink, 'No link set yet');
    }
  });

  // BYOK Gemini translator
  const KEY_STORAGE = 'tannscribe.geminiKey';
  const storedKey = localStorage.getItem(KEY_STORAGE);
  if (storedKey) el.byokKey.value = storedKey;

  el.byokKey.addEventListener('change', () => {
    localStorage.setItem(KEY_STORAGE, el.byokKey.value.trim());
  });
  el.byokClear.addEventListener('click', () => {
    localStorage.removeItem(KEY_STORAGE);
    el.byokKey.value = '';
    el.byokStatus.textContent = 'Key cleared.';
  });

  el.byokRun.addEventListener('click', async () => {
    const key = el.byokKey.value.trim();
    if (!key) { el.byokStatus.textContent = 'Paste your Gemini API key first.'; return; }
    if (!state.segments.length) { el.byokStatus.textContent = 'Transcribe a file first.'; return; }
    el.byokRun.disabled = true;
    el.byokStatus.textContent = 'Translating...';
    try {
      const targetLang = nameOf(el.byokLang.value);
      const prompt = 'Translate the following subtitles into ' + targetLang + '. Keep the SRT timestamps and numbering exactly as they are. Only translate the text lines. Return only the translated SRT, nothing else.\n\n' + toSrt();
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + encodeURIComponent(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!resp.ok) throw new Error('Gemini returned ' + resp.status);
      const data = await resp.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!out) throw new Error('No translation returned');
      el.byokOut.value = out.trim();
      el.byokStatus.textContent = 'Done. Review before use.';
    } catch (error) {
      el.byokStatus.textContent = 'Failed: ' + (error instanceof Error ? error.message : String(error));
    } finally {
      el.byokRun.disabled = false;
    }
  });

  el.byokDl.addEventListener('click', () => {
    if (!el.byokOut.value.trim()) { el.byokStatus.textContent = 'Nothing to download yet.'; return; }
    download(baseName() + '.' + el.byokLang.value + '.srt', el.byokOut.value, 'application/x-subrip');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}
