import { faoxomclosestpointtriangle, faoxomgjkcontact, faoxommeshtriangles } from "../core/index.js";

import { Box3, Vector3 } from "../math/index.js";

import { faoxomtrianglebody } from "./faoxomtrianglebody.js";

function faoxommeshcontact(zajva, zajvb, zajvc) {
    var zajvd = faoxommeshtriangles(zajva);
    if (!zajvd.length) return null;
    var zajve = zajvb.shape.getAABB(zajvb.position, null, zajvb.rotation);
    var zajvf = null;
    if (zajvb.shape.type === "mesh") {
        var zajvg = faoxommeshtriangles(zajvb);
        var zajvh = 0;
        for (var zajvi = 0; zajvi < zajvd.length && zajvh < 4096; zajvi++) {
            var zajvj = (new Box3).setFromPoints(zajvd[zajvi]);
            if (!zajvj.intersectsBox(zajve)) continue;
            for (var zajvk = 0; zajvk < zajvg.length && zajvh < 4096; zajvk++) {
                var zajvl = (new Box3).setFromPoints(zajvg[zajvk]);
                if (!zajvj.intersectsBox(zajvl)) continue;
                var zajvm = faoxomtrianglebody(zajvd[zajvi][0], zajvd[zajvi][1], zajvd[zajvi][2]);
                var zajvn = faoxomtrianglebody(zajvg[zajvk][0], zajvg[zajvk][1], zajvg[zajvk][2]);
                var zajvo = zajvc ? faoxomgjkcontact(zajvm, zajvn) : faoxomgjkcontact(zajvn, zajvm);
                if (zajvo && (!zajvf || zajvo.penetration > zajvf.penetration)) zajvf = zajvo;
                zajvh++;
            }
        }
        return zajvf;
    }
    var zajvp = Math.min(zajvd.length, 2048);
    for (var zajvq = 0; zajvq < zajvp; zajvq++) {
        var zajvr = zajvd[zajvq];
        var zajvs = (new Box3).setFromPoints(zajvr);
        if (!zajvs.intersectsBox(zajve)) continue;
        var zajvt = faoxomtrianglebody(zajvr[0], zajvr[1], zajvr[2]);
        var zajvu = null;
        if (zajvb.shape.type === "sphere") {
            var zajvv = faoxomclosestpointtriangle(zajvb.position, zajvr[0], zajvr[1], zajvr[2]);
            var zajvw = zajvb.position.distanceTo(zajvv);
            if (zajvw < zajvb.shape.radius) {
                var zajvx = zajvw > 1e-8 ? zajvb.position.clone().sub(zajvv).multiplyScalar(1 / zajvw) : (new Vector3).crossVectors((new Vector3).subVectors(zajvr[1], zajvr[0]), (new Vector3).subVectors(zajvr[2], zajvr[0])).normalize();
                zajvu = {
                    normal: zajvc ? zajvx : zajvx.clone().negate(),
                    penetration: zajvb.shape.radius - zajvw,
                    point: zajvv.clone().addScaledVector(zajvx, zajvb.shape.radius * .5)
                };
            }
        } else zajvu = zajvc ? faoxomgjkcontact(zajvt, zajvb) : faoxomgjkcontact(zajvb, zajvt);
        if (zajvu && (!zajvf || zajvu.penetration > zajvf.penetration)) zajvf = zajvu;
    }
    return zajvf;
}

export { faoxommeshcontact };
