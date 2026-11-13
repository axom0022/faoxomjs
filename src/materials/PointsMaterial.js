import { faoxomvalue } from "../math/index.js";
import { Material } from "./Material.js";

class PointsMaterial extends Material { constructor(options) { options = options || {}; super(options); this.type = "PointsMaterial"; this.size = faoxomvalue(options.size, 1); this.sizeAttenuation = options.sizeAttenuation !== false; } }

export { PointsMaterial };
