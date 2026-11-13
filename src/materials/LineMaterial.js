import { faoxomvalue } from "../math/index.js";
import { BasicMaterial } from "./BasicMaterial.js";

class LineMaterial extends BasicMaterial { constructor(options) { options = options || {}; super(options); this.type = "LineMaterial"; this.width = faoxomvalue(options.width, 0.05); this.side = "double"; } }

export { LineMaterial };
