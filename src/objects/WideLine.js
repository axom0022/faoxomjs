import { WideLineGeometry } from "../geometries/index.js";

import { LineMaterial } from "../materials/index.js";

import { Mesh } from "./Mesh.js";

class WideLine extends Mesh {
    constructor(zasca, zascb) {
        zascb = zascb || {};
        super(new WideLineGeometry(zasca, zascb.width), zascb.material || new LineMaterial(zascb));
        this.type = "WideLine";
        this.frustumCulled = true;
    }
    setPoints(zasca, zascb) {
        this.geometry.setPoints(zasca, zascb === undefined ? this.material.width : zascb);
        return this;
    }
}

export { WideLine };
