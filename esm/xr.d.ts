import { WebGLRenderer, Object3D, Scene } from "./core.js";
import { DirectionalLight, HemisphereLight } from "./lighting.js";
import { Vector3, Quaternion } from "./math.js";

export interface HandJointPose {
  position: Vector3;
  quaternion: Quaternion;
  radius: number;
}

export class WebXRHandTracker {
  renderer: WebGLRenderer;
  leftHandJoints: HandJointPose[];
  rightHandJoints: HandJointPose[];
  constructor(renderer: WebGLRenderer);
  update(frame: any, referenceSpace: any): void;
  getJointPose(hand: "left" | "right", jointName: string): HandJointPose | null;
  getJoints(hand: "left" | "right"): HandJointPose[];
}

export interface DetectedPlane {
  polygon: Vector3[];
  planeSpace: any;
  orientation: "horizontal" | "vertical";
}

export class WebXRPlaneDetector {
  detectedPlanes: Map<any, DetectedPlane>;
  constructor();
  update(frame: any, referenceSpace: any): DetectedPlane[];
}

export class WebXRLightEstimator {
  renderer: WebGLRenderer;
  directionalLight: DirectionalLight;
  hemisphereLight: HemisphereLight;
  sphericalHarmonics: Float32Array;
  constructor(renderer: WebGLRenderer, scene?: Scene);
  update(frame: any, referenceSpace: any): void;
}

export class WebXRHaptics {
  static pulse(source: any, intensity?: number, durationMs?: number): Promise<boolean>;
}
