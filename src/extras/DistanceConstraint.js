import { Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

class DistanceConstraint {
    constructor(a, b, distance, options) { options = options || {}; this.a = a; this.b = b; this.distance = distance === undefined ? a.position.distanceTo(b.position) : distance; this.stiffness = faoxomclamp(faoxomvalue(options.stiffness, 1), 0, 1); this.damping = Math.max(0, faoxomvalue(options.damping, 0)); this.breakForce = faoxomvalue(options.breakForce, Infinity); this.broken = false; this.onBreak = options.onBreak || null; }
    solve(dt) { if (this.broken) return; var delta = new Vector3().subVectors(this.b.position, this.a.position); var length = delta.length() || 1; var error = length - this.distance; if (Math.abs(error) > this.breakForce * dt) { this.broken = true; if (this.onBreak) this.onBreak(this); return; } var correction = delta.multiplyScalar(error / length * this.stiffness); var total = this.a.inverseMass + this.b.inverseMass || 1; if (!this.a.isStatic) this.a.position.addScaledVector(correction, this.a.inverseMass / total); if (!this.b.isStatic) this.b.position.addScaledVector(correction, -this.b.inverseMass / total); this.a.syncObject(); this.b.syncObject(); }
}

export { DistanceConstraint };
