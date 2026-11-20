import { Vector3 } from "../math/index.js";

import { faoxomlocalpoint } from "./faoxomlocalpoint.js";

function faoxomheightfieldcontact(zafda, zafdb) {
    var zafdc = zafda.shape.type === "heightfield" ? zafda : zafdb.shape.type === "heightfield" ? zafdb : null;
    if (!zafdc) return null;
    var zafdd = zafdc === zafda ? zafdb : zafda;
    if (zafdd.isStatic) return null;
    var zafde = zafdc.shape;
    var zafdf = faoxomlocalpoint(zafdc.position, zafdc.rotation, zafdd.position);
    var zafdg = zafde.getHeight(zafdf.x, zafdf.z);
    if (zafdg === -Infinity) return null;
    var zafdh = zafdd.shape.getAABB(zafdd.position, null, zafdd.rotation);
    var zafdi = zafdg + zafdc.position.y;
    if (zafdh.min.y >= zafdi) return null;
    var zafdj = zafdc === zafda ? new Vector3(0, 1, 0) : new Vector3(0, -1, 0);
    return {
        normal: zafdj,
        penetration: zafdi - zafdh.min.y,
        point: new Vector3(zafdd.position.x, zafdi, zafdd.position.z)
    };
}

export { faoxomheightfieldcontact };
