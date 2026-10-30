import { Vector2, Vector3, Vector4, Box3, Sphere, Matrix4, Quaternion } from "./math.js";
import { Camera, Mesh } from "./core.js";

export class BufferAttribute {
  array: ArrayLike<number>;
  itemSize: number;
  count: number;
  normalized: boolean;
  usage: number;
  version: number;
  needsUpdate: boolean;
  constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean);
  set(value: ArrayLike<number> | ArrayBufferView, offset?: number): this;
  getX(index: number): number;
  setX(index: number, x: number): this;
  getY(index: number): number;
  setY(index: number, y: number): this;
  getZ(index: number): number;
  setZ(index: number, z: number): this;
  getW(index: number): number;
  setW(index: number, w: number): this;
  setXYZ(index: number, x: number, y: number, z: number): this;
  setXYZW(index: number, x: number, y: number, z: number, w: number): this;
  clone(): BufferAttribute;
}

export class BufferGeometry {
  id: number;
  uuid: string;
  name: string;
  type: string;
  attributes: { [name: string]: BufferAttribute };
  index: BufferAttribute | null;
  boundingBox: Box3 | null;
  boundingSphere: Sphere | null;
  groups: Array<{ start: number; count: number; materialIndex?: number }>;
  morphAttributes: { [name: string]: BufferAttribute[] };
  isBufferGeometry: boolean;

  constructor();
  getIndex(): BufferAttribute | null;
  setIndex(index: BufferAttribute | number[] | null): this;
  setAttribute(name: string, attribute: BufferAttribute): this;
  getAttribute(name: string): BufferAttribute;
  deleteAttribute(name: string): this;
  hasAttribute(name: string): boolean;
  addGroup(start: number, count: number, materialIndex?: number): void;
  clearGroups(): void;
  setDrawRange(start: number, count: number): void;
  applyMatrix4(matrix: Matrix4): this;
  applyQuaternion(q: Quaternion): this;
  rotateX(angle: number): this;
  rotateY(angle: number): this;
  rotateZ(angle: number): this;
  translate(x: number, y: number, z: number): this;
  scale(x: number, y: number, z: number): this;
  lookAt(v: Vector3): this;
  center(): this;
  computeBoundingBox(): void;
  computeBoundingSphere(): void;
  computeVertexNormals(): void;
  computeTangents(): void;
  clone(): BufferGeometry;
  copy(source: BufferGeometry): this;
  dispose(): void;
}

export class Geometry extends BufferGeometry {
  isGeometry: boolean;
}

export class BoxGeometry extends BufferGeometry {
  parameters: { width: number; height: number; depth: number; widthSegments: number; heightSegments: number; depthSegments: number };
  constructor(width?: number, height?: number, depth?: number, widthSegments?: number, heightSegments?: number, depthSegments?: number);
}

export class SphereGeometry extends BufferGeometry {
  parameters: { radius: number; widthSegments: number; heightSegments: number; phiStart: number; phiLength: number; thetaStart: number; thetaLength: number };
  constructor(radius?: number, widthSegments?: number, heightSegments?: number, phiStart?: number, phiLength?: number, thetaStart?: number, thetaLength?: number);
}

export class PlaneGeometry extends BufferGeometry {
  parameters: { width: number; height: number; widthSegments: number; heightSegments: number };
  constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
}

export class CylinderGeometry extends BufferGeometry {
  parameters: { radiusTop: number; radiusBottom: number; height: number; radialSegments: number; heightSegments: number; openEnded: boolean; thetaStart: number; thetaLength: number };
  constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean, thetaStart?: number, thetaLength?: number);
}

export class ConeGeometry extends CylinderGeometry {
  constructor(radius?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean, thetaStart?: number, thetaLength?: number);
}

export class TorusGeometry extends BufferGeometry {
  parameters: { radius: number; tube: number; radialSegments: number; tubularSegments: number; arc: number };
  constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number, arc?: number);
}

export class TorusKnotGeometry extends BufferGeometry {
  parameters: { radius: number; tube: number; tubularSegments: number; radialSegments: number; p: number; q: number };
  constructor(radius?: number, tube?: number, tubularSegments?: number, radialSegments?: number, p?: number, q?: number);
}

export class IcosahedronGeometry extends BufferGeometry {
  parameters: { radius: number; detail: number };
  constructor(radius?: number, detail?: number);
}

export class DodecahedronGeometry extends BufferGeometry {
  parameters: { radius: number; detail: number };
  constructor(radius?: number, detail?: number);
}

export class OctahedronGeometry extends BufferGeometry {
  parameters: { radius: number; detail: number };
  constructor(radius?: number, detail?: number);
}

export class TetrahedronGeometry extends BufferGeometry {
  parameters: { radius: number; detail: number };
  constructor(radius?: number, detail?: number);
}

export class RingGeometry extends BufferGeometry {
  parameters: { innerRadius: number; outerRadius: number; thetaSegments: number; phiSegments: number; thetaStart: number; thetaLength: number };
  constructor(innerRadius?: number, outerRadius?: number, thetaSegments?: number, phiSegments?: number, thetaStart?: number, thetaLength?: number);
}

export class ShapeGeometry extends BufferGeometry {
  constructor(shapes: Shape | Shape[], curveSegments?: number);
}

export interface ExtrudeGeometryOptions {
  curveSegments?: number;
  steps?: number;
  depth?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelOffset?: number;
  bevelSegments?: number;
  extrudePath?: Curve<Vector3>;
}

export class ExtrudeGeometry extends BufferGeometry {
  constructor(shapes: Shape | Shape[], options?: ExtrudeGeometryOptions);
}

export class TubeGeometry extends BufferGeometry {
  parameters: { path: Curve<Vector3>; tubularSegments: number; radius: number; radialSegments: number; closed: boolean };
  constructor(path?: Curve<Vector3>, tubularSegments?: number, radius?: number, radialSegments?: number, closed?: boolean);
}

export class LatheGeometry extends BufferGeometry {
  parameters: { points: Vector2[]; segments: number; phiStart: number; phiLength: number };
  constructor(points?: Vector2[], segments?: number, phiStart?: number, phiLength?: number);
}

export class Curve<T> {
  arcLengthDivisions: number;
  getPoint(t: number, optionalTarget?: T): T;
  getPointAt(u: number, optionalTarget?: T): T;
  getPoints(divisions?: number): T[];
  getSpacedPoints(divisions?: number): T[];
  getLength(): number;
  getLengths(divisions?: number): number[];
  updateArcLengths(): void;
  getUtoTmapping(u: number, distance: number): number;
  getTangent(t: number, optionalTarget?: T): T;
  getTangentAt(u: number, optionalTarget?: T): T;
}

export class CatmullRomCurve3 extends Curve<Vector3> {
  points: Vector3[];
  closed: boolean;
  curveType: string;
  tension: number;
  constructor(points?: Vector3[], closed?: boolean, curveType?: string, tension?: number);
}

export class CubicBezierCurve3 extends Curve<Vector3> {
  v0: Vector3;
  v1: Vector3;
  v2: Vector3;
  v3: Vector3;
  constructor(v0?: Vector3, v1?: Vector3, v2?: Vector3, v3?: Vector3);
}

export class QuadraticBezierCurve3 extends Curve<Vector3> {
  v0: Vector3;
  v1: Vector3;
  v2: Vector3;
  constructor(v0?: Vector3, v1?: Vector3, v2?: Vector3);
}

export class NURBSCurve extends Curve<Vector3> {
  degree: number;
  knots: number[];
  controlPoints: Vector4[];
  startKnot: number;
  endKnot: number;
  constructor(degree: number, knots: number[], controlPoints: Vector4[], startKnot?: number, endKnot?: number);
}

export class Path {
  currentPoint: Vector2;
  curves: Array<Curve<Vector2>>;
  autoClose: boolean;
  constructor(points?: Vector2[]);
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  quadraticCurveTo(aCPx: number, aCPy: number, aX: number, aY: number): this;
  bezierCurveTo(aCP1x: number, aCP1y: number, aCP2x: number, aCP2y: number, aX: number, aY: number): this;
  splineThru(pts: Vector2[]): this;
  arc(aX: number, aY: number, aRadius: number, aStartAngle: number, aEndAngle: number, aClockwise?: boolean): this;
  absarc(aX: number, aY: number, aRadius: number, aStartAngle: number, aEndAngle: number, aClockwise?: boolean): this;
  closePath(): this;
  getPoints(divisions?: number): Vector2[];
}

export class Shape extends Path {
  holes: Path[];
  constructor(points?: Vector2[]);
  extractPoints(divisions?: number): { shape: Vector2[]; holes: Vector2[][] };
}

export interface LODLevel {
  distance: number;
  geometry: BufferGeometry;
  screenSpaceError?: number;
}

export class ContinuousLOD extends Mesh {
  levels: LODLevel[];
  autoUpdate: boolean;
  constructor();
  addLevel(geometry: BufferGeometry, distance?: number, screenSpaceError?: number): this;
  getCurrentLevel(): number;
  update(camera: Camera): void;
}

export class MeshDecimator {
  static decimate(geometry: BufferGeometry, targetRatio: number, errorThreshold?: number): BufferGeometry;
  static computeQuadricErrors(geometry: BufferGeometry): Float32Array;
}

export class VirtualGeometryStreamer {
  chunkSize: number;
  maxMemoryBytes: number;
  constructor(options?: { chunkSize?: number; maxMemoryBytes?: number });
  registerCluster(id: string | number, boundingSphere: Sphere, lodGeometries: BufferGeometry[]): void;
  update(camera: Camera): { loaded: number; evicted: number; activeChunks: number };
}
