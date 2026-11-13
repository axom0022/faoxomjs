import { faoxomvalue } from "../math/index.js";

class BreakableConstraint {
    constructor(constraint, breakForce) { this.constraint = constraint; this.breakForce = faoxomvalue(breakForce, Infinity); this.broken = false; }
    solve(dt) { if (this.broken) return; this.constraint.breakForce = this.breakForce; this.constraint.solve(dt); this.broken = !!this.constraint.broken; }
}

export { BreakableConstraint };
