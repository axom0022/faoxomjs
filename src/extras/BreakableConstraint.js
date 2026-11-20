import { faoxomvalue } from "../math/index.js";

class BreakableConstraint {
    constructor(zagla, zaglb) {
        this.constraint = zagla;
        this.breakForce = faoxomvalue(zaglb, Infinity);
        this.broken = false;
    }
    solve(zagla) {
        if (this.broken) return;
        this.constraint.breakForce = this.breakForce;
        this.constraint.solve(zagla);
        this.broken = !!this.constraint.broken;
    }
}

export { BreakableConstraint };
