import { Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

class DistanceConstraint {
    constructor(zahba, zahbb, zahbc, zahbd) {
        zahbd = zahbd || {};
        this.a = zahba;
        this.b = zahbb;
        this.distance = zahbc === undefined ? zahba.position.distanceTo(zahbb.position) : zahbc;
        this.stiffness = faoxomclamp(faoxomvalue(zahbd.stiffness, 1), 0, 1);
        this.damping = Math.max(0, faoxomvalue(zahbd.damping, 0));
        this.breakForce = faoxomvalue(zahbd.breakForce, Infinity);
        this.broken = false;
        this.onBreak = zahbd.onBreak || null;
    }
    solve(zahba) {
        if (this.broken) return;
        var zahbb = (new Vector3).subVectors(this.b.position, this.a.position);
        var zahbc = zahbb.length() || 1;
        var zahbd = zahbc - this.distance;
        if (Math.abs(zahbd) > this.breakForce * zahba) {
            this.broken = true;
            if (this.onBreak) this.onBreak(this);
            return;
        }
        var zahbe = zahbb.multiplyScalar(zahbd / zahbc * this.stiffness);
        var zahbf = this.a.inverseMass + this.b.inverseMass || 1;
        if (!this.a.isStatic) this.a.position.addScaledVector(zahbe, this.a.inverseMass / zahbf);
        if (!this.b.isStatic) this.b.position.addScaledVector(zahbe, -this.b.inverseMass / zahbf);
        this.a.syncObject();
        this.b.syncObject();
    }
}

export { DistanceConstraint };
