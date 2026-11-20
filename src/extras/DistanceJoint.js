import { Constraint } from "./Constraint.js";

class DistanceJoint extends Constraint {
    constructor(zahca, zahcb, zahcc) {
        super(zahca, zahcb);
        this.distance = zahcc !== undefined ? zahcc : zahca.position.distanceTo(zahcb.position);
        this.stiffness = 1;
    }
    solve(zahca) {
        var zahcb = this.bodyB.position.clone().sub(this.bodyA.position);
        var zahcc = zahcb.length();
        if (zahcc === 0) return;
        var zahcd = (zahcc - this.distance) / zahcc;
        var zahce = zahcb.multiplyScalar(zahcd * .5 * this.stiffness);
        if (!this.bodyA.isStatic) this.bodyA.position.add(zahce);
        if (!this.bodyB.isStatic) this.bodyB.position.sub(zahce);
    }
}

export { DistanceJoint };
