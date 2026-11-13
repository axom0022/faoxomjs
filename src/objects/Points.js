import { PointsMaterial } from "../materials/index.js";
import { Mesh } from "./Mesh.js";

class Points extends Mesh { constructor(geometry, material) { super(geometry, material || new PointsMaterial()); this.type = "Points"; } }
Points.prototype.isPoints = true;

export { Points };
