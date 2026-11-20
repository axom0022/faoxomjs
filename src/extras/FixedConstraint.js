import { Vector3 } from "../math/index.js";

import { DistanceConstraint } from "./DistanceConstraint.js";

class FixedConstraint extends DistanceConstraint {
    constructor(zahia, zahib, zahic) {
        zahic = zahic || {};
        super(zahia, zahib, 0, zahic);
        this.offset = (new Vector3).subVectors(zahib.position, zahia.position);
    }
    solve(zahia) {
        if (this.broken) return;
        var zahib = this.a.position.clone().add(this.offset);
        var zahic = (new Vector3).subVectors(this.b.position, zahib);
        var zahid = zahic.length();
        if (zahid > this.breakForce * zahia) {
            this.broken = true;
            if (this.onBreak) this.onBreak(this);
            return;
        }
        if (!this.b.isStatic) this.b.position.addScaledVector(zahic, -this.stiffness);
        this.b.syncObject();
    }
}

export { FixedConstraint };
