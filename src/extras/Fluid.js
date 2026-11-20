import { Vector3, faoxomvalue } from "../math/index.js";

class Fluid {
    constructor(zahla) {
        zahla = zahla || {};
        this.world = zahla.world || null;
        this.particles = [];
        this.restDensity = faoxomvalue(zahla.restDensity, 1e3);
        this.pressure = faoxomvalue(zahla.pressure, 4);
        this.nearPressure = faoxomvalue(zahla.nearPressure, 4);
        this.viscosity = faoxomvalue(zahla.viscosity, .15);
        this.radius = faoxomvalue(zahla.radius, .18);
        this.mass = faoxomvalue(zahla.mass, 1);
        this.gravity = zahla.gravity ? zahla.gravity.clone() : new Vector3(0, -9.81, 0);
        this.bounds = zahla.bounds || null;
        this.surfaceTension = faoxomvalue(zahla.surfaceTension, .02);
        this.hash = {};
    }
    addParticle(zahla, zahlb) {
        var zahlc = {
            position: zahla.clone(),
            velocity: zahlb ? zahlb.clone() : new Vector3,
            force: new Vector3,
            density: this.restDensity,
            nearDensity: 0
        };
        this.particles.push(zahlc);
        return zahlc;
    }
    cellKey(zahla, zahlb) {
        return Math.floor(zahla.x / zahlb) + ":" + Math.floor(zahla.y / zahlb) + ":" + Math.floor(zahla.z / zahlb);
    }
    step(zahla) {
        var zahlb = this.radius * 4;
        this.hash = {};
        for (var zahlc = 0; zahlc < this.particles.length; zahlc++) {
            var zahld = this.cellKey(this.particles[zahlc].position, zahlb);
            if (!this.hash[zahld]) this.hash[zahld] = [];
            this.hash[zahld].push(zahlc);
            this.particles[zahlc].density = 0;
            this.particles[zahlc].nearDensity = 0;
            this.particles[zahlc].force.copy(this.gravity).multiplyScalar(this.mass);
        }
        var zahle = [];
        for (var zahlf = 0; zahlf < this.particles.length; zahlf++) {
            var zahlg = this.particles[zahlf];
            var zahlh = Math.floor(zahlg.position.x / zahlb), zahli = Math.floor(zahlg.position.y / zahlb), zahlj = Math.floor(zahlg.position.z / zahlb);
            for (var zahlk = -1; zahlk <= 1; zahlk++) for (var zahll = -1; zahll <= 1; zahll++) for (var zahlm = -1; zahlm <= 1; zahlm++) {
                var zahln = this.hash[zahlh + zahlm + ":" + (zahli + zahll) + ":" + (zahlj + zahlk)] || [];
                for (var zahlo = 0; zahlo < zahln.length; zahlo++) {
                    var zahlp = zahln[zahlo];
                    if (zahlp <= zahlf) continue;
                    var zahlq = this.particles[zahlp];
                    var zahlr = (new Vector3).subVectors(zahlq.position, zahlg.position);
                    var zahls = zahlr.length();
                    if (zahls <= 1e-6 || zahls >= zahlb) continue;
                    var zahlt = 1 - zahls / zahlb;
                    var zahlu = zahlt * zahlt;
                    var zahlv = zahlu * zahlt;
                    zahlg.density += zahlu;
                    zahlq.density += zahlu;
                    zahlg.nearDensity += zahlv;
                    zahlq.nearDensity += zahlv;
                    zahle.push({
                        a: zahlf,
                        b: zahlp,
                        delta: zahlr,
                        distance: zahls,
                        q: zahlt
                    });
                }
            }
        }
        for (var zahlw = 0; zahlw < this.particles.length; zahlw++) this.particles[zahlw].density = Math.max(this.restDensity * .5, this.particles[zahlw].density * this.restDensity * .5);
        for (var zahlx = 0; zahlx < zahle.length; zahlx++) {
            var zahly = zahle[zahlx], zahlz = this.particles[zahly.a], zahlaa = this.particles[zahly.b];
            var zahlab = zahly.delta.clone().multiplyScalar(1 / zahly.distance);
            var zahlac = this.pressure * Math.max(-1, zahlz.density / this.restDensity - 1);
            var zahlad = this.pressure * Math.max(-1, zahlaa.density / this.restDensity - 1);
            var zahlae = zahlab.clone().multiplyScalar((zahlac + zahlad) * zahly.q * this.mass);
            zahlz.force.addScaledVector(zahlae, -1);
            zahlaa.force.add(zahlae);
            var zahlaf = (new Vector3).subVectors(zahlaa.velocity, zahlz.velocity);
            var zahlag = zahlaf.multiplyScalar(this.viscosity * zahly.q);
            zahlz.force.add(zahlag);
            zahlaa.force.sub(zahlag);
        }
        for (var zahlah = 0; zahlah < this.particles.length; zahlah++) {
            var zahlai = this.particles[zahlah];
            zahlai.velocity.addScaledVector(zahlai.force, zahla / Math.max(zahlai.density, 1));
            zahlai.velocity.multiplyScalar(Math.max(0, 1 - zahla * .08));
            zahlai.position.addScaledVector(zahlai.velocity, zahla);
            if (this.bounds) {
                if (this.bounds.min && zahlai.position.x < this.bounds.min.x) {
                    zahlai.position.x = this.bounds.min.x;
                    zahlai.velocity.x = Math.abs(zahlai.velocity.x) * .35;
                }
                if (this.bounds.max && zahlai.position.x > this.bounds.max.x) {
                    zahlai.position.x = this.bounds.max.x;
                    zahlai.velocity.x = -Math.abs(zahlai.velocity.x) * .35;
                }
                if (this.bounds.min && zahlai.position.y < this.bounds.min.y) {
                    zahlai.position.y = this.bounds.min.y;
                    zahlai.velocity.y = Math.abs(zahlai.velocity.y) * .35;
                }
                if (this.bounds.max && zahlai.position.y > this.bounds.max.y) {
                    zahlai.position.y = this.bounds.max.y;
                    zahlai.velocity.y = -Math.abs(zahlai.velocity.y) * .35;
                }
                if (this.bounds.min && zahlai.position.z < this.bounds.min.z) {
                    zahlai.position.z = this.bounds.min.z;
                    zahlai.velocity.z = Math.abs(zahlai.velocity.z) * .35;
                }
                if (this.bounds.max && zahlai.position.z > this.bounds.max.z) {
                    zahlai.position.z = this.bounds.max.z;
                    zahlai.velocity.z = -Math.abs(zahlai.velocity.z) * .35;
                }
            }
        }
    }
}

export { Fluid };
