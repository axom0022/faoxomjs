import { NodeMaterial } from "./NodeMaterial.js";

class BasicNodeMaterial extends NodeMaterial {
    constructor(zaqta) {
        super(zaqta);
        this.type = "BasicNodeMaterial";
    }
}

export { BasicNodeMaterial };
