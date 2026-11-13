import { Vector3 } from "../math/index.js";
import { Constraint } from "./Constraint.js";

class SliderJoint extends Constraint {
    constructor(bodyA, bodyB, axis, minLimit, maxLimit) {
        super(bodyA, bodyB);
        this.axis = axis ? axis.clone().normalize() : new Vector3(1, 0, 0);
        this.minLimit = minLimit !== undefined ? minLimit : -1;
        this.maxLimit = maxLimit !== undefined ? maxLimit : 1;
    }
    solve(dt) {
        var delta = this.bodyB.position.clone().sub(this.bodyA.position);
        var proj = delta.dot(this.axis);
        var clamped = Math.max(this.minLimit, Math.min(this.maxLimit, proj));
        var target = this.bodyA.position.clone().add(this.axis.clone().multiplyScalar(clamped));
        if (!this.bodyB.isStatic) this.bodyB.position.copy(target);
    }
}

export { SliderJoint };
