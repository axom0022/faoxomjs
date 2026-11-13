import { faoxomaabbcontact, faoxomgjkcontact, faoxomheightfieldcontact, faoxomobbcontact } from "../core/index.js";
import { Vector3 } from "../math/index.js";
import { faoxommeshcontact } from "./faoxommeshcontact.js";

function faoxomcollisioncontact(a, b) {
    var heightContact = faoxomheightfieldcontact(a, b);
    if (heightContact) return heightContact;
    if (a.shape.type === "mesh") {
        var meshContactA = faoxommeshcontact(a, b, true);
        if (meshContactA) return meshContactA;
        if (b.shape.type === "mesh") return null;
    }
    if (b.shape.type === "mesh") {
        var meshContactB = faoxommeshcontact(b, a, false);
        if (meshContactB) return meshContactB;
    }
    if ((a.shape.type === "box" || a.shape.type === "obb") && (b.shape.type === "box" || b.shape.type === "obb")) return faoxomobbcontact(a, b);
    var convexA = a.shape.type === "convex" || a.shape.type === "compound";
    var convexB = b.shape.type === "convex" || b.shape.type === "compound";
    if (convexA || convexB) {
        var precise = faoxomgjkcontact(a, b);
        if (precise) return precise;
        return null;
    }
    if (a.shape.type === "sphere" && b.shape.type === "sphere") {
        var delta = new Vector3().subVectors(b.position, a.position);
        var distance = delta.length();
        var sum = a.shape.radius + b.shape.radius;
        if (distance >= sum) return null;
        var sphereNormal = distance > 1e-8 ? delta.multiplyScalar(1 / distance) : new Vector3(1, 0, 0);
        return { normal: sphereNormal, penetration: sum - distance, point: a.position.clone().addScaledVector(sphereNormal, a.shape.radius - (sum - distance) * 0.5) };
    }
    return faoxomaabbcontact(a, b);
}

export { faoxomcollisioncontact };
