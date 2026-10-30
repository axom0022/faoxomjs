import { Color, Vector2, Vector3, Matrix3, Matrix4 } from "./math.js";

export interface MaterialParameters {
  alphaTest?: number;
  blendDst?: number;
  blendDstAlpha?: number;
  blendEquation?: number;
  blendEquationAlpha?: number;
  blending?: number;
  blendSrc?: number;
  blendSrcAlpha?: number;
  clipIntersection?: boolean;
  clippingPlanes?: any[];
  clipShadows?: boolean;
  colorWrite?: boolean;
  depthFunc?: number;
  depthTest?: boolean;
  depthWrite?: boolean;
  name?: string;
  opacity?: number;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  precision?: "highp" | "mediump" | "lowp" | null;
  premultipliedAlpha?: boolean;
  dithering?: boolean;
  side?: number;
  shadowSide?: number;
  toneMapped?: boolean;
  transparent?: boolean;
  vertexColors?: boolean;
  visible?: boolean;
  wireframe?: boolean;
  wireframeLinewidth?: number;
  [key: string]: any;
}

export class Material {
  id: number;
  uuid: string;
  name: string;
  type: string;
  side: number;
  transparent: boolean;
  opacity: number;
  blending: number;
  depthTest: boolean;
  depthWrite: boolean;
  wireframe: boolean;
  needsUpdate: boolean;
  isMaterial: boolean;

  constructor();
  setValues(values?: MaterialParameters): void;
  clone(): this;
  copy(source: Material): this;
  dispose(): void;
}

export class BasicMaterial extends Material {
  color: Color;
  map: any;
  lightMap: any;
  aoMap: any;
  specularMap: any;
  alphaMap: any;
  envMap: any;
  combine: number;
  reflectivity: number;
  refractionRatio: number;
  wireframeLinewidth: number;
  wireframeLinecap: string;
  wireframeLinejoin: string;
  isMeshBasicMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class StandardMaterial extends Material {
  color: Color;
  roughness: number;
  metalness: number;
  map: any;
  lightMap: any;
  aoMap: any;
  emissive: Color;
  emissiveIntensity: number;
  emissiveMap: any;
  bumpMap: any;
  bumpScale: number;
  normalMap: any;
  normalScale: Vector2;
  displacementMap: any;
  displacementScale: number;
  roughnessMap: any;
  metalnessMap: any;
  alphaMap: any;
  envMap: any;
  envMapIntensity: number;
  isMeshStandardMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class PhysicalMaterial extends StandardMaterial {
  clearcoat: number;
  clearcoatRoughness: number;
  clearcoatNormalScale: Vector2;
  clearcoatNormalMap: any;
  ior: number;
  reflectivity: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: Color;
  transmission: number;
  transmissionMap: any;
  thickness: number;
  thicknessMap: any;
  attenuationDistance: number;
  attenuationColor: Color;
  specularIntensity: number;
  specularColor: Color;
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  anisotropy: number;
  anisotropyRotation: number;
  dispersion: number;
  subsurface: number;
  subsurfaceColor: Color;
  isMeshPhysicalMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class PhongMaterial extends Material {
  color: Color;
  specular: Color;
  shininess: number;
  map: any;
  bumpMap: any;
  normalMap: any;
  isMeshPhongMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class LambertMaterial extends Material {
  color: Color;
  map: any;
  isMeshLambertMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class ToonMaterial extends Material {
  color: Color;
  gradientMap: any;
  map: any;
  isMeshToonMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class PointsMaterial extends Material {
  color: Color;
  map: any;
  size: number;
  sizeAttenuation: boolean;
  isPointsMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class LineBasicMaterial extends Material {
  color: Color;
  linewidth: number;
  linecap: string;
  linejoin: string;
  isLineBasicMaterial: boolean;
  constructor(parameters?: MaterialParameters);
}

export class ShaderMaterial extends Material {
  uniforms: { [uniform: string]: { value: any } };
  vertexShader: string;
  fragmentShader: string;
  isShaderMaterial: boolean;
  constructor(parameters?: MaterialParameters & { uniforms?: { [key: string]: { value: any } }; vertexShader?: string; fragmentShader?: string });
}

export class ShaderNode {
  type: string;
  value: any;
  constructor(type: string, value: any);
  add(other: any): ShaderNode;
  sub(other: any): ShaderNode;
  mul(other: any): ShaderNode;
  div(other: any): ShaderNode;
  dot(other: any): ShaderNode;
  cross(other: any): ShaderNode;
  normalize(): ShaderNode;
}

export class NodeMaterial extends ShaderMaterial {
  isNodeMaterial: boolean;
  colorNode: any;
  roughnessNode: any;
  metalnessNode: any;
  normalNode: any;
  positionNode: any;
  constructor();
  build(): void;
}

export class MeshStandardNodeMaterial extends NodeMaterial {
  constructor(parameters?: MaterialParameters);
}

export class MeshBasicNodeMaterial extends NodeMaterial {
  constructor(parameters?: MaterialParameters);
}

export namespace tsl {
  function float(val: number): ShaderNode;
  function vec2(x: any, y?: any): ShaderNode;
  function vec3(x: any, y?: any, z?: any): ShaderNode;
  function vec4(x: any, y?: any, z?: any, w?: any): ShaderNode;
  function color(hexOrR?: any, g?: any, b?: any): ShaderNode;
  function uniform(name: string, type: string, value?: any): ShaderNode;
  function attribute(name: string, type: string): ShaderNode;
  function texture(tex: any, uv?: any): ShaderNode;
  function mix(a: any, b: any, t: any): ShaderNode;
  function clamp(val: any, min: any, max: any): ShaderNode;
  function smoothstep(min: any, max: any, val: any): ShaderNode;
  function dot(a: any, b: any): ShaderNode;
  function cross(a: any, b: any): ShaderNode;
  function normalize(a: any): ShaderNode;
  function length(a: any): ShaderNode;
  function sin(a: any): ShaderNode;
  function cos(a: any): ShaderNode;
  function pow(a: any, b: any): ShaderNode;
}

export class SSSSProfile {
  falloff: Color;
  blurRadius: number;
  maxSubsurfaceRadius: number;
  samples: number;
  weights: Float32Array;
  constructor(options?: { falloff?: Color; blurRadius?: number; maxSubsurfaceRadius?: number; samples?: number });
  calculateGaussianWeights(samples: number): Float32Array;
}

export class TSLBufferPacker {
  static packStd140(structDefinition: Array<{ name: string; type: string; value: any }>): { buffer: ArrayBuffer; size: number; offsets: { [key: string]: number } };
  static packStd430(structDefinition: Array<{ name: string; type: string; value: any }>): { buffer: ArrayBuffer; size: number; offsets: { [key: string]: number } };
}
