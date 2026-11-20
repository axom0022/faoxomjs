import { Vector3 } from "../math/index.js";

class SoftBodySimulation {
    constructor(zajaa, zajab) {
        this.particles = (zajaa || []).map(function(zajaa) {
            return {
                pos: zajaa.clone(),
                oldPos: zajaa.clone(),
                vel: new Vector3,
                invMass: 1
            };
        });
        this.tetrahedra = zajab || [];
        this.compliance = .01;
    }
    update(zajaa) {
        zajaa = Math.min(zajaa || .016, .033);
        for (var zajab = 0; zajab < this.particles.length; zajab++) {
            var zajac = this.particles[zajab];
            var zajad = zajac.pos.clone();
            var zajae = zajac.pos.clone().sub(zajac.oldPos).multiplyScalar(.99);
            zajac.pos.add(zajae).add(new Vector3(0, -9.81 * zajaa * zajaa, 0));
            zajac.oldPos.copy(zajad);
        }
    }
}

export { SoftBodySimulation };
