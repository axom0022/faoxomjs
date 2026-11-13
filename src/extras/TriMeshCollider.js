import { Vector3 } from "../math/index.js";
import { TriMeshBVH } from "./TriMeshBVH.js";

class TriMeshCollider {
    constructor(geometry) {
        this.geometry = geometry;
        this.bvh = new TriMeshBVH(geometry);
    }
    getSupportPoint(direction) {
        var pos = this.geometry.attributes.position.array;
        var maxDot = -Infinity;
        var best = new Vector3();
        for (var i = 0; i < pos.length; i += 3) {
            var v = new Vector3(pos[i], pos[i + 1], pos[i + 2]);
            var dot = v.dot(direction);
            if (dot > maxDot) { maxDot = dot; best = v; }
        }
        return best;
    }
}

export { TriMeshCollider };
