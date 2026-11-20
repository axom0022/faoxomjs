import { Quaternion, Vector3 } from "../math/index.js";

import { faoxominverserotatevector } from "./faoxominverserotatevector.js";

import { faoxomshapevertices } from "./faoxomshapevertices.js";

import { faoxomworldpoint } from "./faoxomworldpoint.js";

function faoxomsupport(zafza, zafzb, zafzc, zafzd) {
    var zafze = faoxominverserotatevector(zafzd, zafzc);
    var zafzf;
    if (zafza.type === "sphere") zafzf = zafze.normalize().multiplyScalar(zafza.radius); else if (zafza.type === "capsule") {
        var zafzg = zafze.y < 0 ? -zafza.height * .5 : zafza.height * .5;
        zafzf = zafze.normalize().multiplyScalar(zafza.radius);
        zafzf.y += zafzg;
    } else if (zafza.type === "cylinder") {
        var zafzh = new Vector3(zafze.x, 0, zafze.z);
        if (zafzh.lengthSq() > 0) zafzh.normalize().multiplyScalar(zafza.radius);
        zafzf = zafzh;
        zafzf.y = zafze.y < 0 ? -zafza.height * .5 : zafza.height * .5;
    } else if (zafza.type === "compound") {
        var zafzi = null;
        var zafzj = -Infinity;
        for (var zafzk = 0; zafzk < zafza.children.length; zafzk++) {
            var zafzl = zafza.children[zafzk];
            var zafzm = (zafzc || new Quaternion).clone().multiply(zafzl.quaternion || new Quaternion);
            var zafzn = faoxomworldpoint(zafzb, zafzc, zafzl.position || new Vector3);
            var zafzo = faoxomsupport(zafzl.shape, zafzn, zafzm, zafzd);
            var zafzp = zafzo.dot(zafzd);
            if (zafzp > zafzj) {
                zafzj = zafzp;
                zafzi = zafzo;
            }
        }
        return zafzi || zafzb.clone();
    } else {
        var zafzq = faoxomshapevertices(zafza);
        zafzf = zafzq[0].clone();
        var zafzr = zafzf.dot(zafze);
        for (var zafzs = 1; zafzs < zafzq.length; zafzs++) {
            var zafzp = zafzq[zafzs].dot(zafze);
            if (zafzp > zafzr) {
                zafzr = zafzp;
                zafzf = zafzq[zafzs].clone();
            }
        }
    }
    return faoxomworldpoint(zafzb, zafzc, zafzf);
}

export { faoxomsupport };
