import { faoxomaabbcontact, faoxomgjkcontact, faoxomheightfieldcontact, faoxomobbcontact, faoxomshapevertices, faoxomworldpoint } from "../core/index.js";
import { Vector3 } from "../math/index.js";
import { faoxommeshcontact } from "./faoxommeshcontact.js";

function faoxomplanecontact(plane, other) {
    var normal = (plane.shape.normal ? plane.shape.normal.clone() : new Vector3(0, 1, 0)).normalize();
    normal.applyQuaternion(plane.rotation);
    var anchor = plane.position.clone().addScaledVector(normal, plane.shape.constant || 0);
    var deepest = null;
    var depth = 0;
    if (other.shape.type === "sphere") {
        deepest = other.position.clone().addScaledVector(normal, -other.shape.radius);
        depth = other.shape.radius - other.position.clone().sub(anchor).dot(normal);
    } else {
        var verts = other.shape.vertices && other.shape.vertices.length ? other.shape.vertices : faoxomshapevertices(other.shape);
        var best = Infinity;
        for (var i = 0; i < verts.length; i++) {
            var world = faoxomworldpoint(other.position, other.rotation, verts[i]);
            var projection = world.clone().sub(anchor).dot(normal);
            if (projection < best) { best = projection; deepest = world; }
        }
        depth = -best;
    }
    if (!isFinite(depth) || depth <= 0) return null;
    return { normal: normal, penetration: depth, point: deepest };
}

function faoxomcollisioncontact(a, b) {
    var planeA = a.shape.type === "plane";
    var planeB = b.shape.type === "plane";
    if (planeA || planeB) {
        if (planeA && planeB) return null;
        if (planeA) return faoxomplanecontact(a, b);
        var flipped = faoxomplanecontact(b, a);
        if (flipped) { flipped.normal.negate(); return flipped; }
        return null;
    }
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
