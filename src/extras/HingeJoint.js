import { Vector3 } from "../math/index.js";
import { Constraint } from "./Constraint.js";

class HingeJoint extends Constraint {
    constructor(bodyA, bodyB, axis, anchor) {
        super(bodyA, bodyB);
        this.axis = axis || new Vector3(0, 1, 0);
        this.anchor = anchor || bodyA.position.clone();
        this.minAngle = -Math.PI / 2;
        this.maxAngle = Math.PI / 2;
        this.motorSpeed = 0;
        this.maxTorque = 0;
    }
    solve(dt) {
        if (!this.bodyA.isStatic && !this.bodyB.isStatic) {
            var diff = this.bodyA.position.clone().sub(this.anchor);
            this.bodyA.position.sub(diff.multiplyScalar(0.5));
            this.bodyB.position.add(diff.multiplyScalar(0.5));
        }
    }
}

export { HingeJoint };
