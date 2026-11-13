import { faoxomvalue } from "../math/index.js";
import { Material } from "./Material.js";

class LineBasicMaterial extends Material { constructor(options) { options = options || {}; super(options); this.type = "LineBasicMaterial"; this.linewidth = faoxomvalue(options.linewidth, 1); } }

export { LineBasicMaterial };
