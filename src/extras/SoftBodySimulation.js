import { Vector3 } from "../math/index.js";

class SoftBodySimulation {
    constructor(vertices, tetrahedra) {
        this.particles = (vertices || []).map(function(v) {
            return { pos: v.clone(), oldPos: v.clone(), vel: new Vector3(), invMass: 1.0 };
        });
        this.tetrahedra = tetrahedra || [];
        this.compliance = 0.01;
    }
    update(dt) {
        dt = Math.min(dt || 0.016, 0.033);
        for (var i = 0; i < this.particles.length; i++) {
            var p = this.particles[i];
            var temp = p.pos.clone();
            var vel = p.pos.clone().sub(p.oldPos).multiplyScalar(0.99);
            p.pos.add(vel).add(new Vector3(0, -9.81 * dt * dt, 0));
            p.oldPos.copy(temp);
        }
    }
}

export { SoftBodySimulation };
