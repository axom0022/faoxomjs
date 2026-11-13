import { faoxomidnext, faoxominverseinertia } from "../core/index.js";
import { Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";
import { CollisionShape } from "./CollisionShape.js";

class RigidBody {
    static shapeFromObject(object) {
        if (!object || !object.geometry || !object.geometry.attributes || !object.geometry.attributes.position) return null;
        var geometry = object.geometry;
        if (!geometry.boundingBox) { if (geometry.computeBoundingBox) geometry.computeBoundingBox(); else return null; }
        if (!geometry.boundingBox || !isFinite(geometry.boundingBox.min.x) || !isFinite(geometry.boundingBox.max.x)) return null;
        var min = geometry.boundingBox.min, max = geometry.boundingBox.max;
        var sx = object.scale ? Math.abs(object.scale.x) || 1 : 1;
        var sy = object.scale ? Math.abs(object.scale.y) || 1 : 1;
        var sz = object.scale ? Math.abs(object.scale.z) || 1 : 1;
        var width = (max.x - min.x) * sx, height = (max.y - min.y) * sy, depth = (max.z - min.z) * sz;
        if (!isFinite(width) || !isFinite(height) || !isFinite(depth) || width <= 0 || height <= 0 || depth <= 0) return null;
        return new CollisionShape("box", { width: width, height: height, depth: depth });
    }
    constructor(options) { options = options || {}; this.id = faoxomidnext(); this.object = options.object || null; this.shape = options.shape || RigidBody.shapeFromObject(options.object) || new CollisionShape("box"); this.mass = faoxomvalue(options.mass, 1); this.inverseMass = this.mass > 0 ? 1 / this.mass : 0; this.position = options.position ? options.position.clone() : this.object ? this.object.position.clone() : new Vector3(); this.rotation = options.rotation ? options.rotation.clone() : this.object ? this.object.quaternion.clone() : new Quaternion(); this.velocity = options.velocity ? options.velocity.clone() : new Vector3(); this.angularVelocity = options.angularVelocity ? options.angularVelocity.clone() : new Vector3(); this.force = new Vector3(); this.torque = new Vector3(); this.restitution = faoxomclamp(faoxomvalue(options.restitution, 0.2), 0, 1); this.friction = Math.max(0, faoxomvalue(options.friction, 0.5)); this.linearDamping = Math.max(0, faoxomvalue(options.linearDamping, 0.01)); this.angularDamping = Math.max(0, faoxomvalue(options.angularDamping, 0.01)); this.isStatic = !!options.isStatic || this.mass === 0; this.inertia = options.inertia ? options.inertia.clone() : this.shape.inertia.clone(); this.inverseInertiaLocal = new Vector3(this.inertia.x > 0 ? 1 / this.inertia.x : 0, this.inertia.y > 0 ? 1 / this.inertia.y : 0, this.inertia.z > 0 ? 1 / this.inertia.z : 0); this.previousPosition = this.position.clone(); this.previousRotation = this.rotation.clone(); this.ccd = !!options.ccd || !!options.continuous; this.ccdMotionThreshold = faoxomvalue(options.ccdMotionThreshold, 0.5); this.sleeping = false; this.sleepTime = 0; this.sleepThreshold = faoxomvalue(options.sleepThreshold, 0.03); this.onCollision = null; this.userData = options.userData || {}; this.syncObject(); }
    wake() { this.sleeping = false; this.sleepTime = 0; return this; }
    sleep() { this.sleeping = true; this.velocity.set(0, 0, 0); this.angularVelocity.set(0, 0, 0); return this; }
    applyForce(force, point) { if (this.isStatic) return this; this.wake(); this.force.add(force); if (point) this.torque.add(new Vector3().crossVectors(new Vector3().subVectors(point, this.position), force)); return this; }
    applyTorque(torque) { if (!this.isStatic) { this.wake(); this.torque.add(torque); } return this; }
    applyImpulse(impulse, point, wake) { if (this.isStatic) return this; if (wake !== false) this.wake(); this.velocity.addScaledVector(impulse, this.inverseMass); if (point) { var r = new Vector3().subVectors(point, this.position); this.angularVelocity.add(faoxominverseinertia(this, new Vector3().crossVectors(r, impulse))); } return this; }
    getVelocityAtPoint(point, target) { var r = new Vector3().subVectors(point, this.position); return (target || new Vector3()).copy(this.velocity).add(new Vector3().crossVectors(this.angularVelocity, r)); }
    integrate(dt, gravity) { if (this.isStatic || this.sleeping) return; this.previousPosition.copy(this.position); this.previousRotation.copy(this.rotation); this.velocity.addScaledVector(gravity, dt); this.velocity.addScaledVector(this.force, this.inverseMass * dt); this.velocity.multiplyScalar(Math.max(0, 1 - this.linearDamping * dt)); this.angularVelocity.addScaledVector(faoxominverseinertia(this, this.torque), dt); this.angularVelocity.multiplyScalar(Math.max(0, 1 - this.angularDamping * dt)); this.position.addScaledVector(this.velocity, dt); var dq = new Quaternion(this.angularVelocity.x * dt * 0.5, this.angularVelocity.y * dt * 0.5, this.angularVelocity.z * dt * 0.5, 1); this.rotation.multiplyQuaternions(dq, this.rotation).normalize(); this.force.set(0, 0, 0); this.torque.set(0, 0, 0); this.syncObject(); }
    syncObject() { if (this.object) { this.object.position.copy(this.position); this.object.quaternion.copy(this.rotation); } }
}

export { RigidBody };
