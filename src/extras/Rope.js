import { faoxomvalue } from "../math/index.js";
import { SoftBody } from "./SoftBody.js";

class Rope extends SoftBody {
    constructor(start, end, segments, options) { options = options || {}; super(options); var count = Math.max(1, Math.floor(segments || 10)); for (var i = 0; i <= count; i++) this.addParticle(start.clone().lerp(end, i / count), faoxomvalue(options.massPerParticle, 0.1)); for (var j = 0; j < count; j++) this.connect(this.particles[j], this.particles[j + 1]); if (options.anchorStart) { this.particles[0].mass = 0; this.particles[0].inverseMass = 0; this.particles[0].isStatic = true; } if (options.anchorEnd) { this.particles[count].mass = 0; this.particles[count].inverseMass = 0; this.particles[count].isStatic = true; } }
}

export { Rope };
