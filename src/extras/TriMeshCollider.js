import { Vector3 } from "../math/index.js";

import { TriMeshBVH } from "./TriMeshBVH.js";

class TriMeshCollider {
    constructor(zajia) {
        this.geometry = zajia;
        this.bvh = new TriMeshBVH(zajia);
    }
    getSupportPoint(zajia) {
        var zajib = this.geometry.attributes.position.array;
        var zajic = -Infinity;
        var zajid = new Vector3;
        for (var zajie = 0; zajie < zajib.length; zajie += 3) {
            var zajif = new Vector3(zajib[zajie], zajib[zajie + 1], zajib[zajie + 2]);
            var zajig = zajif.dot(zajia);
            if (zajig > zajic) {
                zajic = zajig;
                zajid = zajif;
            }
        }
        return zajid;
    }
}

export { TriMeshCollider };
