import { faoxomepaface } from "./faoxomepaface.js";
import { faoxomsupport } from "./faoxomsupport.js";

function faoxomepacontact(a, b, simplex) {
    if (!simplex || simplex.length < 4) return null;
    var vertices = simplex.slice(-4);
    var faces = [];
    var addFace = function(x, y, z) { var face = faoxomepaface(vertices[x], vertices[y], vertices[z]); if (face) faces.push(face); };
    addFace(0, 1, 2); addFace(0, 3, 1); addFace(0, 2, 3); addFace(1, 3, 2);
    for (var iteration = 0; iteration < 48; iteration++) {
        if (!faces.length) return null;
        faces.sort(function(x, y) { return x.distance - y.distance; });
        var closest = faces[0];
        var supportA = faoxomsupport(a.shape, a.position, a.rotation, closest.normal);
        var supportB = faoxomsupport(b.shape, b.position, b.rotation, closest.normal.clone().negate());
        var support = supportA.clone().sub(supportB);
        var advance = support.dot(closest.normal) - closest.distance;
        if (advance < 0.0005) return { normal: closest.normal.clone(), penetration: Math.max(0.0005, support.dot(closest.normal)), point: supportA.clone().add(supportB).multiplyScalar(0.5) };
        var duplicate = false;
        for (var vi = 0; vi < vertices.length; vi++) if (vertices[vi].distanceToSquared(support) < 1e-10) duplicate = true;
        if (duplicate) return { normal: closest.normal.clone(), penetration: Math.max(0.0005, closest.distance), point: supportA.clone().add(supportB).multiplyScalar(0.5) };
        var newIndex = vertices.length;
        vertices.push(support);
        var visible = [];
        for (var fi = 0; fi < faces.length; fi++) if (faces[fi].normal.dot(support.clone().sub(faces[fi].a)) > 1e-7) visible.push(fi);
        var edges = [];
        var addEdge = function(x, y) { for (var ei = edges.length - 1; ei >= 0; ei--) if (edges[ei][0] === y && edges[ei][1] === x) { edges.splice(ei, 1); return; } edges.push([x, y]); };
        for (var vi2 = visible.length - 1; vi2 >= 0; vi2--) { var oldFace = faces[visible[vi2]]; addEdge(vertices.indexOf(oldFace.a), vertices.indexOf(oldFace.b)); addEdge(vertices.indexOf(oldFace.b), vertices.indexOf(oldFace.c)); addEdge(vertices.indexOf(oldFace.c), vertices.indexOf(oldFace.a)); faces.splice(visible[vi2], 1); }
        for (var ei2 = 0; ei2 < edges.length; ei2++) { var edge = edges[ei2]; var faceNew = faoxomepaface(vertices[edge[0]], vertices[edge[1]], vertices[newIndex]); if (faceNew) faces.push(faceNew); }
    }
    return null;
}

export { faoxomepacontact };
