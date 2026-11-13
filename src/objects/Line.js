import { LineBasicMaterial } from "../materials/index.js";
import { Mesh } from "./Mesh.js";

class Line extends Mesh { constructor(geometry, material) { super(geometry, material || new LineBasicMaterial()); this.type = "Line"; } }
Line.prototype.isLine = true;

export { Line };
