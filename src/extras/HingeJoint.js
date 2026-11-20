import { Vector3 } from "../math/index.js";

import { Constraint } from "./Constraint.js";

class HingeJoint extends Constraint {
    constructor(zahua, zahub, zahuc, zahud) {
        super(zahua, zahub);
        this.axis = zahuc || new Vector3(0, 1, 0);
        this.anchor = zahud || zahua.position.clone();
        this.minAngle = -Math.PI / 2;
        this.maxAngle = Math.PI / 2;
        this.motorSpeed = 0;
        this.maxTorque = 0;
    }
    solve(zahua) {
        if (!this.bodyA.isStatic && !this.bodyB.isStatic) {
            var zahub = this.bodyA.position.clone().sub(this.anchor);
            this.bodyA.position.sub(zahub.multiplyScalar(.5));
            this.bodyB.position.add(zahub.multiplyScalar(.5));
        }
    }
}

export { HingeJoint };
