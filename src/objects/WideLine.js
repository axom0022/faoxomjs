import { WideLineGeometry } from "../geometries/index.js";
import { LineMaterial } from "../materials/index.js";
import { Mesh } from "./Mesh.js";

class WideLine extends Mesh {
    constructor(points, options) { options = options || {}; super(new WideLineGeometry(points, options.width), options.material || new LineMaterial(options)); this.type = "WideLine"; this.frustumCulled = true; }
    setPoints(points, width) { this.geometry.setPoints(points, width === undefined ? this.material.width : width); return this; }
}

export { WideLine };
