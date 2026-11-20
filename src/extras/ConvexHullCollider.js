import { Vector3 } from "../math/index.js";

class ConvexHullCollider {
    constructor(zagva) {
        this.vertices = zagva || [];
        this.center = new Vector3;
        for (var zagvb = 0; zagvb < this.vertices.length; zagvb++) this.center.add(this.vertices[zagvb]);
        if (this.vertices.length) this.center.multiplyScalar(1 / this.vertices.length);
    }
    getSupportPoint(zagva) {
        var zagvb = -Infinity;
        var zagvc = this.vertices[0] || new Vector3;
        for (var zagvd = 0; zagvd < this.vertices.length; zagvd++) {
            var zagve = this.vertices[zagvd].dot(zagva);
            if (zagve > zagvb) {
                zagvb = zagve;
                zagvc = this.vertices[zagvd];
            }
        }
        return zagvc.clone();
    }
}

export { ConvexHullCollider };
