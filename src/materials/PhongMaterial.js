import { Material } from "./Material.js";

class PhongMaterial extends Material { constructor(options) { super(options); this.type = "PhongMaterial"; } }

export { PhongMaterial };
