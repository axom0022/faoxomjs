import { Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

import { SoftBody } from "./SoftBody.js";

class Cloth extends SoftBody {
    constructor(zagoa, zagob, zagoc, zagod, zagoe) {
        zagoe = zagoe || {};
        super(zagoe);
        this.width = faoxomvalue(zagoa, 1);
        this.height = faoxomvalue(zagob, 1);
        this.segmentsX = Math.max(1, Math.floor(faoxomvalue(zagoc, 10)));
        this.segmentsY = Math.max(1, Math.floor(faoxomvalue(zagod, 10)));
        this.pinTop = !!zagoe.pinTop;
        this.pinBottom = !!zagoe.pinBottom;
        this.index = function(zagoa, zagob) {
            return zagob * (this.segmentsX + 1) + zagoa;
        }.bind(this);
        for (var zagof = 0; zagof <= this.segmentsY; zagof++) for (var zagog = 0; zagog <= this.segmentsX; zagog++) {
            var zagoh = this.addParticle(new Vector3((zagog / this.segmentsX - .5) * this.width, (.5 - zagof / this.segmentsY) * this.height, 0), faoxomvalue(zagoe.massPerParticle, .1));
            if (this.pinTop && zagof === 0 || this.pinBottom && zagof === this.segmentsY) {
                zagoh.mass = 0;
                zagoh.inverseMass = 0;
                zagoh.isStatic = true;
            }
        }
        for (var zagoi = 0; zagoi <= this.segmentsY; zagoi++) for (var zagoj = 0; zagoj <= this.segmentsX; zagoj++) {
            if (zagoj < this.segmentsX) this.connect(this.particles[this.index(zagoj, zagoi)], this.particles[this.index(zagoj + 1, zagoi)]);
            if (zagoi < this.segmentsY) this.connect(this.particles[this.index(zagoj, zagoi)], this.particles[this.index(zagoj, zagoi + 1)]);
            if (zagoj < this.segmentsX && zagoi < this.segmentsY) {
                this.connect(this.particles[this.index(zagoj, zagoi)], this.particles[this.index(zagoj + 1, zagoi + 1)], undefined, this.stiffness * .75);
                this.connect(this.particles[this.index(zagoj + 1, zagoi)], this.particles[this.index(zagoj, zagoi + 1)], undefined, this.stiffness * .75);
            }
            if (zagoj + 2 <= this.segmentsX) this.connect(this.particles[this.index(zagoj, zagoi)], this.particles[this.index(zagoj + 2, zagoi)], undefined, this.stiffness * .45);
            if (zagoi + 2 <= this.segmentsY) this.connect(this.particles[this.index(zagoj, zagoi)], this.particles[this.index(zagoj, zagoi + 2)], undefined, this.stiffness * .45);
        }
    }
    pin(zagoa, zagob) {
        var zagoc = this.particles[this.index(faoxomclamp(zagoa, 0, this.segmentsX), faoxomclamp(zagob, 0, this.segmentsY))];
        if (zagoc) {
            zagoc.mass = 0;
            zagoc.inverseMass = 0;
            zagoc.isStatic = true;
        }
        return this;
    }
    unpin(zagoa, zagob, zagoc) {
        var zagod = this.particles[this.index(faoxomclamp(zagoa, 0, this.segmentsX), faoxomclamp(zagob, 0, this.segmentsY))];
        if (zagod) {
            zagod.mass = faoxomvalue(zagoc, .1);
            zagod.inverseMass = 1 / zagod.mass;
            zagod.isStatic = false;
        }
        return this;
    }
}

export { Cloth };
