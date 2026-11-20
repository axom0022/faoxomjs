import { NodeMaterial } from "./NodeMaterial.js";

class MeshBasicNodeMaterial extends NodeMaterial {
    constructor(zaqta) {
        super(zaqta);
        this.type = "MeshBasicNodeMaterial";
    }
}

export { MeshBasicNodeMaterial };
