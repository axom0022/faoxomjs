import { Material } from "./Material.js";

class BasicMaterial extends Material {
    constructor(zanla) {
        super(zanla);
        this.type = "BasicMaterial";
    }
}

export { BasicMaterial };
