import { Material } from "./Material.js";

class PhongMaterial extends Material {
    constructor(zanra) {
        super(zanra);
        this.type = "PhongMaterial";
    }
}

export { PhongMaterial };
