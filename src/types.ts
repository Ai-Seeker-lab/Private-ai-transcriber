export interface DemoLine {
  t: number;
  text: string;
  hi: string;
  es: string;
}

export interface DemoClip {
  name: string;
  source: string;
  duration: number;
  width: number;
  height: number;
}

export interface DemoLang {
  code: string;
  name: string;
}

export interface Demo {
  clip: DemoClip;
  bars: number[];
  step: number;
  languages: DemoLang[];
  lines: DemoLine[];
}

export interface Segment {
  id?: number;
  start: number;
  end: number;
  text: string;
}

export interface WorkerMessage {
  type: string;
  [key: string]: unknown;
}

export type Task = 'transcribe' | 'translate';
