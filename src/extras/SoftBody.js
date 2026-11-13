import { Vector3, faoxomvalue } from "../math/index.js";
import { CollisionShape } from "./CollisionShape.js";
import { DistanceConstraint } from "./DistanceConstraint.js";
import { FixedConstraint } from "./FixedConstraint.js";
import { RigidBody } from "./RigidBody.js";

class SoftBody {
    constructor(options) { options = options || {}; this.world = options.world || null; this.particles = []; this.constraints = []; this.damping = faoxomvalue(options.damping, 0.02); this.stiffness = faoxomvalue(options.stiffness, 0.8); this.gravity = options.gravity || null; this.geometry = options.geometry || null; this.positions = []; this.wind = options.wind ? options.wind.clone() : new Vector3(); this.collisionRadius = faoxomvalue(options.collisionRadius, 0.05); }
    addParticle(position, mass) { var value = mass === undefined ? 1 : mass; var particle = new RigidBody({ mass: value, position: position, shape: new CollisionShape("sphere", { radius: this.collisionRadius, mass: value }), linearDamping: this.damping, restitution: 0, friction: 0.7 }); this.particles.push(particle); if (this.world) this.world.addBody(particle); return particle; }
    connect(a, b, distance, stiffness) { var constraint = new DistanceConstraint(a, b, distance === undefined ? a.position.distanceTo(b.position) : distance, { stiffness: stiffness === undefined ? this.stiffness : stiffness }); this.constraints.push(constraint); if (this.world) this.world.addConstraint(constraint); return constraint; }
    addAnchor(particle, body, position) { var anchor = new FixedConstraint(particle, body, { stiffness: 1 }); anchor.offset = position ? position.clone() : new Vector3().subVectors(particle.position, body.position); this.constraints.push(anchor); if (this.world) this.world.addConstraint(anchor); return anchor; }
    setWind(wind) { this.wind.copy(wind || new Vector3()); return this; }
    preStep(dt) { if (!this.wind.lengthSq()) return; for (var i = 0; i < this.particles.length; i++) this.particles[i].applyForce(this.wind, this.particles[i].position); }
    updateGeometry() { if (!this.geometry || !this.geometry.attributes.position) return; var a = this.geometry.attributes.position.array; for (var i = 0; i < this.particles.length && i * 3 + 2 < a.length; i++) { a[i * 3] = this.particles[i].position.x; a[i * 3 + 1] = this.particles[i].position.y; a[i * 3 + 2] = this.particles[i].position.z; } this.geometry.attributes.position.needsUpdate = true; this.geometry.attributes.position.version = (this.geometry.attributes.position.version || 0) + 1; this.geometry.computeVertexNormals(); }
    destroy() { if (this.world) { for (var i = 0; i < this.particles.length; i++) this.world.removeBody(this.particles[i]); for (var j = 0; j < this.constraints.length; j++) this.world.removeConstraint(this.constraints[j]); this.world.removeSoftBody(this); } }
}

export { SoftBody };
