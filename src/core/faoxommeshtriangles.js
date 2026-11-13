import { faoxomworldpoint } from "./faoxomworldpoint.js";

function faoxommeshtriangles(body) {
    var vertices = body.shape.vertices || [];
    var indices = body.shape.indices;
    var triangles = [];
    var count = indices && indices.length ? indices.length : vertices.length;
    for (var i = 0; i + 2 < count; i += 3) {
        var ia = indices ? indices[i] : i;
        var ib = indices ? indices[i + 1] : i + 1;
        var ic = indices ? indices[i + 2] : i + 2;
        if (!vertices[ia] || !vertices[ib] || !vertices[ic]) continue;
        triangles.push([faoxomworldpoint(body.position, body.rotation, vertices[ia]), faoxomworldpoint(body.position, body.rotation, vertices[ib]), faoxomworldpoint(body.position, body.rotation, vertices[ic])]);
    }
    return triangles;
}

export { faoxommeshtriangles };
