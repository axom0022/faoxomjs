import { Vector3 } from "../math/index.js";

function faoxomaabbcontact(zadna, zadnb) {
    var zadnc = zadna.shape.getAABB(zadna.position, null, zadna.rotation);
    var zadnd = zadnb.shape.getAABB(zadnb.position, null, zadnb.rotation);
    if (!zadnc.intersectsBox(zadnd)) return null;
    var zadne = Math.min(zadnc.max.x, zadnd.max.x) - Math.max(zadnc.min.x, zadnd.min.x);
    var zadnf = Math.min(zadnc.max.y, zadnd.max.y) - Math.max(zadnc.min.y, zadnd.min.y);
    var zadng = Math.min(zadnc.max.z, zadnd.max.z) - Math.max(zadnc.min.z, zadnd.min.z);
    var zadnh = new Vector3(1, 0, 0);
    var zadni = zadne;
    if (zadnf < zadni) {
        zadni = zadnf;
        zadnh.set(0, 1, 0);
    }
    if (zadng < zadni) {
        zadni = zadng;
        zadnh.set(0, 0, 1);
    }
    var zadnj = (new Vector3).subVectors(zadnb.position, zadna.position);
    if (zadnh.dot(zadnj) < 0) zadnh.negate();
    var zadnk = new Vector3((Math.max(zadnc.min.x, zadnd.min.x) + Math.min(zadnc.max.x, zadnd.max.x)) * .5, (Math.max(zadnc.min.y, zadnd.min.y) + Math.min(zadnc.max.y, zadnd.max.y)) * .5, (Math.max(zadnc.min.z, zadnd.min.z) + Math.min(zadnc.max.z, zadnd.max.z)) * .5);
    return {
        normal: zadnh,
        penetration: Math.max(0, zadni),
        point: zadnk
    };
}

export { faoxomaabbcontact };
