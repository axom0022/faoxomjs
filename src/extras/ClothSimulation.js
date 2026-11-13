import { Vector3 } from "../math/index.js";

class ClothSimulation {
    constructor(width, height, segW, segH) {
        this.width = width || 2;
        this.height = height || 2;
        this.segW = segW || 10;
        this.segH = segH || 10;
        this.particles = [];
        this.constraints = [];
        this.gravity = new Vector3(0, -9.81, 0);
        this.damping = 0.98;
        this._initGrid();
    }
    _initGrid() {
        this.particles = [];
        this.constraints = [];
        for (var y = 0; y <= this.segH; y++) {
            for (var x = 0; x <= this.segW; x++) {
                var px = (x / this.segW - 0.5) * this.width;
                var py = (1.0 - y / this.segH) * this.height;
                var pz = 0;
                var isPinned = (y === 0 && (x === 0 || x === this.segW));
                this.particles.push({
                    pos: new Vector3(px, py, pz),
                    oldPos: new Vector3(px, py, pz),
                    vel: new Vector3(),
                    pinned: isPinned,
                    invMass: isPinned ? 0 : 1.0
                });
            }
        }
        var stride = this.segW + 1;
        for (var y = 0; y <= this.segH; y++) {
            for (var x = 0; x <= this.segW; x++) {
                var i = x + y * stride;
                if (x < this.segW) this.constraints.push({ a: i, b: i + 1, rest: this.width / this.segW });
                if (y < this.segH) this.constraints.push({ a: i, b: i + stride, rest: this.height / this.segH });
            }
        }
    }
    update(dt) {
        dt = Math.min(dt || 0.016, 0.033);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            if (p.pinned) continue;
            var temp = p.pos.clone();
            var vel = p.pos.clone().sub(p.oldPos).multiplyScalar(this.damping);
            p.pos.add(vel).add(this.gravity.clone().multiplyScalar(dt * dt));
            p.oldPos.copy(temp);
        }
        for (var iter = 0; iter < 4; iter++) {
            for (var c = 0; c < this.constraints.length; c++) {
                var con = this.constraints[c];
                var pA = this.particles[con.a], pB = this.particles[con.b];
                var delta = pB.pos.clone().sub(pA.pos);
                var dist = delta.length();
                if (dist === 0) continue;
                var diff = (dist - con.rest) / dist;
                var corr = delta.multiplyScalar(diff * 0.5);
                if (!pA.pinned) pA.pos.add(corr);
                if (!pB.pinned) pB.pos.sub(corr);
            }
        }
    }
}

export { ClothSimulation };
