export type DelayDiv = "1/4" | "1/8" | "1/8d" | "1/16" | "1/4t";

export type MicModel = "none" | "condenser" | "tube" | "dynamic" | "ribbon" | "stage";

/** Todo efeito tem a sua chave liga/desliga (…On). Nada vem ligado por padrão. */
export type FxSettings = {
  // microfone & ambiente
  gateOn: boolean;
  gateThreshold: number; // dB
  deessOn: boolean;
  deess: number; // 0..1
  micOn: boolean;
  micFix: boolean; // correção de mic de headset
  micModel: MicModel;
  // tom
  filtersOn: boolean;
  hpFreq: number; // Hz
  lpFreq: number; // Hz
  eqOn: boolean;
  eqLow: number; // dB
  eqMid: number;
  eqHigh: number;
  compOn: boolean;
  compThreshold: number; // dB
  compRatio: number;
  compMakeup: number; // dB
  driveOn: boolean;
  drive: number; // saturação 0..1
  enhanceOn: boolean;
  enhance: number; // "realce" de um botão 0..1
  // espaço
  doublerOn: boolean;
  doubler: number; // dobra estéreo 0..1
  delayOn: boolean;
  delayMix: number; // 0..1
  delayDiv: DelayDiv;
  delayFeedback: number; // 0..0.9
  reverbOn: boolean;
  reverb: number; // envio 0..1
};

export type Track = {
  id: string;
  name: string;
  color: string;
  volume: number; // 0..1.5
  pan: number; // -1..1
  mute: boolean;
  solo: boolean;
  armed: boolean;
  monitor: boolean; // ouvir o microfone (com efeitos) enquanto armada
  preset?: string;
  fx: FxSettings;
};

export type Clip = {
  id: string;
  trackId: string;
  bufferId: string;
  /** buffer antes da correção de afinação (para restaurar) */
  originalBufferId?: string;
  name: string;
  start: number; // s na timeline
  offset: number; // s dentro do buffer
  duration: number; // s
  gain: number; // linear
  fadeIn: number; // s
  fadeOut: number; // s
  tuned?: boolean;
};

export type ScaleName =
  | "major"
  | "minor"
  | "harmonicMinor"
  | "dorian"
  | "phrygian"
  | "pentatonicMajor"
  | "pentatonicMinor"
  | "blues"
  | "chromatic";

export type Tool = "select" | "cut";

/** Clip retornado pela Flow Music (via useapi.net) */
export type FlowClip = {
  clip: string;
  title: string | null;
  duration_s: number | null;
  lyrics?: string | null;
  audio_url: string;
  wav_url: string;
  image_url: string | null;
  stem_type?: "drums" | "bass" | "vocals" | "other";
};
