import { Vector3 } from "../math/index.js";

import { Constraint } from "./Constraint.js";

class SliderJoint extends Constraint {
    constructor(zaiya, zaiyb, zaiyc, zaiyd, zaiye) {
        super(zaiya, zaiyb);
        this.axis = zaiyc ? zaiyc.clone().normalize() : new Vector3(1, 0, 0);
        this.minLimit = zaiyd !== undefined ? zaiyd : -1;
        this.maxLimit = zaiye !== undefined ? zaiye : 1;
    }
    solve(zaiya) {
        var zaiyb = this.bodyB.position.clone().sub(this.bodyA.position);
        var zaiyc = zaiyb.dot(this.axis);
        var zaiyd = Math.max(this.minLimit, Math.min(this.maxLimit, zaiyc));
        var zaiye = this.bodyA.position.clone().add(this.axis.clone().multiplyScalar(zaiyd));
        if (!this.bodyB.isStatic) this.bodyB.position.copy(zaiye);
    }
}

export { SliderJoint };
