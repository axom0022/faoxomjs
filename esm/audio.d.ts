import { Object3D } from "./core.js";

export class AudioListener extends Object3D {
  type: "AudioListener";
  context: AudioContext;
  gain: GainNode;
  constructor();
  getInput(): GainNode;
  removeFilter(): this;
  setFilter(value: any): this;
  getFilter(): any;
  setMasterVolume(value: number): this;
  getMasterVolume(): number;
  updateMatrixWorld(force?: boolean): void;
}

export class PositionalAudio extends Object3D {
  type: "PositionalAudio";
  panner: PannerNode;
  context: AudioContext;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  isPlaying: boolean;
  hasPlaybackControl: boolean;
  playbackRate: number;
  constructor(listener: AudioListener);
  setBuffer(audioBuffer: AudioBuffer): this;
  play(delay?: number): this;
  pause(): this;
  stop(): this;
  setRefDistance(value: number): this;
  getRefDistance(): number;
  setRolloffFactor(value: number): this;
  getRolloffFactor(): number;
  setMaxDistance(value: number): this;
  getMaxDistance(): number;
  setDistanceModel(value: DistanceModelType): this;
  getDistanceModel(): DistanceModelType;
  setCone(innerAngle: number, outerAngle: number, outerGain: number): this;
  updateMatrixWorld(force?: boolean): void;
}

export class AudioEnvironment {
  listener: AudioListener;
  reverbNode: ConvolverNode;
  constructor(listener: AudioListener);
  createReverb(impulseResponseBuffer: AudioBuffer): void;
  setObstruction(audioSource: PositionalAudio, obstructionAmount: number): void;
}
