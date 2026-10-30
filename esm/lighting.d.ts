import { Color, Vector3, Matrix4 } from "./math.js";
import { Object3D, Camera, PerspectiveCamera, Scene } from "./core.js";

export class Light extends Object3D {
  override type: string;
  color: Color;
  intensity: number;
  isLight: boolean;
  constructor(color?: Color | string | number, intensity?: number);
  clone(recursive?: boolean): this;
  copy(source: this, recursive?: boolean): this;
}

export class DirectionalLight extends Light {
  override type: string;
  target: Object3D;
  castShadow: boolean;
  shadow: any;
  isDirectionalLight: boolean;
  constructor(color?: Color | string | number, intensity?: number);
}

export class PointLight extends Light {
  override type: string;
  distance: number;
  decay: number;
  castShadow: boolean;
  shadow: any;
  power: number;
  isPointLight: boolean;
  constructor(color?: Color | string | number, intensity?: number, distance?: number, decay?: number);
}

export class SpotLight extends Light {
  override type: string;
  target: Object3D;
  distance: number;
  angle: number;
  penumbra: number;
  decay: number;
  castShadow: boolean;
  shadow: any;
  power: number;
  isSpotLight: boolean;
  constructor(color?: Color | string | number, intensity?: number, distance?: number, angle?: number, penumbra?: number, decay?: number);
}

export class AmbientLight extends Light {
  override type: string;
  isAmbientLight: boolean;
  constructor(color?: Color | string | number, intensity?: number);
}

export class HemisphereLight extends Light {
  override type: string;
  groundColor: Color;
  isHemisphereLight: boolean;
  constructor(skyColor?: Color | string | number, groundColor?: Color | string | number, intensity?: number);
}

export class RectAreaLight extends Light {
  override type: string;
  width: number;
  height: number;
  isRectAreaLight: boolean;
  constructor(color?: Color | string | number, intensity?: number, width?: number, height?: number);
}

export interface CSMOptions {
  camera: PerspectiveCamera;
  parent: Object3D;
  cascades?: number;
  maxFar?: number;
  mode?: string;
  shadowMapSize?: number;
  lightDirection?: Vector3;
}

export class CSM {
  camera: PerspectiveCamera;
  cascades: number;
  maxFar: number;
  mode: string;
  shadowMapSize: number;
  lightDirection: Vector3;
  lights: DirectionalLight[];
  constructor(options: CSMOptions);
  update(cameraMatrix: Matrix4): void;
  updateFrustums(): void;
  dispose(): void;
}

export class CascadedShadowMap extends CSM {}

export class LightClusterGrid {
  clustersX: number;
  clustersY: number;
  clustersZ: number;
  totalClusters: number;
  near: number;
  far: number;
  clusterBuffer: Float32Array;
  constructor(options?: { clustersX?: number; clustersY?: number; clustersZ?: number; near?: number; far?: number });
  updateBounds(camera: Camera): void;
  getClusterIndex(x: number, y: number, z: number): number;
}

export class ClusteredLightingManager {
  grid: LightClusterGrid;
  maxLightsPerCluster: number;
  lightIndicesBuffer: Uint32Array;
  lightGridBuffer: Uint32Array;
  constructor(grid?: LightClusterGrid, maxLightsPerCluster?: number);
  buildClusters(camera: Camera, lights: Light[]): { totalActiveLights: number; lightBuffer: Float32Array; gridBuffer: Uint32Array };
}

export class AtmosphericSky extends Object3D {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  sunPosition: Vector3;
  constructor();
  setSunPosition(vector: Vector3): void;
}
