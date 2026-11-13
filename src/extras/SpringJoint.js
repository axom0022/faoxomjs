import { Constraint } from "./Constraint.js";

class SpringJoint extends Constraint {
    constructor(bodyA, bodyB, restLength, stiffness, damping) {
        super(bodyA, bodyB);
        this.restLength = restLength !== undefined ? restLength : bodyA.position.distanceTo(bodyB.position);
        this.stiffness = stiffness || 50;
        this.damping = damping || 2.0;
    }
    solve(dt) {
        var delta = this.bodyB.position.clone().sub(this.bodyA.position);
        var dist = delta.length();
        if (dist === 0) return;
        var forceMag = (dist - this.restLength) * this.stiffness;
        var dir = delta.normalize();
        var f = dir.multiplyScalar(forceMag * dt);
        if (!this.bodyA.isStatic && this.bodyA.velocity) this.bodyA.velocity.add(f);
        if (!this.bodyB.isStatic && this.bodyB.velocity) this.bodyB.velocity.sub(f);
    }
}

export { SpringJoint };
