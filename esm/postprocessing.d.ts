import { WebGLRenderer, WebGLRenderTarget, Scene, Camera } from "./core.js";
import { Vector2, Vector3, Color } from "./math.js";

export class Pass {
  enabled: boolean;
  needsSwap: boolean;
  clear: boolean;
  renderToScreen: boolean;
  constructor();
  setSize(width: number, height: number): void;
  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime: number, maskActive: boolean): void;
  dispose(): void;
}

export class RenderPass extends Pass {
  scene: Scene;
  camera: Camera;
  overrideMaterial: any;
  clearColor: Color | null;
  clearAlpha: number;
  constructor(scene: Scene, camera: Camera, overrideMaterial?: any, clearColor?: Color, clearAlpha?: number);
}

export class EffectComposer {
  renderer: WebGLRenderer;
  renderTarget1: WebGLRenderTarget;
  renderTarget2: WebGLRenderTarget;
  writeBuffer: WebGLRenderTarget;
  readBuffer: WebGLRenderTarget;
  passes: Pass[];
  constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget);
  addPass(pass: Pass): void;
  insertPass(pass: Pass, index: number): void;
  removePass(pass: Pass): void;
  setSize(width: number, height: number): void;
  render(deltaTime?: number): void;
  reset(renderTarget?: WebGLRenderTarget): void;
  dispose(): void;
}

export class GTAOPass extends Pass {
  scene: Scene;
  camera: Camera;
  radius: number;
  distanceExponent: number;
  thickness: number;
  scale: number;
  samples: number;
  constructor(scene: Scene, camera: Camera, width?: number, height?: number);
}

export class HBAOPass extends Pass {
  scene: Scene;
  camera: Camera;
  radius: number;
  bias: number;
  maxRadius: number;
  constructor(scene: Scene, camera: Camera, width?: number, height?: number);
}

export class ScreenSpaceReflectionsPass extends Pass {
  scene: Scene;
  camera: Camera;
  maxDistance: number;
  opacity: number;
  thickness: number;
  resolutionScale: number;
  steps: number;
  binarySearchSteps: number;
  constructor(scene: Scene, camera: Camera, options?: { maxDistance?: number; opacity?: number; thickness?: number; resolutionScale?: number; steps?: number; binarySearchSteps?: number });
}

export class SSRPass extends ScreenSpaceReflectionsPass {}

export class SSGIPass extends Pass {
  scene: Scene;
  camera: Camera;
  maxDistance: number;
  bounceIntensity: number;
  samples: number;
  constructor(scene: Scene, camera: Camera, options?: { maxDistance?: number; bounceIntensity?: number; samples?: number });
}

export class BokehDepthOfFieldPass extends Pass {
  scene: Scene;
  camera: Camera;
  focus: number;
  aperture: number;
  maxblur: number;
  constructor(scene: Scene, camera: Camera, options?: { focus?: number; aperture?: number; maxblur?: number });
  calculateCoC(depth: number): number;
}

export class ProgressiveBloomPass extends Pass {
  threshold: number;
  strength: number;
  radius: number;
  mipLevels: number;
  constructor(options?: { threshold?: number; strength?: number; radius?: number; mipLevels?: number });
}

export class BloomPass extends ProgressiveBloomPass {}

export class TAAPass extends Pass {
  scene: Scene;
  camera: Camera;
  sampleLevel: number;
  jitterIndex: number;
  constructor(scene: Scene, camera: Camera);
  getHaltonJitter(index: number, width: number, height: number): { x: number; y: number };
}

export class VolumetricPass extends Pass {
  scene: Scene;
  camera: Camera;
  density: number;
  decay: number;
  weight: number;
  exposure: number;
  samples: number;
  constructor(scene: Scene, camera: Camera, options?: { density?: number; decay?: number; weight?: number; exposure?: number; samples?: number });
}
