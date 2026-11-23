export class FrameContext {
  frame: number;
  simulationTick: number;
  time: number;
  simulationTime: number;
  delta: number;
  fixedDelta: number;
  alpha: number;
  cpuBudget: number;
  gpuBudget: number;
  cpuMs: number;
  gpuMs: number;
  quality: any;
  camera: any;
  visibility: any;
  input: any;
  networkTime: number;
  renderer: any;
  scene: any;
  world: EngineWorld | null;
  suspended: boolean;
  metadata: Record<string, any>;
  constructor(options?: Partial<FrameContext>);
  begin(time: number, delta: number): this;
  fixed(tick: number, time: number): this;
  copy(source: Partial<FrameContext>): this;
  snapshot(): Record<string, number | boolean>;
}

export class CapabilityProfile {
  name: string;
  score: number;
  confidence: number;
  renderer: "webgpu" | "webgl2" | string;
  memoryMb: number;
  workerCount: number;
  targetFps: number;
  resolutionScale: number;
  triangleBudget: number;
  drawCallBudget: number;
  shadowSystem: string;
  textureFormats: string[];
  compute: boolean;
  rayQuery: boolean;
  sharedMemory: boolean;
  webgpu: boolean;
  webgl2: boolean;
  xr: boolean;
  reasons: string[];
  limits: Record<string, number>;
  constructor(values?: Partial<CapabilityProfile>);
  static classify(values: any): CapabilityProfile;
  static detect(options?: any): Promise<CapabilityProfile>;
  toJSON(): Record<string, any>;
}

export interface FeatureDescriptor {
  version?: string;
  dependencies?: string[];
  optional?: string[];
  conflicts?: string[];
  capabilities?: string[];
  estimatedBytes?: number;
  lazy?: boolean;
  metadata?: Record<string, any>;
}

export class FeatureManifest {
  strict: boolean;
  stats: { registered: number; loaded: number; failed: number; bytes: number };
  constructor(options?: { strict?: boolean });
  register(name: string, descriptor?: FeatureDescriptor, loader?: (context: any, descriptor: FeatureDescriptor, manifest: FeatureManifest) => any | Promise<any>): this;
  has(name: string): boolean;
  resolve(names: string | string[]): string[];
  load(names: string | string[], context?: any): Promise<any[]>;
  loadOne(name: string, context?: any): Promise<any>;
  disable(name: string): this;
  enable(name: string): this;
  status(name: string): any;
  toJSON(): any;
}

export interface EngineSystem {
  init?(engine: Engine): void | Promise<void>;
  start?(engine: Engine): void | Promise<void>;
  fixedUpdate?(context: FrameContext, engine: Engine): void;
  update?(context: FrameContext, engine: Engine): void;
  render?(context: FrameContext, engine: Engine): void;
  suspend?(reason: string, engine: Engine): void;
  resume?(reason: string, engine: Engine): void;
  stop?(engine: Engine): void;
  dispose?(engine: Engine): void | Promise<void>;
}

export class EngineWorld {
  name: string;
  scene: any;
  camera: any;
  simulationRate: number;
  renderRate: number;
  enabled: boolean;
  visible: boolean;
  timeScale: number;
  metadata: Record<string, any>;
  systems: any[];
  frame: number;
  tick: number;
  constructor(name: string, options?: any);
  addSystem(system: any): this;
  removeSystem(system: any): this;
}

export class Engine {
  renderer: any;
  scene: any;
  camera: any;
  input: any;
  context: FrameContext;
  profile: CapabilityProfile | any;
  features: FeatureManifest;
  contract: any;
  gpuScene: any;
  materialTable: any;
  residency: any;
  frameGraph: any;
  spatial: any;
  worldPartition: any;
  origins: any;
  virtualGeometry: any;
  worlds: Map<string, EngineWorld>;
  activeworld: EngineWorld | null;
  running: boolean;
  initialized: boolean;
  suspended: boolean;
  stats: Record<string, number>;
  constructor(options?: any);
  init(): Promise<this>;
  registerSystem(name: string, system: EngineSystem, options?: { dependencies?: string[]; priority?: number; enabled?: boolean; critical?: boolean }): this;
  unregisterSystem(name: string): this;
  resolveSystems(): any[];
  addWorld(name: string, options?: any): EngineWorld;
  removeWorld(name: string): EngineWorld | null;
  setActiveWorld(name: string): this;
  start(): Promise<this>;
  stop(): this;
  step(time: number): FrameContext;
  suspend(reason?: string): this;
  resume(reason?: string): this;
  on(type: string, listener: (value: any) => void): this;
  off(type: string, listener: (value: any) => void): this;
  emit(type: string, value: any): this;
  report(): any;
  dispose(): Promise<this>;
}

export interface ComponentField {
  type?: "f32" | "f64" | "i8" | "u8" | "i16" | "u16" | "i32" | "u32";
  length?: number;
  default?: number;
}

export class ComponentSchema {
  name: string;
  version: number;
  fields: Record<string, ComponentField>;
  constructor(name: string, definition?: { version?: number; fields?: Record<string, string | ComponentField> });
}

export class ArchetypeTable {
  names: string[];
  signature: string;
  capacity: number;
  count: number;
  entities: Uint32Array;
  columns: Record<string, Record<string, ArrayBufferView>>;
  read(row: number, name: string, target?: any): any;
  write(row: number, name: string, values: any): this;
}

export class ArchetypeQuery {
  tables: ArchetypeTable[];
  refresh(): this;
  forEach(callback: (entity: number, columns: Record<string, Record<string, any>>, row: number, context?: any) => void, context?: any): number;
  count(): number;
  chunks(size?: number): Array<{ table: ArchetypeTable; start: number; end: number }>;
}

export class ArchetypeWorld {
  shared: boolean;
  stats: { created: number; destroyed: number; moved: number; resizes: number; entities: number; archetypes: number };
  constructor(options?: { shared?: boolean; initialCapacity?: number });
  defineComponent(name: string, definition: any): ComponentSchema;
  create(components?: Record<string, any>): number;
  valid(entity: number): boolean;
  destroy(entity: number): boolean;
  has(entity: number, component: string): boolean;
  get(entity: number, component: string, target?: any): any;
  set(entity: number, component: string, values: any): this;
  add(entity: number, component: string, values?: any): this;
  remove(entity: number, component: string): this;
  query(include: string | string[], exclude?: string[]): ArchetypeQuery;
  clear(): this;
  report(): any;
}

export class ArchetypeJobScheduler {
  concurrency: number;
  stats: { jobs: number; chunks: number; workerChunks: number; localChunks: number; failures: number };
  constructor(options?: { taskPool?: any; concurrency?: number });
  run(query: ArchetypeQuery, job: string | ((chunk: { table: ArchetypeTable; start: number; end: number }, payload?: any) => any), options?: { chunkSize?: number; payload?: any }): Promise<any[]>;
}

export class ApplicationLifecycle {
  engine: Engine | null;
  state: string;
  reason: string;
  bound: boolean;
  stats: Record<string, number>;
  constructor(engine?: Engine | null, options?: { autoSuspend?: boolean; autoResume?: boolean; handleNetwork?: boolean; handleDeviceLoss?: boolean });
  attach(): this;
  detach(): this;
  transition(state: string, reason?: string): this;
  monitorDevice(device: any): this;
  on(type: string, listener: (value: any) => void): this;
  off(type: string, listener: (value: any) => void): this;
  report(): any;
  dispose(): this;
}
