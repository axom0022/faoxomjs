import { Vector3 } from "../math/index.js";

import { BVHNode } from "./BVHNode.js";

class TriMeshBVH {
    constructor(zajha, zajhb) {
        this.geometry = zajha;
        this.maxLeaf = zajhb || 8;
        this.root = null;
        this.build();
    }
    build() {
        var zajha = this.geometry.attributes.position.array;
        var zajhb = this.geometry.index ? this.geometry.index.array : null;
        var zajhc = zajhb ? zajhb.length / 3 : zajha.length / 9;
        var zajhd = [];
        for (var zajhe = 0; zajhe < zajhc; zajhe++) {
            var zajhf = zajhb ? zajhb[zajhe * 3 + 0] : zajhe * 3 + 0;
            var zajhg = zajhb ? zajhb[zajhe * 3 + 1] : zajhe * 3 + 1;
            var zajhh = zajhb ? zajhb[zajhe * 3 + 2] : zajhe * 3 + 2;
            var zajhi = new Vector3(zajha[zajhf * 3], zajha[zajhf * 3 + 1], zajha[zajhf * 3 + 2]);
            var zajhj = new Vector3(zajha[zajhg * 3], zajha[zajhg * 3 + 1], zajha[zajhg * 3 + 2]);
            var zajhk = new Vector3(zajha[zajhh * 3], zajha[zajhh * 3 + 1], zajha[zajhh * 3 + 2]);
            var zajhl = zajhi.clone().add(zajhj).add(zajhk).multiplyScalar(1 / 3);
            var zajhm = new Vector3(Math.min(zajhi.x, zajhj.x, zajhk.x), Math.min(zajhi.y, zajhj.y, zajhk.y), Math.min(zajhi.z, zajhj.z, zajhk.z));
            var zajhn = new Vector3(Math.max(zajhi.x, zajhj.x, zajhk.x), Math.max(zajhi.y, zajhj.y, zajhk.y), Math.max(zajhi.z, zajhj.z, zajhk.z));
            zajhd.push({
                v0: zajhi,
                v1: zajhj,
                v2: zajhk,
                center: zajhl,
                min: zajhm,
                max: zajhn
            });
        }
        this.root = this._buildRecursive(zajhd, 0);
    }
    _buildRecursive(zajha, zajhb) {
        var zajhc = new BVHNode;
        for (var zajhd = 0; zajhd < zajha.length; zajhd++) {
            zajhc.min.min(zajha[zajhd].min);
            zajhc.max.max(zajha[zajhd].max);
        }
        if (zajha.length <= this.maxLeaf || zajhb > 20) {
            zajhc.triangles = zajha;
            zajhc.isLeaf = true;
            return zajhc;
        }
        var zajhe = zajhb % 3;
        var zajhf = zajhe === 0 ? "x" : zajhe === 1 ? "y" : "z";
        zajha.sort(function(zajha, zajhb) {
            return zajha.center[zajhf] - zajhb.center[zajhf];
        });
        var zajhg = Math.floor(zajha.length / 2);
        zajhc.left = this._buildRecursive(zajha.slice(0, zajhg), zajhb + 1);
        zajhc.right = this._buildRecursive(zajha.slice(zajhg), zajhb + 1);
        zajhc.isLeaf = false;
        return zajhc;
    }
    raycast(zajha, zajhb) {
        zajhb = zajhb || [];
        this._raycastNode(this.root, zajha, zajhb);
        return zajhb;
    }
    _raycastNode(zajha, zajhb, zajhc) {
        if (!zajha) return;
        var zajhd = (zajha.min.x - zajhb.origin.x) / (zajhb.direction.x || 1e-6);
        var zajhe = (zajha.max.x - zajhb.origin.x) / (zajhb.direction.x || 1e-6);
        if (zajhd > zajhe) {
            var zajhf = zajhd;
            zajhd = zajhe;
            zajhe = zajhf;
        }
        if (zajhe < 0) return;
        if (zajha.isLeaf) {
            for (var zajhg = 0; zajhg < zajha.triangles.length; zajhg++) {
                var zajhh = zajha.triangles[zajhg];
                var zajhi = zajhb.intersectTriangle ? zajhb.intersectTriangle(zajhh.v0, zajhh.v1, zajhh.v2, false, new Vector3) : null;
                if (zajhi) zajhc.push({
                    point: zajhi,
                    distance: zajhb.origin.distanceTo(zajhi)
                });
            }
            return;
        }
        this._raycastNode(zajha.left, zajhb, zajhc);
        this._raycastNode(zajha.right, zajhb, zajhc);
    }
}

export { TriMeshBVH };
