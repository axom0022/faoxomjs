import { Vector3 } from "../math/index.js";
import { DistanceConstraint } from "./DistanceConstraint.js";

class FixedConstraint extends DistanceConstraint {
    constructor(a, b, options) { options = options || {}; super(a, b, 0, options); this.offset = new Vector3().subVectors(b.position, a.position); }
    solve(dt) { if (this.broken) return; var target = this.a.position.clone().add(this.offset); var delta = new Vector3().subVectors(this.b.position, target); var amount = delta.length(); if (amount > this.breakForce * dt) { this.broken = true; if (this.onBreak) this.onBreak(this); return; } if (!this.b.isStatic) this.b.position.addScaledVector(delta, -this.stiffness); this.b.syncObject(); }
}

export { FixedConstraint };
