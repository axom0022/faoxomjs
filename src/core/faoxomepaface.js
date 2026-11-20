import { Vector3 } from "../math/index.js";

function faoxomepaface(zaeca, zaecb, zaecc) {
    var zaecd = (new Vector3).subVectors(zaecb, zaeca);
    var zaece = (new Vector3).subVectors(zaecc, zaeca);
    var zaecf = (new Vector3).crossVectors(zaecd, zaece);
    if (zaecf.lengthSq() < 1e-14) return null;
    zaecf.normalize();
    var zaecg = zaecf.dot(zaeca);
    if (zaecg < 0) {
        var zaech = zaecb;
        zaecb = zaecc;
        zaecc = zaech;
        zaecf.negate();
        zaecg = -zaecg;
    }
    return {
        a: zaeca,
        b: zaecb,
        c: zaecc,
        normal: zaecf,
        distance: zaecg
    };
}

export { faoxomepaface };
