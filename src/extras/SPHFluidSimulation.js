import { Vector3 } from "../math/index.js";

class SPHFluidSimulation {
    constructor(maxParticles) {
        this.maxParticles = maxParticles || 512;
        this.particles = [];
        this.h = 0.4;
        this.h2 = this.h * this.h;
        this.restDensity = 1000;
        this.stiffness = 200;
        this.viscosity = 0.1;
        this.gravity = new Vector3(0, -9.81, 0);
        this._initParticles();
    }
    _initParticles() {
        this.particles = [];
        for (var i = 0; i < this.maxParticles; i++) {
            var px = (Math.random() - 0.5) * 1.5;
            var py = Math.random() * 2.0 + 0.5;
            var pz = (Math.random() - 0.5) * 1.5;
            this.particles.push({
                pos: new Vector3(px, py, pz),
                vel: new Vector3(),
                force: new Vector3(),
                density: 0,
                pressure: 0
            });
        }
    }
    update(dt) {
        dt = Math.min(dt || 0.016, 0.033);
        var poly6 = 315.0 / (64.0 * Math.PI * Math.pow(this.h, 9));
        var spikyGrad = -45.0 / (Math.PI * Math.pow(this.h, 6));
        for (var i = 0; i < this.particles.length; i++) {
            var pi = this.particles[i];
            pi.density = 0;
            for (var j = 0; j < this.particles.length; j++) {
                var pj = this.particles[j];
                var r2 = pi.pos.distanceToSquared(pj.pos);
                if (r2 < this.h2) pi.density += poly6 * Math.pow(this.h2 - r2, 3);
            }
            pi.density = Math.max(pi.density, this.restDensity * 0.1);
            pi.pressure = this.stiffness * (pi.density - this.restDensity);
        }
        for (var a = 0; a < this.particles.length; a++) {
            var pa = this.particles[a];
            pa.force.copy(this.gravity.clone().multiplyScalar(pa.density));
            for (var b = 0; b < this.particles.length; b++) {
                if (a === b) continue;
                var pb = this.particles[b];
                var delta = pa.pos.clone().sub(pb.pos);
                var r = delta.length();
                if (r > 0 && r < this.h) {
                    var pressTerm = (pa.pressure + pb.pressure) / (2.0 * pb.density);
                    var gradW = delta.normalize().multiplyScalar(spikyGrad * Math.pow(this.h - r, 2));
                    pa.force.sub(gradW.multiplyScalar(pressTerm));
                }
            }
            var acc = pa.force.clone().multiplyScalar(1.0 / pa.density);
            pa.vel.add(acc.multiplyScalar(dt));
            pa.pos.add(pa.vel.clone().multiplyScalar(dt));
            if (pa.pos.y < 0) { pa.pos.y = 0; pa.vel.y *= -0.5; }
        }
    }
}

export { SPHFluidSimulation };
