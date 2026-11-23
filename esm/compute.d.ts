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

export class VirtualGeometryVisibilityPipeline {
  device: any;
  geometry: any;
  candidateCount: number;
  commandBuffer: any;
  metadataBuffer: any;
  counterBuffer: any;
  visibilityTexture: any;
  visibilityView: any;
  depthTexture: any;
  depthView: any;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { geometry?: any; maxCandidates?: number; colorFormat?: string; depthFormat?: string; reverseDepth?: boolean; width?: number; height?: number; hiz?: any });
  setGeometry(geometry: any): VirtualGeometryVisibilityPipeline;
  setHiZ(hiz: any): VirtualGeometryVisibilityPipeline;
  setGPUHierarchy(selector: VirtualGeometryGPUHierarchy | null): VirtualGeometryVisibilityPipeline;
  enableGPUHierarchy(options?: any): VirtualGeometryGPUHierarchy;
  uploadCandidates(resultOrSelected: any, geometry?: any): VirtualGeometryVisibilityPipeline;
  encodeCull(encoder: any, camera: any, options?: { viewportWidth?: number; viewportHeight?: number; useCone?: boolean; occlusion?: boolean; occlusionBias?: number; reverseDepth?: boolean }): VirtualGeometryVisibilityPipeline;
  encodeVisibility(encoder: any, options?: { visibilityView?: any; depthView?: any; loadOp?: string; depthLoadOp?: string; reverseDepth?: boolean }): VirtualGeometryVisibilityPipeline;
  encodeGPUHierarchy(encoder: any, camera: any, options?: any): VirtualGeometryVisibilityPipeline;
  executeGPUHierarchy(camera: any, options?: any): VirtualGeometryVisibilityPipeline;
  execute(camera: any, options?: any): VirtualGeometryVisibilityPipeline;
  resize(width: number, height: number): VirtualGeometryVisibilityPipeline;
  readStats(): Promise<any>;
  report(): any;
  dispose(): VirtualGeometryVisibilityPipeline;
}

export const virtualGeometryCullWGSL: string;
export const virtualGeometryVisibilityWGSL: string;

export class VirtualGeometryGPUHierarchy {
  device: any;
  visibility: VirtualGeometryVisibilityPipeline;
  geometry: any;
  nodeCount: number;
  instanceCount: number;
  pageIds: string[];
  stats: any;
  constructor(deviceOrRenderer: any, visibility: VirtualGeometryVisibilityPipeline, options?: { geometry?: any });
  setGeometry(geometry: any): VirtualGeometryGPUHierarchy;
  setVisibility(visibility: VirtualGeometryVisibilityPipeline): VirtualGeometryGPUHierarchy;
  sync(): VirtualGeometryGPUHierarchy;
  encode(encoder: any, camera: any, options?: { pixelError?: number; viewportWidth?: number; viewportHeight?: number; useCone?: boolean; occlusion?: boolean; occlusionBias?: number; reverseDepth?: boolean; triangleBudget?: number; drawCallBudget?: number; hysteresis?: number }): VirtualGeometryGPUHierarchy;
  readRequests(): Promise<string[]>;
  requestPages(context?: any): Promise<string[]>;
  report(): any;
  dispose(): VirtualGeometryGPUHierarchy;
}

export const virtualGeometryHierarchyWGSL: string;

export class VirtualShadowMap {
  device: any;
  pageSize: number;
  pagesPerSide: number;
  clipLevels: number;
  physicalPages: number;
  maxPagesPerFrame: number;
  physicalTexture: any;
  physicalView: any;
  pageTableTexture: any;
  pageTableView: any;
  comparisonSampler: any;
  clipMatrices: any[];
  resident: Map<number, any>;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { pageSize?: number; pagesPerSide?: number; clipLevels?: number; physicalPages?: number; baseExtent?: number; depthRange?: number; maxPagesPerFrame?: number; feedbackStride?: number; reverseDepth?: boolean });
  configure(camera: any, light?: any): VirtualShadowMap;
  encodeFeedback(encoder: any, cameraDepthView: any, camera: any, light?: any, options?: { width?: number; height?: number; viewportWidth?: number; viewportHeight?: number; feedbackStride?: number; reverseDepth?: boolean; neighborPages?: boolean }): VirtualShadowMap;
  feedback(cameraDepthView: any, camera: any, light?: any, options?: any): VirtualShadowMap;
  readFeedback(): Promise<Array<{ id: number; level: number; x: number; y: number; weight: number }>>;
  schedule(requests: any[], maxPages?: number): any[];
  renderPages(pages: any[]): VirtualShadowMap;
  updateFromFeedback(maxPages?: number): Promise<{ requests: any[]; pages: any[] }>;
  invalidate(bounds?: { levels?: number[] }): number;
  pin(level: number, x: number, y: number, pinned?: boolean): boolean;
  addCaster(object: any): VirtualShadowMap;
  addFXOMCaster(fxom: any): VirtualShadowMap;
  removeCaster(object: any): VirtualShadowMap;
  bindings(): { pageTable: any; physicalPages: any; sampler: any; clipMatrices: any[] };
  sampleWGSL(name?: string): string;
  report(): any;
  dispose(): VirtualShadowMap;
}

export const virtualShadowFeedbackWGSL: string;
export const virtualShadowCasterWGSL: string;
export const virtualShadowFXOMWGSL: string;

export class FoveatedQualityRegions {
  device: any;
  width: number;
  height: number;
  texture: any;
  view: any;
  regions: any[];
  stats: any;
  constructor(deviceOrRenderer: any, options?: { maxRegions?: number; mapScale?: number; peripheralQuality?: number; gazeSmoothing?: number; regions?: any[] });
  setGaze(x: number, y: number, delta?: number): FoveatedQualityRegions;
  setRegions(regions: Array<{ center?: number[]; followsGaze?: boolean; innerRadius?: number; outerRadius?: number; innerQuality?: number; outerQuality?: number; falloff?: number; enabled?: boolean }>): FoveatedQualityRegions;
  resize(width: number, height: number): FoveatedQualityRegions;
  encode(encoder: any, outputWidth: number, outputHeight: number): FoveatedQualityRegions;
  report(): any;
  dispose(): FoveatedQualityRegions;
}

export class TemporalSuperResolution {
  device: any;
  outputTexture: any;
  outputView: any;
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  historyValid: boolean;
  foveation: FoveatedQualityRegions | null;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { historyWeight?: number; sharpness?: number; depthThreshold?: number; velocityScale?: number; foveation?: boolean | FoveatedQualityRegions | any });
  resize(inputWidth: number, inputHeight: number, outputWidth: number, outputHeight: number): TemporalSuperResolution;
  nextJitter(): { x: number; y: number; ndcX: number; ndcY: number };
  applyJitter(camera: any): { x: number; y: number; ndcX: number; ndcY: number };
  restoreJitter(camera: any): TemporalSuperResolution;
  reset(): TemporalSuperResolution;
  setGaze(x: number, y: number, delta?: number): TemporalSuperResolution;
  encode(encoder: any, inputs: { colorView: any; depthView: any; velocityView?: any; reactiveView?: any; width: number; height: number; outputWidth?: number; outputHeight?: number }, options?: { inputWidth?: number; inputHeight?: number; outputWidth?: number; outputHeight?: number; sharpness?: number; depthThreshold?: number; velocityScale?: number }): TemporalSuperResolution;
  execute(inputs: any, options?: any): TemporalSuperResolution;
  report(): any;
  dispose(): TemporalSuperResolution;
}

export const foveatedQualityWGSL: string;
export const temporalSuperResolutionWGSL: string;

export class AdaptiveHybridReflections {
  device: any;
  outputTexture: any;
  outputView: any;
  width: number;
  height: number;
  frame: number;
  historyValid: boolean;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { maxSteps?: number; stepSize?: number; thickness?: number; maxMip?: number; roughnessCutoff?: number; historyWeight?: number });
  resize(width: number, height: number): AdaptiveHybridReflections;
  encode(encoder: any, inputs: { colorView: any; depthView: any; normalRoughnessView: any; rayFallbackView?: any; velocityView?: any; qualityView?: any; width: number; height: number }, camera: any, options?: { width?: number; height?: number }): AdaptiveHybridReflections;
  execute(inputs: any, camera: any, options?: any): AdaptiveHybridReflections;
  reset(): AdaptiveHybridReflections;
  report(): any;
  dispose(): AdaptiveHybridReflections;
}

export class ReSTIRDirectLighting {
  device: any;
  outputTexture: any;
  outputView: any;
  width: number;
  height: number;
  frame: number;
  lightCount: number;
  historyValid: boolean;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { maxLights?: number; candidates?: number; spatialSamples?: number; maxHistory?: number; depthThreshold?: number; rayQuery?: any });
  resize(width: number, height: number): ReSTIRDirectLighting;
  uploadLights(lights: any[]): ReSTIRDirectLighting;
  encode(encoder: any, inputs: { depthView: any; normalView: any; velocityView?: any; shadowView?: any; rayQuery?: any; width: number; height: number }, camera: any, options?: { width?: number; height?: number; lights?: any[]; rayQuery?: any }): ReSTIRDirectLighting;
  execute(inputs: any, camera: any, options?: any): ReSTIRDirectLighting;
  reset(): ReSTIRDirectLighting;
  report(): any;
  dispose(): ReSTIRDirectLighting;
}

export const hybridReflectionsWGSL: string;
export const restirCandidateWGSL: string;
export const restirSpatialWGSL: string;

export class HybridDiffuseGI {
  device: any;
  outputTexture: any;
  outputView: any;
  width: number;
  height: number;
  frame: number;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { samples?: number; maxSteps?: number; stepSize?: number; thickness?: number; intensity?: number; maxDistance?: number; checkerboard?: boolean });
  resize(width: number, height: number): HybridDiffuseGI;
  encode(encoder: any, inputs: { colorView: any; depthView: any; normalView: any; albedoView?: any; rayFallbackView?: any; qualityView?: any; width: number; height: number }, camera: any, options?: { width?: number; height?: number }): HybridDiffuseGI;
  execute(inputs: any, camera: any, options?: any): HybridDiffuseGI;
  reset(): HybridDiffuseGI;
  report(): any;
  dispose(): HybridDiffuseGI;
}

export class SpatiotemporalGIDenoiser {
  device: any;
  outputTexture: any;
  outputView: any;
  width: number;
  height: number;
  frame: number;
  historyValid: boolean;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { historyWeight?: number; depthThreshold?: number; normalThreshold?: number; iterations?: number; phiDepth?: number; phiNormal?: number; phiLuminance?: number });
  resize(width: number, height: number): SpatiotemporalGIDenoiser;
  encode(encoder: any, inputs: { noisyView: any; depthView: any; normalView: any; velocityView?: any; width: number; height: number }, options?: { width?: number; height?: number }): SpatiotemporalGIDenoiser;
  execute(inputs: any, options?: any): SpatiotemporalGIDenoiser;
  reset(): SpatiotemporalGIDenoiser;
  report(): any;
  dispose(): SpatiotemporalGIDenoiser;
}

export const hybridDiffuseGIWGSL: string;
export const giTemporalDenoiseWGSL: string;
export const giAtrousDenoiseWGSL: string;

export class RayQueryLightingBridge {
  device: any;
  rayQuery: any;
  reflectionTexture: any;
  reflectionView: any;
  giTexture: any;
  giView: any;
  width: number;
  height: number;
  frame: number;
  stats: any;
  constructor(deviceOrRenderer: any, rayQuery: any, options?: { maxMaterials?: number; maxLights?: number; normalBias?: number; reflectionIntensity?: number; giIntensity?: number; environment?: number[]; environmentIntensity?: number; checkerboard?: boolean });
  uploadMaterials(materials: any[]): RayQueryLightingBridge;
  uploadLights(lights: any[]): RayQueryLightingBridge;
  resize(width: number, height: number): RayQueryLightingBridge;
  encode(encoder: any, inputs: { depthView: any; normalRoughnessView: any; qualityView?: any; width: number; height: number }, camera: any, options?: { width?: number; height?: number; maxDistance?: number; materials?: any[]; lights?: any[] }): RayQueryLightingBridge;
  execute(inputs: any, camera: any, options?: any): RayQueryLightingBridge;
  reset(): RayQueryLightingBridge;
  report(): any;
  dispose(): RayQueryLightingBridge;
}

export const rayQueryLightingWGSL: string;

export interface AdvancedLightingQualityLevel {
  name: string;
  resolutionScale: number;
  candidates: number;
  spatialSamples: number;
  maxHistory: number;
  giSamples: number;
  giSteps: number;
  denoiseIterations: number;
  reflectionSteps: number;
  roughnessCutoff: number;
  checkerboard: boolean;
  peripheralQuality: number;
  qualityMapScale: number;
}

export class AdvancedLightingQualityController {
  pipeline: AdvancedLightingPipeline | null;
  level: number;
  levels: AdvancedLightingQualityLevel[];
  manual: boolean;
  stats: any;
  constructor(pipeline: AdvancedLightingPipeline, options?: { targetFps?: number; levels?: AdvancedLightingQualityLevel[]; level?: number; minLevel?: number; maxLevel?: number; alpha?: number; degradeThreshold?: number; upgradeThreshold?: number; degradeFrames?: number; upgradeFrames?: number; cooldownFrames?: number; sampleCount?: number; contract?: any; onChange?: Function; onResolutionScale?: Function });
  current(): AdvancedLightingQualityLevel;
  sample(metrics: { frameMs?: number; cpuMs?: number; gpuMs?: number; memoryPressure?: number; gpuMemoryMb?: number }): AdvancedLightingQualityController;
  setLevel(level: number, reason?: string): AdvancedLightingQualityController;
  forceLevel(level: number): AdvancedLightingQualityController;
  releaseAuto(): AdvancedLightingQualityController;
  serialize(): any;
  restore(state: any): AdvancedLightingQualityController;
  reset(): AdvancedLightingQualityController;
  report(): any;
  dispose(): AdvancedLightingQualityController;
}

export const DEFAULT_LIGHTING_LEVELS: AdvancedLightingQualityLevel[];

export class AdvancedLightingFrameGraph {
  device: any;
  pipeline: AdvancedLightingPipeline;
  graph: CausalFrameGraph | null;
  outputTexture: any;
  outputView: any;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { pipeline?: AdvancedLightingPipeline; pipelineOptions?: any; prefix?: string });
  register(graph: FrameGraph, resources: { color: string; depth: string; normal: string; normalRoughness?: string; albedo?: string; velocity?: string; shadow?: string; quality?: string; giRayFallback?: string; reflectionRayFallback?: string; output?: string; width: number; height: number }, camera: any, options?: any): string;
  build(inputs: { colorTexture: any; depthTexture: any; normalTexture: any; normalRoughnessTexture?: any; albedoTexture?: any; velocityTexture?: any; shadowTexture?: any; qualityTexture?: any; giRayFallbackTexture?: any; reflectionRayFallbackTexture?: any; presentTexture?: any; width: number; height: number }, camera: any, options?: any): AdvancedLightingFrameGraph;
  execute(inputs: any, camera: any, options?: any): AdvancedLightingFrameGraph;
  reset(): AdvancedLightingFrameGraph;
  report(): any;
  dispose(): AdvancedLightingFrameGraph;
}

export class AdvancedLightingPipeline {
  device: any;
  outputTexture: any;
  outputView: any;
  width: number;
  height: number;
  frame: number;
  directLighting: ReSTIRDirectLighting;
  diffuseGI: HybridDiffuseGI;
  giDenoiser: SpatiotemporalGIDenoiser;
  reflections: AdaptiveHybridReflections;
  foveation: FoveatedQualityRegions | null;
  rayBridge: RayQueryLightingBridge | null;
  qualityController: AdvancedLightingQualityController | null;
  stats: any;
  constructor(deviceOrRenderer: any, options?: { direct?: boolean; gi?: boolean; reflections?: boolean; denoise?: boolean; baseWeight?: number; directWeight?: number; giWeight?: number; reflectionWeight?: number; exposure?: number; preserveAlpha?: boolean; directLighting?: ReSTIRDirectLighting; diffuseGI?: HybridDiffuseGI; giDenoiser?: SpatiotemporalGIDenoiser; reflectionSystem?: AdaptiveHybridReflections; foveation?: boolean | FoveatedQualityRegions | any; rayQuery?: any; rayBridge?: RayQueryLightingBridge; rayBridgeOptions?: any; qualityController?: AdvancedLightingQualityController; restir?: any; giOptions?: any; denoiser?: any; reflectionOptions?: any });
  resize(width: number, height: number): AdvancedLightingPipeline;
  configure(options?: any): AdvancedLightingPipeline;
  setDebugMode(mode?: number | "combined" | "direct" | "gi" | "reflections" | "confidence"): AdvancedLightingPipeline;
  setGaze(x: number, y: number, delta?: number): AdvancedLightingPipeline;
  setQualityController(controller: AdvancedLightingQualityController | null): AdvancedLightingPipeline;
  samplePerformance(metrics: any): AdvancedLightingPipeline;
  encode(encoder: any, inputs: { colorView: any; depthView: any; normalView: any; normalRoughnessView?: any; albedoView?: any; velocityView?: any; shadowView?: any; qualityView?: any; giRayFallbackView?: any; reflectionRayFallbackView?: any; rayQuery?: any; materials?: any[]; lights?: any[]; width: number; height: number }, camera: any, options?: { width?: number; height?: number; materials?: any[]; lights?: any[]; exposure?: number; debugMode?: number }): AdvancedLightingPipeline;
  execute(inputs: any, camera: any, options?: any): AdvancedLightingPipeline;
  reset(): AdvancedLightingPipeline;
  report(): any;
  dispose(): AdvancedLightingPipeline;
}

export const advancedLightingCompositeWGSL: string;

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

export class PersistentGPUScene {
  capacity: number;
  count: number;
  aliveCount: number;
  stats: Record<string, number>;
  constructor(device?: any, options?: { capacity?: number });
  create(values?: any): number;
  valid(id: number, generation?: number): boolean;
  handle(id: number): { id: number; generation: number } | null;
  remove(id: number): boolean;
  setTransform(id: number, matrix: any, initialize?: boolean): this;
  setBounds(id: number, bounds: any): this;
  setResources(id: number, geometry: number, material: number, texture?: number, animation?: number): this;
  setFlags(id: number, flags: number, cell?: number, lod?: number): this;
  setImportance(id: number, value: number): this;
  upload(): number;
  applyVisibility(ids: ArrayLike<number>, frame?: number): this;
  visibleRecently(id: number, frames?: number): boolean;
  report(): any;
  dispose(): this;
}

export class TextureHandleHeap {
  pageSize: number;
  maxPages: number;
  constructor(options?: { pageSize?: number; maxPages?: number });
  add(texture: any, sampler?: any): number;
  remove(handle: number): boolean;
  get(handle: number): any;
  page(handle: number): number;
  slot(handle: number): number;
  pages(): any[][];
}

export class BindlessMaterialTable {
  capacity: number;
  count: number;
  textureHeap: TextureHandleHeap;
  stats: Record<string, number>;
  constructor(device?: any, options?: any);
  create(material?: any): number;
  write(id: number, material: any): this;
  remove(id: number): boolean;
  pageForMaterial(id: number): number;
  groups(ids: ArrayLike<number>): Map<string, number[]>;
  upload(): number;
  report(): any;
  dispose(): this;
}

export class CausalFrameGraph extends FrameGraph {
  causalstats: Record<string, number>;
  addCausalPass(name: string, options?: any): this;
  evaluate(name: string, context?: any): boolean;
  setContext(context: any): this;
  addCause(pass: string, cause: string | Record<string, any>): this;
  explain(pass: string): any;
  explainResource(name: string): any;
  decisionLog(clear?: boolean): any[];
  report(): any;
}
