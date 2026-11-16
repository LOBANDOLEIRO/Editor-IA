export type FxSettings = {
  eqLow: number; // dB
  eqMid: number;
  eqHigh: number;
  compOn: boolean;
  compThreshold: number; // dB
  compRatio: number;
  compMakeup: number; // dB
  reverb: number; // 0..1 (envio)
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
