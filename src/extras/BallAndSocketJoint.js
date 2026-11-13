import { Constraint } from "./Constraint.js";

class BallAndSocketJoint extends Constraint {
    constructor(bodyA, bodyB, anchor) {
        super(bodyA, bodyB);
        this.anchor = anchor || bodyA.position.clone();
    }
    solve(dt) {
        var target = this.anchor;
        if (!this.bodyA.isStatic) this.bodyA.position.copy(target);
        if (!this.bodyB.isStatic) this.bodyB.position.copy(target);
    }
}

export { BallAndSocketJoint };
