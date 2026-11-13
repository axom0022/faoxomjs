import { Vector3 } from "../math/index.js";

function faoxomepaface(a, b, c) {
    var ab = new Vector3().subVectors(b, a);
    var ac = new Vector3().subVectors(c, a);
    var normal = new Vector3().crossVectors(ab, ac);
    if (normal.lengthSq() < 1e-14) return null;
    normal.normalize();
    var distance = normal.dot(a);
    if (distance < 0) { var swap = b; b = c; c = swap; normal.negate(); distance = -distance; }
    return { a: a, b: b, c: c, normal: normal, distance: distance };
}

export { faoxomepaface };
