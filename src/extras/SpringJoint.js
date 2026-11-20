import { Constraint } from "./Constraint.js";

class SpringJoint extends Constraint {
    constructor(zajca, zajcb, zajcc, zajcd, zajce) {
        super(zajca, zajcb);
        this.restLength = zajcc !== undefined ? zajcc : zajca.position.distanceTo(zajcb.position);
        this.stiffness = zajcd || 50;
        this.damping = zajce || 2;
    }
    solve(zajca) {
        var zajcb = this.bodyB.position.clone().sub(this.bodyA.position);
        var zajcc = zajcb.length();
        if (zajcc === 0) return;
        var zajcd = (zajcc - this.restLength) * this.stiffness;
        var zajce = zajcb.normalize();
        var zajcf = zajce.multiplyScalar(zajcd * zajca);
        if (!this.bodyA.isStatic && this.bodyA.velocity) this.bodyA.velocity.add(zajcf);
        if (!this.bodyB.isStatic && this.bodyB.velocity) this.bodyB.velocity.sub(zajcf);
    }
}

export { SpringJoint };
