import { NodeMaterial } from "./NodeMaterial.js";

class StandardNodeMaterial extends NodeMaterial {
    constructor(zaqua) {
        super(zaqua);
        this.type = "StandardNodeMaterial";
    }
}

export { StandardNodeMaterial };
