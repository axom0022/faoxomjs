import { Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";
import { SoftBody } from "./SoftBody.js";

class Cloth extends SoftBody {
    constructor(width, height, segmentsX, segmentsY, options) {
        options = options || {};
        super(options);
        this.width = faoxomvalue(width, 1); this.height = faoxomvalue(height, 1);
        this.segmentsX = Math.max(1, Math.floor(faoxomvalue(segmentsX, 10))); this.segmentsY = Math.max(1, Math.floor(faoxomvalue(segmentsY, 10)));
        this.pinTop = !!options.pinTop; this.pinBottom = !!options.pinBottom; this.index = function(x, y) { return y * (this.segmentsX + 1) + x; }.bind(this);
        for (var y = 0; y <= this.segmentsY; y++) for (var x = 0; x <= this.segmentsX; x++) {
            var particle = this.addParticle(new Vector3((x / this.segmentsX - 0.5) * this.width, (0.5 - y / this.segmentsY) * this.height, 0), faoxomvalue(options.massPerParticle, 0.1));
            if ((this.pinTop && y === 0) || (this.pinBottom && y === this.segmentsY)) { particle.mass = 0; particle.inverseMass = 0; particle.isStatic = true; }
        }
        for (var yy = 0; yy <= this.segmentsY; yy++) for (var xx = 0; xx <= this.segmentsX; xx++) {
            if (xx < this.segmentsX) this.connect(this.particles[this.index(xx, yy)], this.particles[this.index(xx + 1, yy)]);
            if (yy < this.segmentsY) this.connect(this.particles[this.index(xx, yy)], this.particles[this.index(xx, yy + 1)]);
            if (xx < this.segmentsX && yy < this.segmentsY) {
                this.connect(this.particles[this.index(xx, yy)], this.particles[this.index(xx + 1, yy + 1)], undefined, this.stiffness * 0.75);
                this.connect(this.particles[this.index(xx + 1, yy)], this.particles[this.index(xx, yy + 1)], undefined, this.stiffness * 0.75);
            }
            if (xx + 2 <= this.segmentsX) this.connect(this.particles[this.index(xx, yy)], this.particles[this.index(xx + 2, yy)], undefined, this.stiffness * 0.45);
            if (yy + 2 <= this.segmentsY) this.connect(this.particles[this.index(xx, yy)], this.particles[this.index(xx, yy + 2)], undefined, this.stiffness * 0.45);
        }
    }
    pin(x, y) { var particle = this.particles[this.index(faoxomclamp(x, 0, this.segmentsX), faoxomclamp(y, 0, this.segmentsY))]; if (particle) { particle.mass = 0; particle.inverseMass = 0; particle.isStatic = true; } return this; }
    unpin(x, y, mass) { var particle = this.particles[this.index(faoxomclamp(x, 0, this.segmentsX), faoxomclamp(y, 0, this.segmentsY))]; if (particle) { particle.mass = faoxomvalue(mass, 0.1); particle.inverseMass = 1 / particle.mass; particle.isStatic = false; } return this; }
}

export { Cloth };
