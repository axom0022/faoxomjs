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
