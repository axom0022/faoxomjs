import { PointsMaterial } from "../materials/index.js";

import { Mesh } from "./Mesh.js";

class Points extends Mesh {
    constructor(zarya, zaryb) {
        super(zarya, zaryb || new PointsMaterial);
        this.type = "Points";
    }
}

Points.prototype.isPoints = true;

export { Points };
