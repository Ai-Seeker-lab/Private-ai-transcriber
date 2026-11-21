import { describe, it, expect } from 'vitest';
import { pad, clock, stamp, size, sanitizeFilename, toSrtText, toVttText } from '../../src/format';

describe('pad', () => {
  it('pads to width', () => {
    expect(pad(5)).toBe('05');
    expect(pad(5, 3)).toBe('005');
    expect(pad(12)).toBe('12');
  });
});

describe('clock', () => {
  it('formats seconds', () => {
    expect(clock(0)).toBe('0:00.0');
    expect(clock(65.4)).toBe('1:05.4');
    expect(clock(59.9)).toBe('0:59.9');
  });
  it('clamps negatives and NaN', () => {
    expect(clock(-5)).toBe('0:00.0');
    expect(clock(NaN)).toBe('0:00.0');
  });
});

describe('stamp', () => {
  it('uses comma for SRT', () => {
    expect(stamp(1.5, true)).toBe('00:00:01,500');
  });
  it('uses dot for VTT', () => {
    expect(stamp(1.5, false)).toBe('00:00:01.500');
  });
  it('handles hours', () => {
    expect(stamp(3661.25, true)).toBe('01:01:01,250');
  });
});

describe('size', () => {
  it('formats bytes', () => {
    expect(size(0)).toBe('0 KB');
    expect(size(512)).toBe('1 KB'); // rounds 0.5 KB to 1
    expect(size(1024 * 1024)).toBe('1 MB');
    expect(size(2.5 * 1024 * 1024)).toBe('3 MB');
  });
});

describe('sanitizeFilename', () => {
  it('strips extension', () => {
    expect(sanitizeFilename('clip.mp4')).toBe('clip');
  });
  it('replaces path separators and control chars', () => {
    expect(sanitizeFilename('a/b\\c:d.mp4')).toBe('a_b_c_d');
  });
  it('falls back for empty', () => {
    expect(sanitizeFilename('')).toBe('transcript');
    expect(sanitizeFilename('.mp4')).toBe('transcript');
  });
  it('truncates long names', () => {
    const long = 'a'.repeat(200) + '.mp4';
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(80);
  });
});

describe('toSrtText', () => {
  it('formats segments', () => {
    const out = toSrtText([{ start: 0, end: 1.5, text: 'Hello' }, { start: 1.5, end: 3, text: 'World' }]);
    expect(out).toContain('1\n00:00:00,000 --> 00:00:01,500\nHello');
    expect(out).toContain('2\n00:00:01,500 --> 00:00:03,000\nWorld');
  });
  it('handles zero-length end', () => {
    const out = toSrtText([{ start: 2, end: 2, text: 'X' }]);
    expect(out).toContain('00:00:02,000 --> 00:00:03,000');
  });
  it('preserves unicode', () => {
    const out = toSrtText([{ start: 0, end: 1, text: 'नमस्ते' }]);
    expect(out).toContain('नमस्ते');
  });
});

describe('toVttText', () => {
  it('starts with WEBVTT', () => {
    const out = toVttText([{ start: 0, end: 1, text: 'Hi' }]);
    expect(out.startsWith('WEBVTT')).toBe(true);
  });
  it('uses dot separator', () => {
    const out = toVttText([{ start: 0.5, end: 1, text: 'Hi' }]);
    expect(out).toContain('00:00:00.500 --> 00:00:01.000');
  });
  it('empty segments produce header only-ish', () => {
    const out = toVttText([]);
    expect(out).toBe('WEBVTT\n\n');
  });
});
