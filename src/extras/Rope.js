import { faoxomvalue } from "../math/index.js";

import { SoftBody } from "./SoftBody.js";

class Rope extends SoftBody {
    constructor(zaiua, zaiub, zaiuc, zaiud) {
        zaiud = zaiud || {};
        super(zaiud);
        var zaiue = Math.max(1, Math.floor(zaiuc || 10));
        for (var zaiuf = 0; zaiuf <= zaiue; zaiuf++) this.addParticle(zaiua.clone().lerp(zaiub, zaiuf / zaiue), faoxomvalue(zaiud.massPerParticle, .1));
        for (var zaiug = 0; zaiug < zaiue; zaiug++) this.connect(this.particles[zaiug], this.particles[zaiug + 1]);
        if (zaiud.anchorStart) {
            this.particles[0].mass = 0;
            this.particles[0].inverseMass = 0;
            this.particles[0].isStatic = true;
        }
        if (zaiud.anchorEnd) {
            this.particles[zaiue].mass = 0;
            this.particles[zaiue].inverseMass = 0;
            this.particles[zaiue].isStatic = true;
        }
    }
}

export { Rope };
