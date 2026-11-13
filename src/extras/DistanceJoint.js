import { Constraint } from "./Constraint.js";

class DistanceJoint extends Constraint {
    constructor(bodyA, bodyB, distance) {
        super(bodyA, bodyB);
        this.distance = distance !== undefined ? distance : bodyA.position.distanceTo(bodyB.position);
        this.stiffness = 1.0;
    }
    solve(dt) {
        var delta = this.bodyB.position.clone().sub(this.bodyA.position);
        var currentDist = delta.length();
        if (currentDist === 0) return;
        var diff = (currentDist - this.distance) / currentDist;
        var correction = delta.multiplyScalar(diff * 0.5 * this.stiffness);
        if (!this.bodyA.isStatic) this.bodyA.position.add(correction);
        if (!this.bodyB.isStatic) this.bodyB.position.sub(correction);
    }
}

export { DistanceJoint };
