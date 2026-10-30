import { Vector3, Quaternion, Box3, Sphere, Ray } from "./math.js";
import { BufferGeometry } from "./geometry.js";
import { Mesh } from "./core.js";

export interface RigidBodyOptions {
  mass?: number;
  position?: Vector3;
  quaternion?: Quaternion;
  linearVelocity?: Vector3;
  angularVelocity?: Vector3;
  friction?: number;
  restitution?: number;
  linearDamping?: number;
  angularDamping?: number;
  type?: "dynamic" | "static" | "kinematic";
  collider?: any;
}

export class RigidBody {
  mass: number;
  invMass: number;
  position: Vector3;
  quaternion: Quaternion;
  linearVelocity: Vector3;
  angularVelocity: Vector3;
  force: Vector3;
  torque: Vector3;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  type: "dynamic" | "static" | "kinematic";
  collider: any;
  aabb: Box3;
  constructor(options?: RigidBodyOptions);
  applyForce(force: Vector3, worldPoint?: Vector3): void;
  applyImpulse(impulse: Vector3, worldPoint?: Vector3): void;
  applyTorque(torque: Vector3): void;
  updateAABB(): void;
}

export class BVHNode {
  bounds: Box3;
  left: BVHNode | null;
  right: BVHNode | null;
  triangleIndices: number[];
  isLeaf: boolean;
  constructor();
}

export class TriMeshBVH {
  geometry: BufferGeometry;
  root: BVHNode;
  maxTrianglesPerLeaf: number;
  constructor(geometry: BufferGeometry, maxTrianglesPerLeaf?: number);
  build(): void;
  raycast(ray: Ray, intersects?: any[]): any[];
}

export class GJK {
  static support(colliderA: any, colliderB: any, direction: Vector3): Vector3;
  static evaluate(colliderA: any, colliderB: any): { hit: boolean; simplex: Vector3[] };
}

export class EPA {
  static evaluate(simplex: Vector3[], colliderA: any, colliderB: any): { penetrationDepth: number; normal: Vector3; contactPoint: Vector3 };
}

export class ConvexHullCollider {
  vertices: Vector3[];
  constructor(vertices: Vector3[] | BufferGeometry);
  getSupport(direction: Vector3): Vector3;
}

export class TriMeshCollider {
  geometry: BufferGeometry;
  bvh: TriMeshBVH;
  constructor(geometry: BufferGeometry);
  getSupport(direction: Vector3): Vector3;
}

export class CCDSolver {
  static checkContinuousCollision(bodyA: RigidBody, bodyB: RigidBody, dt: number): { hit: boolean; timeOfImpact: number; normal: Vector3; point: Vector3 };
}

export class Constraint {
  bodyA: RigidBody;
  bodyB: RigidBody;
  constructor(bodyA: RigidBody, bodyB: RigidBody);
  solve(dt: number): void;
}

export class DistanceJoint extends Constraint {
  distance: number;
  constructor(bodyA: RigidBody, bodyB: RigidBody, distance?: number);
}

export class HingeJoint extends Constraint {
  axis: Vector3;
  anchorA: Vector3;
  anchorB: Vector3;
  constructor(bodyA: RigidBody, bodyB: RigidBody, axis?: Vector3, anchorA?: Vector3, anchorB?: Vector3);
}

export class BallAndSocketJoint extends Constraint {
  anchorA: Vector3;
  anchorB: Vector3;
  constructor(bodyA: RigidBody, bodyB: RigidBody, anchorA?: Vector3, anchorB?: Vector3);
}

export class SliderJoint extends Constraint {
  axis: Vector3;
  constructor(bodyA: RigidBody, bodyB: RigidBody, axis?: Vector3);
}

export class SpringJoint extends Constraint {
  restLength: number;
  stiffness: number;
  damping: number;
  constructor(bodyA: RigidBody, bodyB: RigidBody, restLength?: number, stiffness?: number, damping?: number);
}

export class RagdollChain {
  bodies: RigidBody[];
  joints: Constraint[];
  constructor();
  addBody(body: RigidBody): void;
  addJoint(joint: Constraint): void;
  update(dt: number): void;
}

export class ClothSimulation {
  width: number;
  height: number;
  segmentsX: number;
  segmentsY: number;
  particles: Array<{ position: Vector3; previous: Vector3; original: Vector3; invMass: number }>;
  constraints: Array<{ p1: number; p2: number; restLength: number; stiffness: number }>;
  mesh: Mesh;
  constructor(width?: number, height?: number, segmentsX?: number, segmentsY?: number);
  step(dt: number, iterations?: number): void;
  pin(x: number, y: number): void;
}

export class SoftBodySimulation {
  mesh: Mesh;
  particles: Array<{ position: Vector3; previous: Vector3; invMass: number }>;
  tetrahedra: Array<[number, number, number, number]>;
  constructor(geometry: BufferGeometry);
  step(dt: number, iterations?: number): void;
}

export class SPHFluidSimulation {
  maxParticles: number;
  h: number;
  restDensity: number;
  gasConstant: number;
  viscosity: number;
  gravity: Vector3;
  positions: Float32Array;
  velocities: Float32Array;
  densities: Float32Array;
  pressures: Float32Array;
  particleCount: number;
  constructor(maxParticles?: number, options?: { h?: number; restDensity?: number; gasConstant?: number; viscosity?: number; gravity?: Vector3 });
  addParticle(x: number, y: number, z: number): void;
  step(dt: number): void;
}

export class PhysicsWorld {
  gravity: Vector3;
  bodies: RigidBody[];
  constraints: Constraint[];
  substeps: number;
  constructor(options?: { gravity?: Vector3; substeps?: number });
  addBody(body: RigidBody): void;
  removeBody(body: RigidBody): void;
  addConstraint(constraint: Constraint): void;
  removeConstraint(constraint: Constraint): void;
  step(dt: number): void;
}
