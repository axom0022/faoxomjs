import { Vector3 } from "../math/index.js";

class ConvexHullCollider {
    constructor(vertices) {
        this.vertices = vertices || [];
        this.center = new Vector3();
        for (var i = 0; i < this.vertices.length; i++) this.center.add(this.vertices[i]);
        if (this.vertices.length) this.center.multiplyScalar(1 / this.vertices.length);
    }
    getSupportPoint(direction) {
        var maxDot = -Infinity;
        var best = this.vertices[0] || new Vector3();
        for (var i = 0; i < this.vertices.length; i++) {
            var dot = this.vertices[i].dot(direction);
            if (dot > maxDot) { maxDot = dot; best = this.vertices[i]; }
        }
        return best.clone();
    }
}

export { ConvexHullCollider };
