import { Material } from "./Material.js";

class LambertMaterial extends Material { constructor(options) { super(options); this.type = "LambertMaterial"; } }

export { LambertMaterial };
