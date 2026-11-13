import { BasicMaterial } from "../materials/index.js";
import { DecalGeometry, Mesh } from "../objects/index.js";

class Decal extends Mesh { constructor(position, normal, size, material) { super(new DecalGeometry(position, normal, size), material || new BasicMaterial({ transparent: true, side: "double" })); this.type = "Decal"; } }

export { Decal };
