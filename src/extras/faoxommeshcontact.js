import { faoxomclosestpointtriangle, faoxomgjkcontact, faoxommeshtriangles } from "../core/index.js";
import { Box3, Vector3 } from "../math/index.js";
import { faoxomtrianglebody } from "./faoxomtrianglebody.js";

function faoxommeshcontact(meshBody, otherBody, meshIsA) {
    var meshTriangles = faoxommeshtriangles(meshBody);
    if (!meshTriangles.length) return null;
    var otherBox = otherBody.shape.getAABB(otherBody.position, null, otherBody.rotation);
    var best = null;
    if (otherBody.shape.type === "mesh") {
        var otherTriangles = faoxommeshtriangles(otherBody); var pairCount = 0;
        for (var ma = 0; ma < meshTriangles.length && pairCount < 4096; ma++) { var firstBox = new Box3().setFromPoints(meshTriangles[ma]); if (!firstBox.intersectsBox(otherBox)) continue; for (var mb = 0; mb < otherTriangles.length && pairCount < 4096; mb++) { var secondBox = new Box3().setFromPoints(otherTriangles[mb]); if (!firstBox.intersectsBox(secondBox)) continue; var firstBody = faoxomtrianglebody(meshTriangles[ma][0], meshTriangles[ma][1], meshTriangles[ma][2]); var secondBody = faoxomtrianglebody(otherTriangles[mb][0], otherTriangles[mb][1], otherTriangles[mb][2]); var pairContact = meshIsA ? faoxomgjkcontact(firstBody, secondBody) : faoxomgjkcontact(secondBody, firstBody); if (pairContact && (!best || pairContact.penetration > best.penetration)) best = pairContact; pairCount++; } }
        return best;
    }
    var limit = Math.min(meshTriangles.length, 2048);
    for (var i = 0; i < limit; i++) {
        var triangle = meshTriangles[i];
        var triBox = new Box3().setFromPoints(triangle);
        if (!triBox.intersectsBox(otherBox)) continue;
        var triangleBody = faoxomtrianglebody(triangle[0], triangle[1], triangle[2]);
        var contact = null;
        if (otherBody.shape.type === "sphere") {
            var closest = faoxomclosestpointtriangle(otherBody.position, triangle[0], triangle[1], triangle[2]);
            var separation = otherBody.position.distanceTo(closest);
            if (separation < otherBody.shape.radius) { var sphereNormal = separation > 1e-8 ? otherBody.position.clone().sub(closest).multiplyScalar(1 / separation) : new Vector3().crossVectors(new Vector3().subVectors(triangle[1], triangle[0]), new Vector3().subVectors(triangle[2], triangle[0])).normalize(); contact = { normal: meshIsA ? sphereNormal : sphereNormal.clone().negate(), penetration: otherBody.shape.radius - separation, point: closest.clone().addScaledVector(sphereNormal, otherBody.shape.radius * 0.5) }; }
        } else contact = meshIsA ? faoxomgjkcontact(triangleBody, otherBody) : faoxomgjkcontact(otherBody, triangleBody);
        if (contact && (!best || contact.penetration > best.penetration)) best = contact;
    }
    return best;
}

export { faoxommeshcontact };
