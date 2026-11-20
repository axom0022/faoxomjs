import { NodeMaterial } from "./NodeMaterial.js";

class MeshStandardNodeMaterial extends NodeMaterial {
    constructor(zaqua) {
        super(zaqua);
        this.type = "MeshStandardNodeMaterial";
    }
}

export { MeshStandardNodeMaterial };
