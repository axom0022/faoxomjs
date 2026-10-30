export class Vector2 {
  x: number;
  y: number;
  isVector2: boolean;
  constructor(x?: number, y?: number);
  set(x: number, y: number): this;
  setScalar(scalar: number): this;
  setX(x: number): this;
  setY(y: number): this;
  clone(): Vector2;
  copy(v: Vector2): this;
  add(v: Vector2): this;
  addScalar(s: number): this;
  addVectors(a: Vector2, b: Vector2): this;
  sub(v: Vector2): this;
  subScalar(s: number): this;
  subVectors(a: Vector2, b: Vector2): this;
  multiply(v: Vector2): this;
  multiplyScalar(s: number): this;
  divide(v: Vector2): this;
  divideScalar(s: number): this;
  min(v: Vector2): this;
  max(v: Vector2): this;
  clamp(min: Vector2, max: Vector2): this;
  dot(v: Vector2): number;
  cross(v: Vector2): number;
  lengthSq(): number;
  length(): number;
  normalize(): this;
  distanceTo(v: Vector2): number;
  distanceToSquared(v: Vector2): number;
  lerp(v: Vector2, alpha: number): this;
  equals(v: Vector2): boolean;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Vector3 {
  x: number;
  y: number;
  z: number;
  isVector3: boolean;
  constructor(x?: number, y?: number, z?: number);
  set(x: number, y: number, z: number): this;
  setScalar(scalar: number): this;
  setX(x: number): this;
  setY(y: number): this;
  setZ(z: number): this;
  clone(): Vector3;
  copy(v: Vector3): this;
  add(v: Vector3): this;
  addScalar(s: number): this;
  addVectors(a: Vector3, b: Vector3): this;
  sub(v: Vector3): this;
  subScalar(s: number): this;
  subVectors(a: Vector3, b: Vector3): this;
  multiply(v: Vector3): this;
  multiplyScalar(s: number): this;
  multiplyVectors(a: Vector3, b: Vector3): this;
  applyEuler(euler: Euler): this;
  applyAxisAngle(axis: Vector3, angle: number): this;
  applyMatrix3(m: Matrix3): this;
  applyMatrix4(m: Matrix4): this;
  applyQuaternion(q: Quaternion): this;
  project(camera: any): this;
  unproject(camera: any): this;
  transformDirection(m: Matrix4): this;
  divide(v: Vector3): this;
  divideScalar(s: number): this;
  min(v: Vector3): this;
  max(v: Vector3): this;
  clamp(min: Vector3, max: Vector3): this;
  dot(v: Vector3): number;
  cross(v: Vector3): this;
  crossVectors(a: Vector3, b: Vector3): this;
  lengthSq(): number;
  length(): number;
  normalize(): this;
  distanceTo(v: Vector3): number;
  distanceToSquared(v: Vector3): number;
  lerp(v: Vector3, alpha: number): this;
  equals(v: Vector3): boolean;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
  setFromMatrixPosition(m: Matrix4): this;
  setFromMatrixScale(m: Matrix4): this;
  setFromMatrixColumn(m: Matrix4, index: number): this;
}

export class Vector4 {
  x: number;
  y: number;
  z: number;
  w: number;
  isVector4: boolean;
  constructor(x?: number, y?: number, z?: number, w?: number);
  set(x: number, y: number, z: number, w: number): this;
  setScalar(scalar: number): this;
  clone(): Vector4;
  copy(v: Vector4): this;
  add(v: Vector4): this;
  addScalar(s: number): this;
  addVectors(a: Vector4, b: Vector4): this;
  sub(v: Vector4): this;
  subScalar(s: number): this;
  subVectors(a: Vector4, b: Vector4): this;
  multiplyScalar(s: number): this;
  applyMatrix4(m: Matrix4): this;
  divideScalar(s: number): this;
  min(v: Vector4): this;
  max(v: Vector4): this;
  clamp(min: Vector4, max: Vector4): this;
  dot(v: Vector4): number;
  lengthSq(): number;
  length(): number;
  normalize(): this;
  lerp(v: Vector4, alpha: number): this;
  equals(v: Vector4): boolean;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  isQuaternion: boolean;
  constructor(x?: number, y?: number, z?: number, w?: number);
  set(x: number, y: number, z: number, w: number): this;
  clone(): Quaternion;
  copy(q: Quaternion): this;
  setFromEuler(euler: Euler, update?: boolean): this;
  setFromAxisAngle(axis: Vector3, angle: number): this;
  setFromRotationMatrix(m: Matrix4): this;
  setFromUnitVectors(vFrom: Vector3, vTo: Vector3): this;
  identity(): this;
  invert(): this;
  conjugate(): this;
  dot(q: Quaternion): number;
  lengthSq(): number;
  length(): number;
  normalize(): this;
  multiply(q: Quaternion): this;
  premultiply(q: Quaternion): this;
  multiplyQuaternions(a: Quaternion, b: Quaternion): this;
  slerp(qb: Quaternion, t: number): this;
  equals(q: Quaternion): boolean;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Euler {
  x: number;
  y: number;
  z: number;
  order: string;
  isEuler: boolean;
  constructor(x?: number, y?: number, z?: number, order?: string);
  set(x: number, y: number, z: number, order?: string): this;
  clone(): Euler;
  copy(euler: Euler): this;
  setFromRotationMatrix(m: Matrix4, order?: string, update?: boolean): this;
  setFromQuaternion(q: Quaternion, order?: string, update?: boolean): this;
  setFromVector3(v: Vector3, order?: string): this;
  reorder(newOrder: string): this;
  equals(euler: Euler): boolean;
  fromArray(array: any[]): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Matrix3 {
  elements: number[];
  isMatrix3: boolean;
  constructor();
  set(n11: number, n12: number, n13: number,
      n21: number, n22: number, n23: number,
      n31: number, n32: number, n33: number): this;
  identity(): this;
  clone(): Matrix3;
  copy(m: Matrix3): this;
  extractBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this;
  setFromMatrix4(m: Matrix4): this;
  multiply(m: Matrix3): this;
  premultiply(m: Matrix3): this;
  multiplyMatrices(a: Matrix3, b: Matrix3): this;
  multiplyScalar(s: number): this;
  determinant(): number;
  invert(): this;
  transpose(): this;
  getNormalMatrix(matrix4: Matrix4): this;
  transposeIntoArray(r: number[]): this;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Matrix4 {
  elements: number[];
  isMatrix4: boolean;
  constructor();
  set(n11: number, n12: number, n13: number, n14: number,
      n21: number, n22: number, n23: number, n24: number,
      n31: number, n32: number, n33: number, n34: number,
      n41: number, n42: number, n43: number, n44: number): this;
  identity(): this;
  clone(): Matrix4;
  copy(m: Matrix4): this;
  copyPosition(m: Matrix4): this;
  extractBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this;
  makeBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): this;
  extractRotation(m: Matrix4): this;
  makeRotationFromEuler(euler: Euler): this;
  makeRotationFromQuaternion(q: Quaternion): this;
  lookAt(eye: Vector3, target: Vector3, up: Vector3): this;
  multiply(m: Matrix4): this;
  premultiply(m: Matrix4): this;
  multiplyMatrices(a: Matrix4, b: Matrix4): this;
  multiplyScalar(s: number): this;
  determinant(): number;
  transpose(): this;
  setPosition(x: number | Vector3, y?: number, z?: number): this;
  invert(): this;
  scale(v: Vector3): this;
  getMaxScaleOnAxis(): number;
  makeTranslation(x: number, y: number, z: number): this;
  makeRotationX(theta: number): this;
  makeRotationY(theta: number): this;
  makeRotationZ(theta: number): this;
  makeRotationAxis(axis: Vector3, angle: number): this;
  makeScale(x: number, y: number, z: number): this;
  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
  decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
  makePerspective(left: number, right: number, top: number, bottom: number, near: number, far: number): this;
  makeOrthographic(left: number, right: number, top: number, bottom: number, near: number, far: number): this;
  equals(matrix: Matrix4): boolean;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Color {
  r: number;
  g: number;
  b: number;
  isColor: boolean;
  constructor(r?: number | string | Color, g?: number, b?: number);
  set(value: number | string | Color): this;
  setScalar(scalar: number): this;
  setHex(hex: number): this;
  setRGB(r: number, g: number, b: number): this;
  setHSL(h: number, s: number, l: number): this;
  setStyle(style: string): this;
  clone(): Color;
  copy(color: Color): this;
  add(color: Color): this;
  addColors(a: Color, b: Color): this;
  addScalar(s: number): this;
  sub(color: Color): this;
  multiply(color: Color): this;
  multiplyScalar(s: number): this;
  lerp(color: Color, alpha: number): this;
  equals(c: Color): boolean;
  getHex(): number;
  getHexString(): string;
  getHSL(target?: { h: number; s: number; l: number }): { h: number; s: number; l: number };
  getStyle(): string;
  fromArray(array: number[] | ArrayLike<number>, offset?: number): this;
  toArray(array?: number[], offset?: number): number[];
}

export class Ray {
  origin: Vector3;
  direction: Vector3;
  constructor(origin?: Vector3, direction?: Vector3);
  set(origin: Vector3, direction: Vector3): this;
  clone(): Ray;
  copy(ray: Ray): this;
  at(t: number, target?: Vector3): Vector3;
  lookAt(v: Vector3): this;
  recast(t: number): this;
  closestPointToPoint(point: Vector3, target?: Vector3): Vector3;
  distanceToPoint(point: Vector3): number;
  distanceSqToPoint(point: Vector3): number;
  distanceSqToSegment(v0: Vector3, v1: Vector3, optionalPointOnRay?: Vector3, optionalPointOnSegment?: Vector3): number;
  intersectSphere(sphere: Sphere, target?: Vector3): Vector3 | null;
  intersectsSphere(sphere: Sphere): boolean;
  intersectPlane(plane: Plane, target?: Vector3): Vector3 | null;
  intersectsPlane(plane: Plane): boolean;
  distanceToPlane(plane: Plane): number;
  intersectBox(box: Box3, target?: Vector3): Vector3 | null;
  intersectsBox(box: Box3): boolean;
  intersectTriangle(a: Vector3, b: Vector3, c: Vector3, backfaceCulling: boolean, target?: Vector3): Vector3 | null;
  applyMatrix4(matrix4: Matrix4): this;
  equals(ray: Ray): boolean;
}

export class Plane {
  normal: Vector3;
  constant: number;
  isPlane: boolean;
  constructor(normal?: Vector3, constant?: number);
  set(normal: Vector3, constant: number): this;
  setComponents(x: number, y: number, z: number, w: number): this;
  setFromNormalAndCoplanarPoint(normal: Vector3, point: Vector3): this;
  setFromCoplanarPoints(a: Vector3, b: Vector3, c: Vector3): this;
  clone(): Plane;
  copy(plane: Plane): this;
  normalize(): this;
  negate(): this;
  distanceToPoint(point: Vector3): number;
  distanceToSphere(sphere: Sphere): number;
  projectPoint(point: Vector3, target?: Vector3): Vector3;
  intersectLine(line: any, target?: Vector3): Vector3 | null;
  intersectsLine(line: any): boolean;
  intersectsBox(box: Box3): boolean;
  intersectsSphere(sphere: Sphere): boolean;
  coplanarPoint(target?: Vector3): Vector3;
  applyMatrix4(matrix: Matrix4, optionalNormalMatrix?: Matrix3): this;
  translate(offset: Vector3): this;
  equals(plane: Plane): boolean;
}

export class Box3 {
  min: Vector3;
  max: Vector3;
  isBox3: boolean;
  constructor(min?: Vector3, max?: Vector3);
  set(min: Vector3, max: Vector3): this;
  setFromArray(array: number[] | ArrayLike<number>): this;
  setFromPoints(points: Vector3[]): this;
  setFromCenterAndSize(center: Vector3, size: Vector3): this;
  setFromObject(object: any): this;
  clone(): Box3;
  copy(box: Box3): this;
  makeEmpty(): this;
  isEmpty(): boolean;
  getCenter(target?: Vector3): Vector3;
  getSize(target?: Vector3): Vector3;
  expandByPoint(point: Vector3): this;
  expandByVector(vector: Vector3): this;
  expandByScalar(scalar: number): this;
  expandByObject(object: any): this;
  containsPoint(point: Vector3): boolean;
  containsBox(box: Box3): boolean;
  getParameter(point: Vector3, target?: Vector3): Vector3;
  intersectsBox(box: Box3): boolean;
  intersectsSphere(sphere: Sphere): boolean;
  intersectsPlane(plane: Plane): boolean;
  clampPoint(point: Vector3, target?: Vector3): Vector3;
  distanceToPoint(point: Vector3): number;
  getBoundingSphere(target?: Sphere): Sphere;
  intersect(box: Box3): this;
  union(box: Box3): this;
  applyMatrix4(matrix: Matrix4): this;
  translate(offset: Vector3): this;
  equals(box: Box3): boolean;
}

export class Sphere {
  center: Vector3;
  radius: number;
  constructor(center?: Vector3, radius?: number);
  set(center: Vector3, radius: number): this;
  setFromPoints(points: Vector3[], optionalCenter?: Vector3): this;
  clone(): Sphere;
  copy(sphere: Sphere): this;
  empty(): boolean;
  containsPoint(point: Vector3): boolean;
  distanceToPoint(point: Vector3): number;
  intersectsSphere(sphere: Sphere): boolean;
  intersectsBox(box: Box3): boolean;
  intersectsPlane(plane: Plane): boolean;
  clampPoint(point: Vector3, target?: Vector3): Vector3;
  getBoundingBox(target?: Box3): Box3;
  applyMatrix4(matrix: Matrix4): this;
  translate(offset: Vector3): this;
  equals(sphere: Sphere): boolean;
}

export class Frustum {
  planes: Plane[];
  constructor(p0?: Plane, p1?: Plane, p2?: Plane, p3?: Plane, p4?: Plane, p5?: Plane);
  set(p0: Plane, p1: Plane, p2: Plane, p3: Plane, p4: Plane, p5: Plane): this;
  clone(): Frustum;
  copy(frustum: Frustum): this;
  setFromProjectionMatrix(m: Matrix4): this;
  intersectsObject(object: any): boolean;
  intersectsSphere(sphere: Sphere): boolean;
  intersectsBox(box: Box3): boolean;
  containsPoint(point: Vector3): boolean;
}

export namespace MathUtils {
  const DEG2RAD: number;
  const RAD2DEG: number;
  function generateUUID(): string;
  function clamp(value: number, min: number, max: number): number;
  function euclideanModulo(n: number, m: number): number;
  function mapLinear(x: number, a1: number, a2: number, b1: number, b2: number): number;
  function lerp(x: number, y: number, t: number): number;
  function smoothstep(x: number, min: number, max: number): number;
  function smootherstep(x: number, min: number, max: number): number;
  function randInt(low: number, high: number): number;
  function randFloat(low: number, high: number): number;
  function randFloatSpread(range: number): number;
  function degToRad(degrees: number): number;
  function radToDeg(radians: number): number;
  function isPowerOfTwo(value: number): boolean;
  function ceilPowerOfTwo(value: number): number;
  function floorPowerOfTwo(value: number): number;
}
