import { WebGPURenderer, Camera, Scene } from "./core.js";
import { BufferGeometry } from "./geometry.js";

export class GPUComputePass {
  device: any;
  shaderCode: string;
  pipeline: any;
  constructor(device: any, shaderCode: string);
  dispatch(workgroupsX?: number, workgroupsY?: number, workgroupsZ?: number): void;
}

export class GPUCullingPipeline {
  device: any;
  cullShader: string;
  computePipeline: any;
  constructor(renderer: WebGPURenderer);
  cull(camera: Camera, boundingSpheresBuffer: any, instanceCount: number, outputDrawBuffer: any): void;
}

export class GPUIndirectDrawBuffer {
  device: any;
  buffer: any;
  byteSize: number;
  constructor(device: any, maxDrawCommands?: number);
  writeCommand(index: number, vertexCount: number, instanceCount: number, firstVertex?: number, firstInstance?: number): void;
}

export class GPUParticleComputeSystem {
  device: any;
  particleCount: number;
  particleBuffer: any;
  computePass: GPUComputePass;
  constructor(renderer: WebGPURenderer, particleCount?: number);
  update(dt: number): void;
}

export class GPUDrivenPipeline {
  renderer: any;
  stats: any;
  constructor(renderer: any, options?: any);
  register(objects: any, options?: any): any;
  update(camera: any): any;
  dispose(): void;
}

export class HiZBuffer {
  renderer: any;
  stats: any;
  constructor(renderer: any, options?: any);
  build(camera: any): any;
  dispose(): void;
}

export class GPURayQuery {
  renderer: any;
  stats: any;
  constructor(renderer: any);
  build(objects: any): any;
  trace(origins: ArrayLike<number>, directions: ArrayLike<number>, count?: number): Promise<Float32Array>;
  dispose(): void;
}

export class GPURTShadows {
  texture: any;
  stats: any;
  constructor(renderer: any, rayQuery: any);
  resize(width: number, height: number): any;
  render(camera: any, light: any, depthView?: any): any;
  dispose(): void;
}

export class GPURTReflections {
  texture: any;
  stats: any;
  constructor(renderer: any, rayQuery: any);
  resize(width: number, height: number): any;
  render(camera: any, depthView?: any, options?: any): any;
  dispose(): void;
}

export class GPUMeshletCuller {
  stats: any;
  constructor(renderer: any, meshletSet: any);
  cull(camera: any): any;
  readback(): Promise<Uint32Array>;
  dispose(): void;
}

export class ClusteredLighting {
  stats: any;
  constructor(renderer: any);
  configure(camera: any, options?: any): any;
  update(lights: any): any;
  readback(): Promise<Uint32Array>;
  clusterOf(cameraPoint: number[]): number;
  dispose(): void;
}

export class FrameGraph {
  stats: { compiles: number; executes: number; passesExecuted: number; texturesCreated: number; buffersCreated: number; slotReused: number };
  constructor(renderer: any);
  addTexture(name: string, options?: { format?: string; width?: number; height?: number; usage?: number; mipLevelCount?: number; sampleCount?: number }): FrameGraph;
  addBuffer(name: string, options?: { size?: number; usage?: number }): FrameGraph;
  importTexture(name: string, gpuTexture: any): FrameGraph;
  importBuffer(name: string, gpuBuffer: any): FrameGraph;
  addPass(name: string, options?: { type?: string; reads?: string[]; writes?: string[]; sideEffect?: boolean; async?: boolean; execute?: (ctx: any) => void }): FrameGraph;
  compile(): FrameGraph;
  execute(): FrameGraph;
  clear(): FrameGraph;
  dispose(): FrameGraph;
  texture(name: string): any;
  view(name: string): any;
  buffer(name: string): any;
  compiledOrder(): string[];
  culledPasses(): string[];
  barriers(): { resource: string; producer: string; consumer: string; kind: string; fromLayer: number; toLayer: number }[];
  aliasMap(): Record<string, number>;
  lifetimes(): Record<string, { first: number; last: number; slot: number }>;
  layerTracks(): string[];
  slotCounts(): { textures: number; buffers: number };
}

export class FXOMDGIAR {
  renderer: any;
  rayQuery: any;
  stats: any;
  constructor(renderer: any, rayQuery: any);
  configure(options?: any): any;
  setAlbedo(objects: any): any;
  update(lights: any): any;
  readback(): Promise<Float32Array>;
  dispose(): void;
}
