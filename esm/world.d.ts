export interface SpatialBounds {
  min: { x: number; y: number; z: number } | [number, number, number];
  max: { x: number; y: number; z: number } | [number, number, number];
}

export class UnifiedSpatialDatabase {
  cellSizes: number[];
  stats: Record<string, number>;
  constructor(options?: { cellSizes?: number[] });
  insert(id: string | number, bounds: SpatialBounds | any, options?: any): this;
  update(id: string | number, bounds: SpatialBounds | any, options?: any): this;
  remove(id: string | number): boolean;
  queryAABB(bounds: SpatialBounds | any, options?: any, target?: any[]): any[];
  querySphere(center: any, radius: number, options?: any, target?: any[]): any[];
  queryRay(origin: any, direction: any, distance?: number, options?: any, target?: any[]): Array<{ id: string | number; distance: number; record?: any }>;
  get(id: string | number): any;
  clear(): this;
  report(): any;
}

export class PredictiveStreamer {
  horizons: number[];
  points: any[];
  constructor(options?: any);
  predict(position: any, velocity?: any, direction?: any, intents?: any[]): any[];
}

export class WorldCell {
  id: string | number;
  bounds: SpatialBounds;
  center: { x: number; y: number; z: number };
  importance: number;
  layers: Map<string, any>;
  metadata: Record<string, any>;
  constructor(specification: any);
}

export class WorldPartition {
  spatial: UnifiedSpatialDatabase;
  predictor: PredictiveStreamer;
  cells: Map<string | number, WorldCell>;
  frame: number;
  stats: Record<string, number>;
  constructor(options?: any);
  register(specification: any): WorldCell;
  unregister(id: string | number): boolean;
  update(position: any, velocity?: any, direction?: any, intents?: any[]): this;
  flush(): Promise<this>;
  cell(id: string | number): WorldCell | null;
  report(): any;
}

export class OriginNode {
  name: string;
  parent: OriginNode | null;
  origin: Float64Array;
  version: number;
  constructor(name: string, parent?: OriginNode | null, origin?: any);
  set(origin: any): this;
}

export class OriginHierarchy {
  nodes: Map<string, OriginNode>;
  stats: Record<string, number>;
  constructor(options?: any);
  define(name: string, parent?: string, origin?: any): OriginNode;
  remove(name: string): boolean;
  node(name: string | OriginNode): OriginNode;
  globalOrigin(name: string | OriginNode, target?: Float64Array): Float64Array;
  toGlobal(name: string | OriginNode, position: any, target?: Float64Array): Float64Array;
  fromGlobal(name: string | OriginNode, position: any, target?: Float64Array): Float64Array;
  convert(from: string | OriginNode, to: string | OriginNode, position: any, target?: Float64Array): Float64Array;
  rebase(name: string | OriginNode, origin: any, objects?: any[]): Float64Array;
  onRebase(listener: (event: any) => void): this;
  offRebase(listener: (event: any) => void): this;
  serialize(): any[];
  restore(records: any[]): this;
  report(): any;
}

export class GeometryPageCodec {
  static encode(geometry: any): { buffer: ArrayBuffer; vertexCount: number; indexCount: number; byteLength: number; flags: number; bounds: number[] };
  static decode(input: ArrayBuffer | ArrayBufferView | { buffer: ArrayBuffer }): { attributes: { position: Float32Array; normal: Float32Array | null; uv: Float32Array | null }; index: Uint16Array | Uint32Array; vertexCount: number; indexCount: number; bounds: number[]; byteLength: number };
}

export class RuntimeGeometryCache {
  maxBytes: number;
  bytes: number;
  stats: Record<string, number>;
  constructor(options?: { maxBytes?: number });
  hash(value: any): string;
  get(key: string): any;
  set(key: string, value: any, bytes?: number): any;
  getOrCreate(key: string, generator: (key: string) => any | Promise<any>): Promise<any>;
  enforce(): this;
  clear(): this;
  report(): any;
}

export class VirtualGeometryAsset {
  id: string;
  levels: any[];
  nodes: any[];
  roots: number[];
  pages: Map<string, any>;
  built: boolean;
  stats: Record<string, number>;
  constructor(id: string, options?: { maxVertices?: number; maxTriangles?: number });
  addLevel(geometry: any, error: number, options?: { material?: number; pageId?: string }): this;
  build(): this;
  page(id: string): any;
  report(): any;
}

export class GeometryPageResidency {
  manager: any;
  cache: RuntimeGeometryCache;
  pages: Map<string, any>;
  stats: Record<string, number>;
  constructor(options?: any);
  registerAsset(asset: VirtualGeometryAsset): this;
  resident(id: string): boolean;
  request(id: string, context?: any): Promise<any>;
  touch(id: string, values?: any): boolean;
  update(): this;
  report(): any;
}

export class VirtualGeometrySelector {
  pixelError: number;
  maxClusters: number;
  maxTriangles: number;
  selected: any[];
  requests: string[];
  stats: Record<string, number>;
  constructor(options?: any);
  select(asset: VirtualGeometryAsset, options?: any): { selected: any[]; requests: string[]; stats: Record<string, number> };
  requestPages(residency: GeometryPageResidency, context?: any): Promise<any[]>;
}

export class VertexPullingStore {
  vertexCapacity: number;
  indexCapacity: number;
  vertexCount: number;
  indexCount: number;
  pages: Map<string, any>;
  stats: Record<string, number>;
  constructor(device?: any, options?: any);
  addPage(id: string, decoded: any): any;
  removePage(id: string): boolean;
  compact(decodedPages: Map<string, any>): any[];
  upload(): number;
  shaderLayout(): any;
  report(): any;
  dispose(): this;
}

export class IndirectCommandStream {
  maxCommands: number;
  count: number;
  stats: Record<string, number>;
  constructor(options?: { maxCommands?: number });
  build(nodes: any[], pageRecords: Map<string, any>, triangleBudget?: number, drawBudget?: number): { commands: Uint32Array; metadata: Uint32Array; count: number; stats: Record<string, number> };
}

export class VirtualGeometryRuntime {
  residency: GeometryPageResidency;
  store: VertexPullingStore;
  commandStream: IndirectCommandStream;
  assets: Map<string, VirtualGeometryAsset>;
  instances: any[];
  stats: Record<string, number>;
  constructor(device?: any, options?: any);
  addAsset(asset: VirtualGeometryAsset): this;
  addInstance(asset: string | VirtualGeometryAsset, options?: any): any;
  prepare(assetId: string): Promise<this>;
  syncPages(): this;
  update(camera: any, options?: any): any;
  report(): any;
  dispose(): this;
}
