import { Vector3 } from "../math/index.js";
import { BVHNode } from "./BVHNode.js";

class TriMeshBVH {
    constructor(geometry, maxTrianglesPerLeaf) {
        this.geometry = geometry;
        this.maxLeaf = maxTrianglesPerLeaf || 8;
        this.root = null;
        this.build();
    }
    build() {
        var pos = this.geometry.attributes.position.array;
        var idx = this.geometry.index ? this.geometry.index.array : null;
        var triCount = idx ? idx.length / 3 : pos.length / 9;
        var triangles = [];
        for (var t = 0; t < triCount; t++) {
            var i0 = idx ? idx[t * 3 + 0] : t * 3 + 0;
            var i1 = idx ? idx[t * 3 + 1] : t * 3 + 1;
            var i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
            var v0 = new Vector3(pos[i0 * 3], pos[i0 * 3 + 1], pos[i0 * 3 + 2]);
            var v1 = new Vector3(pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]);
            var v2 = new Vector3(pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]);
            var center = v0.clone().add(v1).add(v2).multiplyScalar(1 / 3);
            var min = new Vector3(Math.min(v0.x, v1.x, v2.x), Math.min(v0.y, v1.y, v2.y), Math.min(v0.z, v1.z, v2.z));
            var max = new Vector3(Math.max(v0.x, v1.x, v2.x), Math.max(v0.y, v1.y, v2.y), Math.max(v0.z, v1.z, v2.z));
            triangles.push({ v0: v0, v1: v1, v2: v2, center: center, min: min, max: max });
        }
        this.root = this._buildRecursive(triangles, 0);
    }
    _buildRecursive(triangles, depth) {
        var node = new BVHNode();
        for (var i = 0; i < triangles.length; i++) {
            node.min.min(triangles[i].min);
            node.max.max(triangles[i].max);
        }
        if (triangles.length <= this.maxLeaf || depth > 20) {
            node.triangles = triangles;
            node.isLeaf = true;
            return node;
        }
        var axis = depth % 3;
        var axisKey = axis === 0 ? "x" : (axis === 1 ? "y" : "z");
        triangles.sort(function(a, b) { return a.center[axisKey] - b.center[axisKey]; });
        var mid = Math.floor(triangles.length / 2);
        node.left = this._buildRecursive(triangles.slice(0, mid), depth + 1);
        node.right = this._buildRecursive(triangles.slice(mid), depth + 1);
        node.isLeaf = false;
        return node;
    }
    raycast(ray, targetHits) {
        targetHits = targetHits || [];
        this._raycastNode(this.root, ray, targetHits);
        return targetHits;
    }
    _raycastNode(node, ray, hits) {
        if (!node) return;
        var tMin = (node.min.x - ray.origin.x) / (ray.direction.x || 1e-6);
        var tMax = (node.max.x - ray.origin.x) / (ray.direction.x || 1e-6);
        if (tMin > tMax) { var tmp = tMin; tMin = tMax; tMax = tmp; }
        if (tMax < 0) return;
        if (node.isLeaf) {
            for (var i = 0; i < node.triangles.length; i++) {
                var tri = node.triangles[i];
                var hit = ray.intersectTriangle ? ray.intersectTriangle(tri.v0, tri.v1, tri.v2, false, new Vector3()) : null;
                if (hit) hits.push({ point: hit, distance: ray.origin.distanceTo(hit) });
            }
            return;
        }
        this._raycastNode(node.left, ray, hits);
        this._raycastNode(node.right, ray, hits);
    }
}

export { TriMeshBVH };
