import { Vector3 } from "../math/index.js";

class BVHNode {
    constructor() {
        this.min = new Vector3(Infinity, Infinity, Infinity);
        this.max = new Vector3(-Infinity, -Infinity, -Infinity);
        this.left = null;
        this.right = null;
        this.triangles = [];
        this.isLeaf = true;
    }
}

export { BVHNode };
