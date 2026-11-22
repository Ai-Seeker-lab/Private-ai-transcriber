import { DEMO } from './data';
import type { DemoLang, Segment, Task } from './types';
import { pad, clock, stamp, size, sanitizeFilename } from './format';
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
  dropzone: HTMLDivElement;
  remove: HTMLButtonElement;
  search: HTMLInputElement;
  spoken: HTMLSelectElement;
  task: HTMLSelectElement;
  model: HTMLSelectElement;
  speed: HTMLSelectElement;
  run: HTMLButtonElement;
  engineNote: HTMLParagraphElement;
  cacheStatus: HTMLParagraphElement;
  clearCache: HTMLButtonElement;
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
  mobEdit: HTMLButtonElement;
  mobileEditor: HTMLDialogElement;
  mobileEditorList: HTMLDivElement;
  mobileEditorSave: HTMLButtonElement;
  mobileEditorCancel: HTMLButtonElement;
  onboarding: HTMLDialogElement;
  onboardingSteps: HTMLOListElement;
  onboardingStepLabel: HTMLElement;
  onboardingStepTitle: HTMLHeadingElement;
  onboardingStepText: HTMLParagraphElement;
  onboardingBack: HTMLButtonElement;
  onboardingNext: HTMLButtonElement;
  onboardingRestart: HTMLButtonElement;
  byok: HTMLDetailsElement;
  byokKey: HTMLInputElement;
  byokLang: HTMLSelectElement;
  byokRun: HTMLButtonElement;
  byokOut: HTMLTextAreaElement;
  byokDl: HTMLButtonElement;
  byokStatus: HTMLParagraphElement;
  byokClear: HTMLButtonElement;
  byokPersist: HTMLInputElement;
  stylePanel: HTMLDetailsElement;
  styleSize: HTMLInputElement;
  styleColor: HTMLInputElement;
  styleBg: HTMLInputElement;
  styleBgOpacity: HTMLInputElement;
  styleAlign: HTMLSelectElement;
  stylePos: HTMLSelectElement;
  subtitleOverlay: HTMLDivElement;
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
  dropzone: $('#dropzone'),
  remove: $('#remove'),
  search: $('#search'),
  spoken: $('#spoken'),
  task: $('#task'),
  model: $('#model'),
  speed: $('#speed'),
  run: $('#run'),
  engineNote: $('#engineNote'),
  cacheStatus: $('#cacheStatus'),
  clearCache: $('#clearCache'),
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
  mobEdit: $('.mob-edit'),
  mobileEditor: $('#mobileEditor'),
  mobileEditorList: $('#mobileEditorList'),
  mobileEditorSave: $('#mobileEditorSave'),
  mobileEditorCancel: $('#mobileEditorCancel'),
  onboarding: $('#onboarding'),
  onboardingSteps: $('#onboardingSteps') as HTMLOListElement,
  onboardingStepLabel: $('#onboardingStepLabel'),
  onboardingStepTitle: $('#onboardingStepTitle'),
  onboardingStepText: $('#onboardingStepText'),
  onboardingBack: $('#onboardingBack'),
  onboardingNext: $('#onboardingNext'),
  onboardingRestart: $('#onboardingRestart'),
  byok: $('#byok'),
  byokKey: $('#byokKey'),
  byokLang: $('#byokLang'),
  byokRun: $('#byokRun'),
  byokOut: $('#byokOut'),
  byokDl: $('#byokDl'),
  byokStatus: $('#byokStatus'),
  byokClear: $('#byokClear'),
  byokPersist: $('#byokPersist'),
  stylePanel: $('#stylePanel'),
  styleSize: $('#styleSize'),
  styleColor: $('#styleColor'),
  styleBg: $('#styleBg'),
  styleBgOpacity: $('#styleBgOpacity'),
  styleAlign: $('#styleAlign'),
  stylePos: $('#stylePos'),
  subtitleOverlay: $('#subtitleOverlay'),
} as ElMap;

const BARS = 160;
const SAMPLE_LANGS = ['hi', 'es'];
const DEMO_SPOKEN = 'en';
const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1 GB hard limit
const WARN_FILE_BYTES = 200 * 1024 * 1024; // 200 MB warning

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
  startedAt: number | null;
  elapsedTimer: number | null;
  progressBase: string;
  sessionId: string | null;
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
  startedAt: null,
  elapsedTimer: null,
  progressBase: '',
  sessionId: null,
};

let rows: HTMLTableRowElement[] = [];
let worker: Worker | null = null;
interface Snapshot {
  texts: string[];
  starts: number[];
  ends: number[];
}
let transcriptHistory: Snapshot[] = [];
let historyIndex = -1;
let historyTimer: number | null = null;

function nameOf(code: string): string {
  const hit = DEMO.languages.find((language) => language.code === code);
  return hit ? hit.name : code;
}

function baseName(): string {
  const raw = el.clipName.textContent.replace(/\.[^.]+$/, '') || 'transcript';
  return raw.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 80) || 'transcript';
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
      el.note.textContent = 'This clip is in English. Hindi and Spanish are sample translations - pick one to see them. A real run transcribes the spoken language; English is the only translation that runs offline.';
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

let dragState: {
  seg: Segment;
  div: HTMLDivElement;
  duration: number;
  startX: number;
  origStart: number;
  origEnd: number;
  moved: boolean;
  mode: 'move' | 'resize-start' | 'resize-end';
} | null = null;

function beginSegmentDrag(event: PointerEvent, seg: Segment, div: HTMLDivElement, duration: number): void {
  if (state.busy) return;
  event.preventDefault();
  event.stopPropagation();
  try { div.setPointerCapture(event.pointerId); } catch { /* ignore */ }

  const segRect = div.getBoundingClientRect();
  const edgeZone = Math.min(10, Math.max(6, segRect.width * 0.12));
  const xInSeg = event.clientX - segRect.left;
  const mode: 'move' | 'resize-start' | 'resize-end' = xInSeg <= edgeZone ? 'resize-start' : xInSeg >= segRect.width - edgeZone ? 'resize-end' : 'move';

  div.classList.add('is-dragging');
  dragState = { seg, div, duration, startX: event.clientX, origStart: seg.start, origEnd: seg.end, moved: false, mode };
  const onMove = (e: PointerEvent) => {
    if (!dragState) return;
    const waveRect = el.wave.getBoundingClientRect();
    const mouseTime = ((e.clientX - waveRect.left) / waveRect.width) * dragState.duration;
    if (Math.abs(e.clientX - dragState.startX) > 3) dragState.moved = true;
    const seg = dragState.seg;
    const idx = state.segments.findIndex((s) => s.id === seg.id);
    const prev = idx > 0 ? state.segments[idx - 1] : null;
    const next = idx < state.segments.length - 1 ? state.segments[idx + 1] : null;
    const minDur = 0.3;

    if (dragState.mode === 'move') {
      const len = dragState.origEnd - dragState.origStart;
      let newStart = dragState.origStart + ((e.clientX - dragState.startX) / waveRect.width) * dragState.duration;
      let newEnd = dragState.origEnd + ((e.clientX - dragState.startX) / waveRect.width) * dragState.duration;
      if (newStart < 0) { newStart = 0; newEnd = len; }
      if (newEnd > dragState.duration) { newEnd = dragState.duration; newStart = newEnd - len; }
      if (prev && newStart < prev.end) { newStart = prev.end; newEnd = newStart + len; }
      if (next && newEnd > next.start) { newEnd = next.start; newStart = newEnd - len; }
      if (newStart < 0 || newEnd > dragState.duration || newEnd <= newStart) return;
      seg.start = newStart;
      seg.end = newEnd;
    } else if (dragState.mode === 'resize-start') {
      let newStart = mouseTime;
      if (newStart < 0) newStart = 0;
      if (prev && newStart < prev.end) newStart = prev.end;
      if (newStart > dragState.origEnd - minDur) newStart = dragState.origEnd - minDur;
      if (newStart < 0) return;
      seg.start = newStart;
      seg.end = dragState.origEnd;
    } else if (dragState.mode === 'resize-end') {
      let newEnd = mouseTime;
      if (newEnd > dragState.duration) newEnd = dragState.duration;
      if (next && newEnd > next.start) newEnd = next.start;
      if (newEnd < dragState.origStart + minDur) newEnd = dragState.origStart + minDur;
      if (newEnd > dragState.duration) return;
      seg.start = dragState.origStart;
      seg.end = newEnd;
    }

    dragState.div.style.left = (seg.start / dragState.duration * 100) + '%';
    dragState.div.style.width = Math.max(0.5, (seg.end - seg.start) / dragState.duration * 100) + '%';
  };
  const onUp = () => {
    if (dragState) {
      dragState.div.classList.remove('is-dragging');
    }
    if (dragState && dragState.moved) {
      const row = rows.find((r) => Number(r.dataset.id) === dragState!.seg.id);
      if (row) {
        row.dataset.t = String(dragState!.seg.start);
        const btn = row.querySelector('.tc') as HTMLButtonElement | null;
        if (btn) { btn.dataset.seek = String(dragState!.seg.start); btn.textContent = clock(dragState!.seg.start); }
      }
      scheduleHistoryPush();
      renderWaveSegments();
    } else if (dragState) {
      seekTo(dragState.seg.start);
    }
    dragState = null;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

function renderWaveSegments(): void {
  el.wave.querySelectorAll('.wave__seg').forEach((node) => node.remove());
  const duration = el.player.duration || state.duration;
  if (!duration || !state.segments.length) return;
  for (const seg of state.segments) {
    const div = document.createElement('div');
    div.className = 'wave__seg';
    div.style.left = (seg.start / duration * 100) + '%';
    div.style.width = Math.max(0.5, (seg.end - seg.start) / duration * 100) + '%';
    div.title = seg.text;
    div.dataset.id = String(seg.id ?? '');
    div.addEventListener('pointerdown', (event) => beginSegmentDrag(event, seg, div, duration));
    el.wave.appendChild(div);
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

function updateSubtitleOverlay(time: number): void {
  const seg = state.segments.find((s, i) => {
    const next = state.segments[i + 1];
    return time >= s.start && (next ? time < next.start : time <= s.end);
  }) || state.segments.find((s) => time >= s.start && time <= s.end);
  if (seg && seg.text) {
    el.subtitleOverlay.textContent = seg.text;
    el.subtitleOverlay.hidden = false;
  } else {
    el.subtitleOverlay.textContent = '';
    el.subtitleOverlay.hidden = true;
  }
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
  updateSubtitleOverlay(el.player.currentTime);
}

function paintLiveRow(time: number): void {
  let live = -1;
  for (let i = 0; i < rows.length; i++) {
    if (Number(rows[i].dataset.t) <= time) live = i;
  }
  rows.forEach((row, index) => {
    const isActive = index === live;
    row.classList.toggle('is-live', isActive);
    if (isActive && row.scrollIntoView) {
      try { row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch { /* ignore */ }
    }
  });
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

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}
function parseTimeInput(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const parts = t.split(':');
    let seconds = 0;
    for (const part of parts) {
      const n = parseFloat(part);
      if (isNaN(n)) return null;
      seconds = seconds * 60 + n;
    }
    return seconds >= 0 ? seconds : null;
  }
  const n = parseFloat(t);
  return isNaN(n) || n < 0 ? null : n;
}

function attachTimeEditor(button: HTMLButtonElement, row: HTMLTableRowElement): void {
  button.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const id = Number(row.dataset.id);
    const seg = state.segments.find((s) => s.id === id);
    if (!seg || state.busy) return;

    const cell = button.parentElement as HTMLTableCellElement;
    const startInput = document.createElement('input');
    startInput.type = 'text';
    startInput.value = seg.start.toFixed(1);
    startInput.className = 'time-input';
    startInput.setAttribute('aria-label', 'Start time in seconds');
    const endInput = document.createElement('input');
    endInput.type = 'text';
    endInput.value = seg.end.toFixed(1);
    endInput.className = 'time-input';
    endInput.setAttribute('aria-label', 'End time in seconds');

    const apply = () => {
      const newStart = parseTimeInput(startInput.value);
      const newEnd = parseTimeInput(endInput.value);
      if (newStart === null || newEnd === null || newEnd <= newStart) {
        cell.replaceChildren(button);
        return;
      }
      const idx = state.segments.findIndex((s) => s.id === id);
      const prev = idx > 0 ? state.segments[idx - 1] : null;
      const next = idx < state.segments.length - 1 ? state.segments[idx + 1] : null;
      if (prev && newStart < prev.end) { cell.replaceChildren(button); return; }
      if (next && newEnd > next.start) { cell.replaceChildren(button); return; }
      seg.start = newStart;
      seg.end = newEnd;
      row.dataset.t = String(newStart);
      button.dataset.seek = String(newStart);
      button.textContent = clock(newStart);
      cell.replaceChildren(button);
      scheduleHistoryPush();
    };

    const wrap = document.createElement('span');
    wrap.className = 'time-edit';
    wrap.append(startInput, document.createTextNode(' – '), endInput);
    cell.replaceChildren(wrap);
    startInput.focus();
    startInput.select();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
      if (e.key === 'Escape') { e.preventDefault(); cell.replaceChildren(button); }
    };
    startInput.addEventListener('keydown', onKey);
    endInput.addEventListener('keydown', onKey);
    cell.addEventListener('focusout', (e) => {
      const related = e.relatedTarget as Node | null;
      if (related && cell.contains(related)) return;
      // defer to allow the other input to receive focus
      setTimeout(() => {
        if (!cell.contains(document.activeElement)) apply();
      }, 0);
    }, { once: true });
  });
}
function attachEditHandlers(cell: HTMLTableCellElement, row: HTMLTableRowElement): void {
  cell.contentEditable = 'true';
  cell.spellcheck = true;
  cell.setAttribute('aria-label', 'Transcript text, editable');
  const sync = () => {
    const id = Number(row.dataset.id);
    const seg = state.segments.find((s) => s.id === id);
    if (seg) seg.text = cell.textContent?.trim() ?? '';
    scheduleHistoryPush();
  };
  cell.addEventListener('input', sync);
  cell.addEventListener('blur', sync);
}

function rowFor(segment: Segment): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.dataset.t = String(segment.start);
  row.dataset.id = String(segment.id ?? '');

  const cellTime = document.createElement('td');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tc';
  button.dataset.seek = String(segment.start);
  button.textContent = clock(segment.start);
  cellTime.appendChild(button);
  attachTimeEditor(button, row);

  const cellText = document.createElement('td');
  cellText.textContent = segment.text;
  attachEditHandlers(cellText, row);
  if (state.busy) cellText.contentEditable = 'false';

  const cellTranslation = document.createElement('td');
  cellTranslation.className = 'tr-line';

  row.append(cellTime, cellText, cellTranslation);
  return row;
}

function clearRows(): void {
  el.tbody.replaceChildren();
  rows = [];
}

function filterTranscript(query: string): void {
  const needle = query.trim().toLowerCase();
  for (const row of rows) {
    const text = (row.textContent || '').toLowerCase();
    row.hidden = needle.length > 0 && !text.includes(needle);
  }
}

function addSegment(segment: Segment): void {
  state.segments.push(segment);
  el.tbody.appendChild(rowFor(segment));
  rows = Array.from(el.tbody.querySelectorAll('tr'));
  updateMeta();
  paintPlayhead();
  renderWaveSegments();
}

function updateMeta(): void {
  const count = state.segments.length;
  el.metaLines.textContent = count + (count === 1 ? ' line' : ' lines');
  el.metaLength.textContent = state.duration ? state.duration.toFixed(1) + ' s' : 'length unknown';
}

function demoSegments(): Segment[] {
  return DEMO.lines.map((line, index) => ({
    id: index,
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
  if (!state.objectUrl) {
    window.alert('No video is loaded. Drop a video file first.');
    return;
  }
  const url = state.objectUrl;
  const filename = state.file ? state.file.name : 'clip.mp4';
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
  } catch {
    if (context.close) context.close();
    throw new Error('This browser cannot decode that file. Try MP3, WAV, M4A, MP4, MOV, WebM or OGG.');
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

function elapsedSeconds(): number {
  return state.startedAt ? Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)) : 0;
}

function renderProgress(): void {
  const elapsed = elapsedSeconds();
  const suffix = state.startedAt ? '  ·  ' + elapsed + 's' : '';
  el.progressLabel.textContent = state.progressBase + suffix;
}

function setProgressBase(text: string): void {
  state.progressBase = text;
  renderProgress();
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
  const incomingSession = typeof message.sessionId === 'string' ? message.sessionId : null;
  if (incomingSession && state.sessionId && incomingSession !== state.sessionId) return;
  switch (message.type) {
    case 'status':
      if (typeof message.text === 'string') setProgressBase(message.text);
      break;
    case 'download': {
      const progress = Number(message.progress) || 0;
      setFill(progress / 100);
      setProgressBase('Downloading the model, ' + Math.round(progress) + '% (' + size(Number(message.loaded)) + ' of ' + size(Number(message.total)) + ')');
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
      setProgressBase('Listening ' + clock(done) + ' of ' + clock(total));
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
  if (state.busy) return;
  const task: Task = el.task.value === 'translate' ? 'translate' : 'transcribe';
  state.busy = true;
  state.runTask = task;
  state.showingDemo = false;
  state.segments = [];
  state.sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
  clearRows();

  el.table.hidden = false;
  el.empty.hidden = true;
  el.failed.hidden = true;
  el.toggle.hidden = true;
  el.note.hidden = true;
  el.progress.hidden = false;
  setProgressBase('Reading the file');
  setFill(0.02);
  el.run.textContent = 'Stop';
  el.engineNote.textContent = 'Whisper runs in this tab. Nothing is uploaded.';
  updateMeta();

  state.startedAt = Date.now();
  if (state.elapsedTimer) window.clearInterval(state.elapsedTimer);
  state.elapsedTimer = window.setInterval(renderProgress, 1000);

  try {
    const pcm = await sourcePcm();
    state.pcm = null;
    setProgressBase('Extracting audio');
    setFill(0.06);
    ensureWorker().postMessage(
      { type: 'run', audio: pcm, model: el.model.value, task, language: el.spoken.value || 'en', sessionId: state.sessionId },
      [pcm.buffer]
    );
  } catch (error) {
    failRun(error instanceof Error ? error : new Error(String(error)));
  }
}

function stopRun(): void {
  if (worker) worker.postMessage({ type: 'cancel', sessionId: state.sessionId });
  el.run.disabled = true;
  el.run.textContent = 'Cancelling…';
}

function finishRun(stopped: boolean): void {
  if (state.elapsedTimer) { window.clearInterval(state.elapsedTimer); state.elapsedTimer = null; }
  state.startedAt = null;
  state.busy = false;
  el.run.disabled = false;
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
  const spoken = el.spoken.value;
  if (state.runTask === 'translate') {
    el.note.textContent = 'English, translated by Whisper during the run.';
  } else if (spoken === 'en') {
    el.note.textContent = 'Whisper transcribed the spoken language, which is English.';
  } else {
    el.note.textContent = 'Whisper transcribed ' + nameOf(spoken) + '. Set Task to Translate to English for an English version.';
  }
  // show the BYOK panel once we have a transcript
  if (state.segments.length) {
    el.byok.hidden = false;
    pushHistoryNow();
  }
  for (const row of rows) {
    const cell = row.children[1] as HTMLTableCellElement | null;
    if (cell) cell.contentEditable = 'true';
  }
  refreshCacheStatus();
}

function failRun(error: Error): void {
  if (state.elapsedTimer) { window.clearInterval(state.elapsedTimer); state.elapsedTimer = null; }
  state.startedAt = null;
  state.busy = false;
  el.run.disabled = false;
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
  if (state.busy) {
    window.alert('A transcription is already running. Stop it first, or wait for it to finish.');
    return;
  }

  if (state.segments.length > 0) {
    const ok = window.confirm('This will replace the current transcript. Continue?');
    if (!ok) return;
  }

  if (!file || file.size === 0) {
    failRun(new Error('That file is empty.'));
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    failRun(new Error('That file is too large (' + size(file.size) + '). The limit is ' + size(MAX_FILE_BYTES) + '.'));
    return;
  }
  if (file.size > WARN_FILE_BYTES) {
    const ok = window.confirm('This file is ' + size(file.size) + ' and may take a long time and a lot of memory. Continue?');
    if (!ok) return;
  }

  const looksMedia = /^(video|audio)\//.test(file.type) || /\.(mp4|mov|webm|mkv|m4a|mp3|wav|ogg|oga|flac|aac)$/i.test(file.name);
  if (!looksMedia) {
    failRun(new Error('That file is not audio or video. Supported: MP3, MP4, WAV, M4A, MOV, WebM, OGG.'));
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
  el.remove.hidden = false;
  clearRows();

  try {
    await once(el.player, 'loadedmetadata', 10000);
  } catch (error) {
    failRun(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  state.duration = el.player.duration || 0;
  el.metaSize.textContent = (el.player.videoWidth && el.player.videoHeight
    ? el.player.videoWidth + ' by ' + el.player.videoHeight
    : 'audio only') + '  ·  ' + size(file.size);
  updateMeta();

  el.progress.hidden = false;
  const isVideo = !!el.player.videoWidth;
  el.progressLabel.textContent = isVideo ? 'Extracting audio from video' : 'Reading audio';
  setFill(0.04);

  try {
    const pcm = await decodeToPcm(file);
    state.pcm = pcm;
    drawBars(peaksFromPcm(pcm, BARS));
    paintPlayhead();
    renderWaveSegments();
  } catch {
    el.wave.hidden = true;
  }

  el.progress.hidden = true;
  await runEngine();
}

// ---------- model cache (Cache API, transformers.js default) ----------
async function inspectModelCache(): Promise<{ cached: boolean; bytes: number; entries: number }> {
  try {
    if (!('caches' in window)) return { cached: false, bytes: 0, entries: 0 };
    const names = await caches.keys();
    let target: Cache | null = null;
    for (const name of names) {
      const c = await caches.open(name);
      const keys = await c.keys();
      if (keys.some((k) => /whisper|\.onnx|transformers/i.test(k.url))) { target = c; break; }
    }
    if (!target) {
      try { target = await caches.open('transformers-cache'); } catch { /* ignore */ }
    }
    if (!target) return { cached: false, bytes: 0, entries: 0 };
    const keys = await target.keys();
    let bytes = 0;
    for (const req of keys) {
      try {
        const res = await target.match(req);
        if (res) bytes += (await res.clone().arrayBuffer()).byteLength;
      } catch { /* ignore */ }
    }
    const relevant = keys.filter((k) => /whisper|\.onnx/i.test(k.url));
    return { cached: relevant.length > 0, bytes, entries: relevant.length || keys.length };
  } catch {
    return { cached: false, bytes: 0, entries: 0 };
  }
}

async function clearModelCache(): Promise<void> {
  try {
    const names = await caches.keys();
    for (const name of names) {
      if (/transformers|whisper/i.test(name)) await caches.delete(name);
    }
    await caches.delete('transformers-cache');
  } catch { /* ignore */ }
}

async function refreshCacheStatus(): Promise<void> {
  const info = await inspectModelCache();
  if (info.cached) {
    const mb = info.bytes ? (info.bytes / (1024 * 1024)).toFixed(0) + ' MB' : 'unknown size';
    el.cacheStatus.textContent = 'Model cache: ready (' + info.entries + ' files, ' + mb + '). Repeat runs skip the download.';
  } else {
    el.cacheStatus.textContent = 'Model cache: empty. The first transcription downloads the model (~40-140 MB).';
  }
}

// ---------- transcript history (undo/redo) ----------
function snapshot(): Snapshot {
  return {
    texts: state.segments.map((segment) => segment.text),
    starts: state.segments.map((segment) => segment.start),
    ends: state.segments.map((segment) => segment.end),
  };
}

function pushHistoryNow(): void {
  const snap = snapshot();
  transcriptHistory = transcriptHistory.slice(0, historyIndex + 1);
  if (historyIndex >= 0 && JSON.stringify(transcriptHistory[historyIndex]) === JSON.stringify(snap)) return;
  transcriptHistory.push(snap);
  historyIndex = transcriptHistory.length - 1;
}

function scheduleHistoryPush(): void {
  if (historyTimer) window.clearTimeout(historyTimer);
  historyTimer = window.setTimeout(pushHistoryNow, 600);
}

function applyHistory(snap: Snapshot): void {
  const count = Math.min(state.segments.length, snap.texts.length);
  for (let i = 0; i < count; i++) {
    state.segments[i].text = snap.texts[i];
    state.segments[i].start = snap.starts[i];
    state.segments[i].end = snap.ends[i];
  }
  for (let i = 0; i < rows.length && i < count; i++) {
    const row = rows[i];
    const seg = state.segments[i];
    row.dataset.t = String(seg.start);
    const btn = row.querySelector('.tc') as HTMLButtonElement | null;
    if (btn) { btn.dataset.seek = String(seg.start); btn.textContent = clock(seg.start); }
    const cell = row.children[1] as HTMLTableCellElement | null;
    if (cell) cell.textContent = seg.text;
  }
  renderWaveSegments();
  paintPlayhead();
}

function undoHistory(): boolean {
  if (historyIndex <= 0) return false;
  historyIndex--;
  applyHistory(transcriptHistory[historyIndex]);
  return true;
}

function redoHistory(): boolean {
  if (historyIndex >= transcriptHistory.length - 1) return false;
  historyIndex++;
  applyHistory(transcriptHistory[historyIndex]);
  return true;
}

function wire(): void {
  rows = Array.from(el.tbody.querySelectorAll('tr'));
  state.segments = demoSegments();
  state.duration = DEMO.clip.duration;

  for (let i = 0; i < rows.length; i++) {
    rows[i].dataset.id = String(i);
    const cell = rows[i].children[1] as HTMLTableCellElement | null;
    if (cell) attachEditHandlers(cell, rows[i]);
    const timeBtn = rows[i].querySelector('.tc') as HTMLButtonElement | null;
    if (timeBtn) attachTimeEditor(timeBtn, rows[i]);
  }

  pushHistoryNow();

  fillSelect(el.spoken, DEMO_SPOKEN);
  fillSelect(el.byokLang, 'es');
  el.byok.hidden = true;

  drawBars(DEMO.bars);
  applyLanguage('hi');
  paintPlayhead();
  renderWaveSegments();

  // guided onboarding tour (first visit only)
  let onboardingStep = 1;
  const ONBOARDING_STEPS = 3;
  const ONBOARDING_TEXT: Record<number, { title: string; text: string }> = {
    1: { title: 'Step 1: Upload', text: 'Drop an audio or video file into the drop zone, or press Choose a video. MP4, MOV, WebM, M4A, MP3, WAV, OGG are supported.' },
    2: { title: 'Step 2: Transcribe and edit', text: 'Press Transcribe. Whisper listens in this tab and writes the transcript with timestamps. You can edit any line or its start and end times.' },
    3: { title: 'Step 3: Preview and export', text: 'Subtitles play over your video. Style them, then copy or download TXT, SRT or VTT.' },
  };
  function renderOnboardingStep(): void {
    const step = Math.min(onboardingStep, ONBOARDING_STEPS);
    el.onboardingStepLabel.textContent = 'Step ' + step + ' of ' + ONBOARDING_STEPS;
    el.onboardingStepTitle.textContent = ONBOARDING_TEXT[step].title;
    el.onboardingStepText.textContent = ONBOARDING_TEXT[step].text;
    el.onboardingBack.hidden = step <= 1;
    el.onboardingNext.textContent = step >= ONBOARDING_STEPS ? 'Finish' : 'Next';
    const dots = el.onboardingSteps.querySelectorAll<HTMLElement>('.onboarding__step');
    dots.forEach((dot, index) => {
      const current = index + 1 === step;
      dot.classList.toggle('is-current', current);
      if (current) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
  }
  function closeOnboarding(): void {
    el.onboarding.close();
    try { localStorage.setItem('tannscribe.onboardingDone', '1'); } catch { /* ignore */ }
  }
  function openOnboarding(): void {
    onboardingStep = 1;
    renderOnboardingStep();
    el.onboarding.showModal();
  }
  el.onboardingNext.addEventListener('click', () => {
    if (onboardingStep >= ONBOARDING_STEPS) closeOnboarding();
    else { onboardingStep += 1; renderOnboardingStep(); }
  });
  el.onboardingBack.addEventListener('click', () => {
    if (onboardingStep > 1) { onboardingStep -= 1; renderOnboardingStep(); }
  });
  el.onboarding.addEventListener('submit', (event) => {
    event.preventDefault();
    closeOnboarding();
  });
  el.onboarding.addEventListener('cancel', () => closeOnboarding());
  el.onboardingRestart.addEventListener('click', () => openOnboarding());
  try {
    if (localStorage.getItem('tannscribe.onboardingDone') !== '1') openOnboarding();
  } catch { /* ignore */ }
  if (location.protocol === 'file:') {
    el.run.disabled = true;
    el.engineNote.textContent = 'Open this page over http. Double click serve.cmd in this folder, then use the address it opens.';
  }

  // Low-end device hint
  try {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency || 0;
    if ((memory && memory <= 4) || (cores && cores <= 2)) {
      el.model.value = 'tiny';
      el.engineNote.textContent = 'Low-memory device detected. Using Whisper tiny for stability. You can switch to base manually.';
    }
  } catch { /* ignore */ }

  window.addEventListener('beforeunload', (event) => {
    if (state.segments.length > 0) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

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
    el.file.value = '';
  });

  el.remove.addEventListener('click', () => {
    if (state.busy) return;
    if (state.objectUrl) { URL.revokeObjectURL(state.objectUrl); state.objectUrl = null; }
    state.mode = 'demo';
    state.showingDemo = true;
    state.file = null;
    state.pcm = null;
    state.segments = demoSegments();
    state.duration = DEMO.clip.duration;
    el.player.removeAttribute('src');
    el.player.load();
    el.clipName.textContent = DEMO.clip.name;
    el.frameCap.textContent = DEMO.clip.source + ', ' + DEMO.clip.duration.toFixed(1) + ' s';
    el.metaSize.textContent = DEMO.clip.width + ' by ' + DEMO.clip.height;
    updateMeta();
    clearRows();
    for (const seg of state.segments) el.tbody.appendChild(rowFor(seg));
    rows = Array.from(el.tbody.querySelectorAll('tr'));
    drawBars(DEMO.bars);
    applyLanguage('en');
    el.spoken.value = 'en';
    el.byok.hidden = true;
    el.remove.hidden = true;
    el.search.value = '';
    filterTranscript('');
  });

  // Drag and drop
  const dropzone = el.dropzone;
  const prevent = (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); };
  dropzone.addEventListener('dragenter', (event) => { prevent(event); dropzone.classList.add('is-dragging'); });
  dropzone.addEventListener('dragover', (event) => { prevent(event); dropzone.classList.add('is-dragging'); });
  dropzone.addEventListener('dragleave', (event) => { prevent(event); dropzone.classList.remove('is-dragging'); });
  dropzone.addEventListener('drop', (event) => {
    prevent(event);
    dropzone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });
  dropzone.addEventListener('click', () => el.file.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.file.click(); }
  });

  // Search
  el.search.addEventListener('input', () => filterTranscript(el.search.value));

  el.spoken.addEventListener('change', () => applyLanguage(el.spoken.value === 'en' ? 'en' : el.spoken.value));

  el.speed.addEventListener('change', () => {
    const rate = parseFloat(el.speed.value) || 1;
    el.player.playbackRate = rate;
  });

  // subtitle styling controls
  const applyStyle = () => {
    const overlay = el.subtitleOverlay;
    overlay.style.fontSize = el.styleSize.value + 'px';
    overlay.style.color = el.styleColor.value;
    const bg = el.styleBg.value;
    const opacity = (parseInt(el.styleBgOpacity.value, 10) || 0) / 100;
    overlay.style.backgroundColor = hexToRgba(bg, opacity);
    overlay.style.textAlign = el.styleAlign.value;
    overlay.classList.remove('pos-top', 'pos-middle', 'pos-bottom');
    overlay.classList.add('pos-' + el.stylePos.value);
  };
  for (const id of ['styleSize', 'styleColor', 'styleBg', 'styleBgOpacity', 'styleAlign', 'stylePos']) {
    el[id as keyof ElMap].addEventListener('input', applyStyle);
    el[id as keyof ElMap].addEventListener('change', applyStyle);
  }
  applyStyle();

  document.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      if (undoHistory()) { event.preventDefault(); }
    } else if ((key === 'z' && event.shiftKey) || key === 'y') {
      if (redoHistory()) { event.preventDefault(); }
    }
  });

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

  function openMobileEditor(): void {
    const list = el.mobileEditorList;
    list.replaceChildren();
    for (const seg of state.segments) {
      const entry = document.createElement('div');
      entry.className = 'mobile-editor__row';
      entry.dataset.id = String(seg.id ?? '');
      const startField = document.createElement('label');
      startField.className = 'mobile-editor__field';
      const startInput = document.createElement('input');
      startInput.type = 'number';
      startInput.min = '0';
      startInput.step = '0.1';
      startInput.value = seg.start.toFixed(1);
      startInput.dataset.role = 'start';
      startField.append(document.createTextNode('Start'), startInput);
      const endField = document.createElement('label');
      endField.className = 'mobile-editor__field';
      const endInput = document.createElement('input');
      endInput.type = 'number';
      endInput.min = '0';
      endInput.step = '0.1';
      endInput.value = seg.end.toFixed(1);
      endInput.dataset.role = 'end';
      endField.append(document.createTextNode('End'), endInput);
      entry.append(startField, endField);
      list.appendChild(entry);
    }
    el.mobileEditor.showModal();
  }

  function saveMobileEditor(): void {
    const entries = Array.from(el.mobileEditorList.querySelectorAll<HTMLElement>('.mobile-editor__row'));
    const changes: { seg: Segment; start: number; end: number }[] = [];
    for (const entry of entries) {
      const id = Number(entry.dataset.id);
      const startInput = entry.querySelector<HTMLInputElement>('[data-role="start"]');
      const endInput = entry.querySelector<HTMLInputElement>('[data-role="end"]');
      if (!startInput || !endInput) continue;
      const newStart = parseFloat(startInput.value);
      const newEnd = parseFloat(endInput.value);
      if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) continue;
      const idx = state.segments.findIndex((s) => s.id === id);
      const seg = idx >= 0 ? state.segments[idx] : null;
      if (!seg) continue;
      const prev = idx > 0 ? state.segments[idx - 1] : null;
      const next = idx < state.segments.length - 1 ? state.segments[idx + 1] : null;
      if (prev && newStart < prev.end) continue;
      if (next && newEnd > next.start) continue;
      changes.push({ seg, start: newStart, end: newEnd });
    }
    if (changes.length) {
      for (const change of changes) {
        change.seg.start = change.start;
        change.seg.end = change.end;
      }
      pushHistoryNow();
      for (let i = 0; i < rows.length && i < state.segments.length; i++) {
        const rowEl = rows[i];
        const seg = state.segments[i];
        if (!seg) break;
        rowEl.dataset.t = String(seg.start);
        const btn = rowEl.querySelector('.tc') as HTMLButtonElement | null;
        if (btn) { btn.dataset.seek = String(seg.start); btn.textContent = clock(seg.start); }
      }
      renderWaveSegments();
      paintPlayhead();
    }
    el.mobileEditor.close();
  }

  el.mobEdit.addEventListener('click', () => {
    if (!state.segments.length) { el.byokStatus.textContent = 'Transcribe a file first.'; return; }
    openMobileEditor();
  });
  el.mobileEditorSave.addEventListener('click', () => saveMobileEditor());
  el.mobileEditorCancel.addEventListener('click', () => el.mobileEditor.close());
  el.mobileEditor.addEventListener('cancel', () => el.mobileEditor.close());

  // BYOK Gemini translator
  const KEY_STORAGE = 'tannscribe.geminiKey';
  const KEY_PERSIST = 'tannscribe.geminiKey.persist';

  function readStoredKey(): string {
    try {
      if (localStorage.getItem(KEY_PERSIST) === '1') return localStorage.getItem(KEY_STORAGE) || '';
      return sessionStorage.getItem(KEY_STORAGE) || '';
    } catch {
      return '';
    }
  }
  function writeStoredKey(value: string): void {
    try {
      if (el.byokPersist.checked) {
        localStorage.setItem(KEY_STORAGE, value);
        localStorage.setItem(KEY_PERSIST, '1');
        sessionStorage.removeItem(KEY_STORAGE);
      } else {
        sessionStorage.setItem(KEY_STORAGE, value);
        localStorage.removeItem(KEY_STORAGE);
        localStorage.removeItem(KEY_PERSIST);
      }
    } catch {
      // storage may be unavailable (private mode); keep the key in memory only
    }
  }
  function clearStoredKey(): void {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
      localStorage.removeItem(KEY_STORAGE);
      localStorage.removeItem(KEY_PERSIST);
    } catch { /* ignore */ }
  }

  const storedKey = readStoredKey();
  if (storedKey) {
    el.byokKey.value = storedKey;
    el.byokPersist.checked = localStorage.getItem(KEY_PERSIST) === '1';
  }

  el.byokPersist.addEventListener('change', () => {
    const value = el.byokKey.value.trim();
    if (value) writeStoredKey(value);
  });
  el.byokKey.addEventListener('change', () => {
    const value = el.byokKey.value.trim();
    if (value) writeStoredKey(value);
    else clearStoredKey();
  });
  el.byokClear.addEventListener('click', () => {
    clearStoredKey();
    el.byokKey.value = '';
    el.byokPersist.checked = false;
    el.byokStatus.textContent = 'Key cleared.';
  });

  el.byokRun.addEventListener('click', async () => {
    const key = el.byokKey.value.trim();
    if (!key) { el.byokStatus.textContent = 'Paste your Gemini API key first.'; return; }
    if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) {
      el.byokStatus.textContent = 'That does not look like a Gemini key (they usually start with AIza).';
      return;
    }
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
      if (resp.status === 400) throw new Error('Bad request. Check the transcript and try again.');
      if (resp.status === 401 || resp.status === 403) throw new Error('The API key was rejected. Check it and try again.');
      if (resp.status === 429) throw new Error('Rate limit reached. Wait a moment and retry.');
      if (resp.status >= 500) throw new Error('Gemini is unavailable right now. Try again later.');
      if (!resp.ok) throw new Error('Gemini returned ' + resp.status + '.');
      const data = await resp.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!out) throw new Error('No translation returned. The model may have refused the request.');
      el.byokOut.value = out.trim();
      el.byokStatus.textContent = 'Done. Review before use.';
      writeStoredKey(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
        el.byokStatus.textContent = 'Network error. Check your connection and retry.';
      } else {
        el.byokStatus.textContent = 'Failed: ' + message;
      }
    } finally {
      el.byokRun.disabled = false;
    }
  });

  el.byokDl.addEventListener('click', () => {
    if (!el.byokOut.value.trim()) { el.byokStatus.textContent = 'Nothing to download yet.'; return; }
    download(baseName() + '.' + el.byokLang.value + '.srt', el.byokOut.value, 'application/x-subrip');
  });

  el.clearCache.addEventListener('click', async () => {
    el.clearCache.disabled = true;
    el.cacheStatus.textContent = 'Clearing cache…';
    await clearModelCache();
    await refreshCacheStatus();
    el.clearCache.disabled = false;
  });

  refreshCacheStatus();
  scheduleNativeAd();
}

// ---------- Adsterra native banner ----------
// The network fixes both the container id and the script URL, so they live here
// as constants rather than being edited in two places.
const NATIVE_AD_ID = '4088cc0abf2b2b1c016fe346107b415b';
const NATIVE_AD_SRC = 'https://bellnewyork.org/21/4088cc0abf2b2b1c016fe346107b415b';

function mountNativeAd(): void {
  // The network injects into this exact element, so it has to exist first.
  const slot = document.getElementById('container-' + NATIVE_AD_ID);
  if (!slot) return;

  // Idempotent: the loader can run again on a hot reload or a second mount
  // without stacking a duplicate script tag, which would double the requests.
  if (document.querySelector('script[data-native-ad="' + NATIVE_AD_ID + '"]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.setAttribute('data-cfasync', 'false');
  script.setAttribute('data-native-ad', NATIVE_AD_ID);
  script.src = NATIVE_AD_SRC;
  script.addEventListener('error', () => hideNativeAd());
  document.body.appendChild(script);

  // The network can decline to fill: an ad blocker, a blocked region, or an
  // origin it does not recognise. Rather than leave a labelled empty band,
  // collapse the section if nothing has rendered after a fair wait.
  const giveUp = window.setTimeout(() => {
    if (slot.childElementCount === 0 || slot.clientHeight === 0) hideNativeAd();
  }, 15000);

  const observer = new MutationObserver(() => {
    if (slot.childElementCount > 0) {
      observer.disconnect();
      window.clearTimeout(giveUp);
    }
  });
  observer.observe(slot, { childList: true, subtree: true });
}

function hideNativeAd(): void {
  const slot = document.getElementById('container-' + NATIVE_AD_ID);
  const section = slot ? slot.closest('.native-ad') : null;
  if (section instanceof HTMLElement) section.hidden = true;
}

function scheduleNativeAd(): void {
  // Deferred to idle so the ad request never competes with decoding, the model
  // download or the transcription loop for bandwidth and main-thread time.
  const idle = (window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;

  if (typeof idle === 'function') idle(mountNativeAd, { timeout: 3000 });
  else window.setTimeout(mountNativeAd, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire);
} else {
  wire();
}
