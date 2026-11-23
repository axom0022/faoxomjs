export interface AdaptiveQualityLevel {
  resolutionScale: number;
  lodBias: number;
  triangleBudget: number;
  drawCallBudget: number;
  shadowScale: number;
  postFxLevel: number;
  anisotropy: number;
}

export class AdaptiveFrameBudget {
  targetFps: number;
  frameBudgetMs: number;
  level: number;
  levels: AdaptiveQualityLevel[];
  stats: { frames: number; changes: number; downgrades: number; upgrades: number; frameMs: number; gpuMs: number; p95Ms: number; fps: number; pressure: number; triangles: number; drawCalls: number };
  constructor(options?: any);
  static detectProfile(): any;
  static levels(profile: any): AdaptiveQualityLevel[];
  current(): AdaptiveQualityLevel;
  sample(metrics: { frameMs?: number; cpuMs?: number; gpuMs?: number; triangles?: number; drawCalls?: number }): this;
  sampleRenderer(frameMs: number, gpuMs?: number): this;
  samplePipeline(frameMs: number, gpuMs?: number): this;
  setLevel(level: number, reason?: string): this;
  apply(reason?: string): this;
  report(): any;
  reset(): this;
}

export class VisibilityBudget {
  triangleBudget: number;
  drawCallBudget: number;
  stats: { candidates: number; selected: number; triangles: number; rejectedTriangles: number; drawCalls: number };
  constructor(options?: { triangleBudget?: number; drawCallBudget?: number; bucketCount?: number; hysteresisFrames?: number });
  select(objects: any[], camera?: any, applyVisibility?: boolean): any[];
  applyFrameBudget(budget: AdaptiveFrameBudget | AdaptiveQualityLevel): this;
}

export class FrameTaskScheduler {
  budgetMs: number;
  queue: any[];
  stats: { frames: number; executed: number; deferred: number; elapsedMs: number };
  constructor(options?: { budgetMs?: number; maxTasks?: number });
  add(task: () => void | (() => void), options?: { priority?: number; deadline?: number }): this;
  run(budgetMs?: number): number;
  clear(): this;
}

export class RenderBenchmark {
  constructor(options: { renderer: any; scene: any; camera: any; warmup?: number; frames?: number });
  run(): Promise<{ frames: number; averageMs: number; fps: number; p50Ms: number; p95Ms: number; p99Ms: number; gpuP95Ms: number | null; triangles: number; drawCalls: number; stable60: boolean }>;
}

export class PerfGovernor {
  constructor(renderer?: any, options?: any);
  update(frameMs: number): this;
  setResolutionScale(scale: number, reason?: string): this;
}

export class AutomaticLOD { constructor(options?: any); }
export class MegaGeometry { constructor(options?: any); }
export class GPUDrivenPipeline { constructor(renderer?: any, options?: any); }

export class GPUResidencyManager2 {
  budget: number;
  residentBytes: number;
  frame: number;
  stats: Record<string, number>;
  constructor(options?: any);
  register(id: string | number, options?: any): this;
  unregister(id: string | number): boolean;
  setBudget(bytes: number, category?: string): this;
  touch(id: string | number, values?: any): boolean;
  score(resource: any): number;
  makeResident(id: string | number, context?: any): Promise<any>;
  evict(id: string | number, reason?: string): boolean;
  categoryBytes(category: string): number;
  enforce(): this;
  predict(entries: any[]): this;
  update(): this;
  report(): any;
}

export class RuntimeQualityContract {
  rules: Record<string, number>;
  violations: any[];
  stats: Record<string, number>;
  constructor(rules?: any);
  policy(metric: string, callback: (violation: any, metrics: any, contract: RuntimeQualityContract) => void): this;
  sample(metrics: any): { ok: boolean; violations: any[] };
  percentile(name: string, value: number): number;
  evaluate(metrics: any): { ok: boolean; violations: any[] };
  report(): any;
  reset(): this;
}

export class CounterfactualRenderer {
  history: any[];
  stats: Record<string, number>;
  constructor(options?: any);
  observe(state: any, frameMs: number): this;
  estimate(base: any, candidate: any): number;
  averageFrameMs(): number;
  choose(base: any, candidates: any[], targetMs?: number, visualCost?: (candidate: any, base: any) => number): any;
  report(): any;
}
