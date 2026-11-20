import { Constraint } from "./Constraint.js";

class BallAndSocketJoint extends Constraint {
    constructor(zagka, zagkb, zagkc) {
        super(zagka, zagkb);
        this.anchor = zagkc || zagka.position.clone();
    }
    solve(zagka) {
        var zagkb = this.anchor;
        if (!this.bodyA.isStatic) this.bodyA.position.copy(zagkb);
        if (!this.bodyB.isStatic) this.bodyB.position.copy(zagkb);
    }
}

export { BallAndSocketJoint };
