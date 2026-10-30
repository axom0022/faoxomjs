import { Vector2, Vector3, Quaternion, Euler, Matrix4, Box3, Sphere, Ray, Color } from "./math.js";
import { BufferGeometry } from "./geometry.js";
import { Material } from "./materials.js";

export class EventDispatcher {
  addEventListener(type: string, listener: (event: any) => void): void;
  hasEventListener(type: string, listener: (event: any) => void): boolean;
  removeEventListener(type: string, listener: (event: any) => void): void;
  dispatchEvent(event: { type: string; [key: string]: any }): void;
}

export class Object3D extends EventDispatcher {
  id: number;
  uuid: string;
  name: string;
  type: string;
  parent: Object3D | null;
  children: Object3D[];
  up: Vector3;
  position: Vector3;
  rotation: Euler;
  quaternion: Quaternion;
  scale: Vector3;
  matrix: Matrix4;
  matrixWorld: Matrix4;
  matrixAutoUpdate: boolean;
  matrixWorldNeedsUpdate: boolean;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  frustumCulled: boolean;
  renderOrder: number;
  userData: { [key: string]: any };
  isObject3D: boolean;

  constructor();
  applyMatrix4(matrix: Matrix4): this;
  applyQuaternion(q: Quaternion): this;
  setRotationFromAxisAngle(axis: Vector3, angle: number): void;
  setRotationFromEuler(euler: Euler): void;
  setRotationFromMatrix(m: Matrix4): void;
  setRotationFromQuaternion(q: Quaternion): void;
  rotateOnAxis(axis: Vector3, angle: number): this;
  rotateOnWorldAxis(axis: Vector3, angle: number): this;
  rotateX(angle: number): this;
  rotateY(angle: number): this;
  rotateZ(angle: number): this;
  translateOnAxis(axis: Vector3, distance: number): this;
  translateX(distance: number): this;
  translateY(distance: number): this;
  translateZ(distance: number): this;
  localToWorld(vector: Vector3): Vector3;
  worldToLocal(vector: Vector3): Vector3;
  lookAt(vector: Vector3 | number, y?: number, z?: number): void;
  add(...object: Object3D[]): this;
  remove(...object: Object3D[]): this;
  removeFromParent(): this;
  clear(): this;
  getObjectById(id: number): Object3D | undefined;
  getObjectByName(name: string): Object3D | undefined;
  getWorldPosition(target: Vector3): Vector3;
  getWorldQuaternion(target: Quaternion): Quaternion;
  getWorldScale(target: Vector3): Vector3;
  getWorldDirection(target: Vector3): Vector3;
  raycast(raycaster: Raycaster, intersects: any[]): void;
  traverse(callback: (object: Object3D) => void): void;
  traverseVisible(callback: (object: Object3D) => void): void;
  traverseAncestors(callback: (object: Object3D) => void): void;
  updateMatrix(): void;
  updateMatrixWorld(force?: boolean): void;
  updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void;
  clone(recursive?: boolean): this;
  copy(source: this, recursive?: boolean): this;
}

export class Scene extends Object3D {
  override type: string;
  background: Color | null;
  environment: any;
  fog: any;
  isScene: boolean;
  constructor();
}

export class Camera extends Object3D {
  override type: string;
  matrixWorldInverse: Matrix4;
  projectionMatrix: Matrix4;
  projectionMatrixInverse: Matrix4;
  isCamera: boolean;
  constructor();
  getWorldDirection(target: Vector3): Vector3;
  updateMatrixWorld(force?: boolean): void;
  updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void;
}

export class PerspectiveCamera extends Camera {
  override type: string;
  fov: number;
  zoom: number;
  near: number;
  far: number;
  focus: number;
  aspect: number;
  view: any;
  filmGauge: number;
  filmOffset: number;
  isPerspectiveCamera: boolean;
  constructor(fov?: number, aspect?: number, near?: number, far?: number);
  setFocalLength(focalLength: number): void;
  getFocalLength(): number;
  getEffectiveFOV(): number;
  getFilmWidth(): number;
  getFilmHeight(): number;
  updateProjectionMatrix(): void;
  setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number): void;
  clearViewOffset(): void;
}

export class OrthographicCamera extends Camera {
  override type: string;
  zoom: number;
  near: number;
  far: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  view: any;
  isOrthographicCamera: boolean;
  constructor(left?: number, right?: number, top?: number, bottom?: number, near?: number, far?: number);
  updateProjectionMatrix(): void;
  setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number): void;
  clearViewOffset(): void;
}

export class Group extends Object3D {
  override type: string;
  isGroup: boolean;
  constructor();
}

export class Mesh<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material> extends Object3D {
  override type: string;
  geometry: TGeometry;
  material: TMaterial;
  morphTargetInfluences?: number[];
  morphTargetDictionary?: { [key: string]: number };
  isMesh: boolean;
  constructor(geometry?: TGeometry, material?: TMaterial);
  raycast(raycaster: Raycaster, intersects: any[]): void;
}

export class InstancedMesh<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material> extends Mesh<TGeometry, TMaterial> {
  override type: string;
  count: number;
  instanceMatrix: { array: Float32Array; needsUpdate: boolean };
  instanceColor: { array: Float32Array; needsUpdate: boolean } | null;
  isInstancedMesh: boolean;
  constructor(geometry: TGeometry, material: TMaterial, count: number);
  getMatrixAt(index: number, matrix: Matrix4): void;
  setMatrixAt(index: number, matrix: Matrix4): void;
  getColorAt(index: number, color: Color): void;
  setColorAt(index: number, color: Color): void;
}

export class SkinnedMesh<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material> extends Mesh<TGeometry, TMaterial> {
  override type: string;
  bindMode: string;
  bindMatrix: Matrix4;
  bindMatrixInverse: Matrix4;
  skeleton: Skeleton;
  isSkinnedMesh: boolean;
  constructor(geometry?: TGeometry, material?: TMaterial, useVertexTexture?: boolean);
  bind(skeleton: Skeleton, bindMatrix?: Matrix4): void;
  pose(): void;
  normalizeSkinWeights(): void;
  updateMatrixWorld(force?: boolean): void;
}

export class Bone extends Object3D {
  override type: string;
  isBone: boolean;
  constructor();
}

export class Skeleton {
  bones: Bone[];
  boneInverses: Matrix4[];
  boneMatrices: Float32Array;
  boneTexture: any;
  boneTextureSize: number;
  constructor(bones?: Bone[], boneInverses?: Matrix4[]);
  init(): void;
  calculateInverses(): void;
  pose(): void;
  update(): void;
  clone(): Skeleton;
  computeBoneTexture(): this;
  getBoneByName(name: string): Bone | undefined;
}

export class Points<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material> extends Object3D {
  override type: string;
  geometry: TGeometry;
  material: TMaterial;
  isPoints: boolean;
  constructor(geometry?: TGeometry, material?: TMaterial);
  raycast(raycaster: Raycaster, intersects: any[]): void;
}

export class Line<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material> extends Object3D {
  override type: string;
  geometry: TGeometry;
  material: TMaterial;
  isLine: boolean;
  constructor(geometry?: TGeometry, material?: TMaterial);
  raycast(raycaster: Raycaster, intersects: any[]): void;
}

export class LineSegments<TGeometry extends BufferGeometry = BufferGeometry, TMaterial extends Material | Material[] = Material> extends Line<TGeometry, TMaterial> {
  override type: string;
  isLineSegments: boolean;
  constructor(geometry?: TGeometry, material?: TMaterial);
}

export interface WebGLRendererParameters {
  canvas?: HTMLCanvasElement | OffscreenCanvas;
  context?: WebGL2RenderingContext | WebGLRenderingContext;
  alpha?: boolean;
  antialias?: boolean;
  depth?: boolean;
  stencil?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  powerPreference?: string;
  failIfMajorPerformanceCaveat?: boolean;
}

export class WebGLRenderer {
  domElement: HTMLCanvasElement;
  autoClear: boolean;
  autoClearColor: boolean;
  autoClearDepth: boolean;
  autoClearStencil: boolean;
  shadowMap: { enabled: boolean; type: number; autoUpdate: boolean; needsUpdate: boolean };
  toneMapping: number;
  toneMappingExposure: number;
  outputEncoding: number;
  info: { render: { calls: number; triangles: number; points: number; lines: number; frame: number }; memory: { geometries: number; textures: number } };

  constructor(parameters?: WebGLRendererParameters);
  getContext(): WebGL2RenderingContext;
  getContextAttributes(): any;
  setPixelRatio(value: number): void;
  getPixelRatio(): number;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  getSize(target: Vector2): Vector2;
  setDrawingBufferSize(width: number, height: number, pixelRatio: number): void;
  getDrawingBufferSize(target: Vector2): Vector2;
  setViewport(x: number, y: number, width: number, height: number): void;
  setScissor(x: number, y: number, width: number, height: number): void;
  setScissorTest(boolean: boolean): void;
  getClearColor(target: Color): Color;
  setClearColor(color: Color | string | number, alpha?: number): void;
  getClearAlpha(): number;
  setClearAlpha(alpha: number): void;
  clear(color?: boolean, depth?: boolean, stencil?: boolean): void;
  clearColor(): void;
  clearDepth(): void;
  clearStencil(): void;
  render(scene: Scene, camera: Camera): void;
  setRenderTarget(renderTarget: WebGLRenderTarget | null): void;
  getRenderTarget(): WebGLRenderTarget | null;
  readRenderTargetPixels(renderTarget: WebGLRenderTarget, x: number, y: number, width: number, height: number, buffer: any): void;
  dispose(): void;
}

export class WebGPURenderer {
  domElement: HTMLCanvasElement;
  autoClear: boolean;
  shadowMap: { enabled: boolean; type: number };
  info: { render: { calls: number; triangles: number; frame: number } };

  constructor(parameters?: { canvas?: HTMLCanvasElement; antialias?: boolean; alpha?: boolean });
  init(): Promise<void>;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  setPixelRatio(value: number): void;
  render(scene: Scene, camera: Camera): Promise<void> | void;
  setAnimationLoop(callback: (time: number) => void): void;
  dispose(): void;
}

export interface RenderTargetOptions {
  wrapS?: number;
  wrapT?: number;
  magFilter?: number;
  minFilter?: number;
  format?: number | string;
  type?: number | string;
  anisotropy?: number;
  depthBuffer?: boolean;
  stencilBuffer?: boolean;
  depthTexture?: any;
  samples?: number;
}

export class WebGLRenderTarget extends EventDispatcher {
  width: number;
  height: number;
  texture: any;
  depthBuffer: boolean;
  stencilBuffer: boolean;
  depthTexture: any;
  samples: number;
  isWebGLRenderTarget: boolean;
  constructor(width: number, height: number, options?: RenderTargetOptions);
  setSize(width: number, height: number): void;
  clone(): WebGLRenderTarget;
  copy(source: WebGLRenderTarget): this;
  dispose(): void;
}

export interface Intersection {
  distance: number;
  point: Vector3;
  face?: { a: number; b: number; c: number; normal: Vector3 };
  faceIndex?: number;
  object: Object3D;
  uv?: Vector2;
  instanceId?: number;
}

export class Raycaster {
  ray: Ray;
  near: number;
  far: number;
  camera: Camera;
  params: any;
  constructor(origin?: Vector3, direction?: Vector3, near?: number, far?: number);
  set(origin: Vector3, direction: Vector3): void;
  setFromCamera(coords: { x: number; y: number }, camera: Camera): void;
  intersectObject(object: Object3D, recursive?: boolean, optionalTarget?: Intersection[]): Intersection[];
  intersectObjects(objects: Object3D[], recursive?: boolean, optionalTarget?: Intersection[]): Intersection[];
}

export class Clock {
  autoStart: boolean;
  startTime: number;
  oldTime: number;
  elapsedTime: number;
  running: boolean;
  constructor(autoStart?: boolean);
  start(): void;
  stop(): void;
  getElapsedTime(): number;
  getDelta(): number;
}
