import { LineBasicMaterial } from "../materials/index.js";

import { Mesh } from "./Mesh.js";

class Line extends Mesh {
    constructor(zarra, zarrb) {
        super(zarra, zarrb || new LineBasicMaterial);
        this.type = "Line";
    }
}

Line.prototype.isLine = true;

export { Line };
