import { Vector3 } from "../math/index.js";

class SPHFluidSimulation {
    constructor(zaiva) {
        this.maxParticles = zaiva || 512;
        this.particles = [];
        this.h = .4;
        this.h2 = this.h * this.h;
        this.restDensity = 1e3;
        this.stiffness = 200;
        this.viscosity = .1;
        this.gravity = new Vector3(0, -9.81, 0);
        this._initParticles();
    }
    _initParticles() {
        this.particles = [];
        for (var zaiva = 0; zaiva < this.maxParticles; zaiva++) {
            var zaivb = (Math.random() - .5) * 1.5;
            var zaivc = Math.random() * 2 + .5;
            var zaivd = (Math.random() - .5) * 1.5;
            this.particles.push({
                pos: new Vector3(zaivb, zaivc, zaivd),
                vel: new Vector3,
                force: new Vector3,
                density: 0,
                pressure: 0
            });
        }
    }
    update(zaiva) {
        zaiva = Math.min(zaiva || .016, .033);
        var zaivb = 315 / (64 * Math.PI * Math.pow(this.h, 9));
        var zaivc = -45 / (Math.PI * Math.pow(this.h, 6));
        for (var zaivd = 0; zaivd < this.particles.length; zaivd++) {
            var zaive = this.particles[zaivd];
            zaive.density = 0;
            for (var zaivf = 0; zaivf < this.particles.length; zaivf++) {
                var zaivg = this.particles[zaivf];
                var zaivh = zaive.pos.distanceToSquared(zaivg.pos);
                if (zaivh < this.h2) zaive.density += zaivb * Math.pow(this.h2 - zaivh, 3);
            }
            zaive.density = Math.max(zaive.density, this.restDensity * .1);
            zaive.pressure = this.stiffness * (zaive.density - this.restDensity);
        }
        for (var zaivi = 0; zaivi < this.particles.length; zaivi++) {
            var zaivj = this.particles[zaivi];
            zaivj.force.copy(this.gravity.clone().multiplyScalar(zaivj.density));
            for (var zaivk = 0; zaivk < this.particles.length; zaivk++) {
                if (zaivi === zaivk) continue;
                var zaivl = this.particles[zaivk];
                var zaivm = zaivj.pos.clone().sub(zaivl.pos);
                var zaivn = zaivm.length();
                if (zaivn > 0 && zaivn < this.h) {
                    var zaivo = (zaivj.pressure + zaivl.pressure) / (2 * zaivl.density);
                    var zaivp = zaivm.normalize().multiplyScalar(zaivc * Math.pow(this.h - zaivn, 2));
                    zaivj.force.sub(zaivp.multiplyScalar(zaivo));
                }
            }
            var zaivq = zaivj.force.clone().multiplyScalar(1 / zaivj.density);
            zaivj.vel.add(zaivq.multiplyScalar(zaiva));
            zaivj.pos.add(zaivj.vel.clone().multiplyScalar(zaiva));
            if (zaivj.pos.y < 0) {
                zaivj.pos.y = 0;
                zaivj.vel.y *= -.5;
            }
        }
    }
}

export { SPHFluidSimulation };
