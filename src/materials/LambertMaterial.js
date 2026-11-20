import { Material } from "./Material.js";

class LambertMaterial extends Material {
    constructor(zanna) {
        super(zanna);
        this.type = "LambertMaterial";
    }
}

export { LambertMaterial };
