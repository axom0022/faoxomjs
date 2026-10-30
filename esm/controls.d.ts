import { Camera, Object3D, Scene, LineSegments, EventDispatcher } from "./core.js";
import { DirectionalLight, PointLight } from "./lighting.js";
import { Vector3, Box3, Color } from "./math.js";

export class OrbitControls extends EventDispatcher {
  object: Camera;
  domElement: HTMLElement;
  enabled: boolean;
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  minZoom: number;
  maxZoom: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  minAzimuthAngle: number;
  maxAzimuthAngle: number;
  enableDamping: boolean;
  dampingFactor: number;
  enableZoom: boolean;
  zoomSpeed: number;
  enableRotate: boolean;
  rotateSpeed: number;
  enablePan: boolean;
  panSpeed: number;
  screenSpacePanning: boolean;
  keyPanSpeed: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  constructor(object: Camera, domElement?: HTMLElement);
  update(): boolean;
  saveState(): void;
  reset(): void;
  dispose(): void;
  getPolarAngle(): number;
  getAzimuthalAngle(): number;
  getDistance(): number;
}

export class MapControls extends OrbitControls {
  constructor(object: Camera, domElement?: HTMLElement);
}

export class FirstPersonControls {
  object: Camera;
  domElement: HTMLElement;
  enabled: boolean;
  movementSpeed: number;
  lookSpeed: number;
  lookVertical: boolean;
  autoForward: boolean;
  activeLook: boolean;
  heightSpeed: boolean;
  heightCoef: number;
  heightMin: number;
  heightMax: number;
  constrainVertical: boolean;
  verticalMin: number;
  verticalMax: number;
  mouseDragOn: boolean;
  constructor(object: Camera, domElement?: HTMLElement);
  handleResize(): void;
  lookAt(target: Vector3 | number, y?: number, z?: number): this;
  update(delta: number): void;
  dispose(): void;
}

export class PointerLockControls extends EventDispatcher {
  camera: Camera;
  domElement: HTMLElement;
  isLocked: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  pointerSpeed: number;
  constructor(camera: Camera, domElement?: HTMLElement);
  connect(): void;
  disconnect(): void;
  dispose(): void;
  getObject(): Camera;
  getDirection(v: Vector3): Vector3;
  moveForward(distance: number): void;
  moveRight(distance: number): void;
  lock(): void;
  unlock(): void;
}

export class TransformControls extends Object3D {
  camera: Camera;
  domElement: HTMLElement;
  object: Object3D | undefined;
  mode: "translate" | "rotate" | "scale";
  translationSnap: number | null;
  rotationSnap: number | null;
  scaleSnap: number | null;
  space: "world" | "local";
  size: number;
  dragging: boolean;
  showX: boolean;
  showY: boolean;
  showZ: boolean;
  constructor(camera: Camera, domElement?: HTMLElement);
  attach(object: Object3D): this;
  detach(): this;
  getMode(): "translate" | "rotate" | "scale";
  setMode(mode: "translate" | "rotate" | "scale"): void;
  setTranslationSnap(translationSnap: number | null): void;
  setRotationSnap(rotationSnap: number | null): void;
  setScaleSnap(scaleSnap: number | null): void;
  setSize(size: number): void;
  setSpace(space: "world" | "local"): void;
  dispose(): void;
}

export class StatsPanel {
  dom: HTMLDivElement;
  constructor();
  begin(): void;
  end(): void;
  update(): void;
}

export class CameraHelper extends LineSegments {
  camera: Camera;
  pointMap: { [key: string]: number[] };
  constructor(camera: Camera);
  update(): void;
}

export class DirectionalLightHelper extends Object3D {
  light: DirectionalLight;
  color: Color | string | number | undefined;
  constructor(light: DirectionalLight, size?: number, color?: Color | string | number);
  update(): void;
  dispose(): void;
}

export class PointLightHelper extends Object3D {
  light: PointLight;
  color: Color | string | number | undefined;
  constructor(light: PointLight, sphereSize?: number, color?: Color | string | number);
  update(): void;
  dispose(): void;
}

export class BoxHelper extends LineSegments {
  object: Object3D;
  constructor(object?: Object3D, color?: Color | string | number);
  update(object?: Object3D): void;
  setFromObject(object: Object3D): this;
}
