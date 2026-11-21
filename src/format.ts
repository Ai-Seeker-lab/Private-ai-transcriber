// Pure formatting helpers. Kept framework-free so they can be unit tested
// without a DOM or a browser transcription engine.

export function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

export function clock(seconds: number): string {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const rest = value - minutes * 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}

export function stamp(seconds: number, comma: boolean): string {
  const total = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const secs = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${comma ? ',' : '.'}${pad(ms, 3)}`;
}

export function size(bytes: number): string {
  if (!bytes) return '0 KB';
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? Math.round(bytes / 1024) + ' KB' : mb.toFixed(0) + ' MB';
}

export function sanitizeFilename(name: string): string {
  const raw = (name || '').replace(/\.[^.]+$/, '') || 'transcript';
  return raw.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 80) || 'transcript';
}

export function toSrtText(segments: { start: number; end: number; text: string }[]): string {
  return segments.map((segment, index) => {
    const end = segment.end > segment.start ? segment.end : segment.start + 1;
    const total = (v: number) => {
      const t = Math.max(0, Math.round(v * 1000));
      const h = Math.floor(t / 3600000);
      const m = Math.floor((t % 3600000) / 60000);
      const s = Math.floor((t % 60000) / 1000);
      const ms = t % 1000;
      return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
    };
    return (index + 1) + '\n' + total(segment.start) + ' --> ' + total(end) + '\n' + segment.text + '\n';
  }).join('\n');
}

export function toVttText(segments: { start: number; end: number; text: string }[]): string {
  return 'WEBVTT\n\n' + segments.map((segment) => {
    const end = segment.end > segment.start ? segment.end : segment.start + 1;
    const total = (v: number) => {
      const t = Math.max(0, Math.round(v * 1000));
      const h = Math.floor(t / 3600000);
      const m = Math.floor((t % 3600000) / 60000);
      const s = Math.floor((t % 60000) / 1000);
      const ms = t % 1000;
      return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
    };
    return total(segment.start) + ' --> ' + total(end) + '\n' + segment.text + '\n';
  }).join('\n');
}
