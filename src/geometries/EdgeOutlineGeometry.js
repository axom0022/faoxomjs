import { Geometry } from "./Geometry.js";

class EdgeOutlineGeometry extends Geometry {
    constructor(geometry, thresholdAngle) {
        super();
        this.type = "EdgeOutlineGeometry";
        thresholdAngle = thresholdAngle === undefined ? 1 : thresholdAngle;
        var thresholdDot = Math.cos(thresholdAngle * Math.PI / 180);
        var position = geometry && geometry.attributes ? geometry.attributes.position : null;
        if (!position) { this.setAttribute("position", new Float32Array(0), 3); return; }
        var itemSize = position.itemSize || 3;
        var vertices = [];
        var weldMap = typeof Map !== "undefined" ? new Map() : null;
        var welded = [];
        for (var i = 0; i < position.array.length / itemSize; i++) {
            var key = Math.round(position.array[i * itemSize] * 10000) + "," + Math.round(position.array[i * itemSize + 1] * 10000) + "," + Math.round(position.array[i * itemSize + 2] * 10000);
            var mapped = weldMap ? weldMap.get(key) : undefined;
            if (mapped === undefined) { mapped = vertices.length; vertices.push([position.array[i * itemSize], position.array[i * itemSize + 1], position.array[i * itemSize + 2]]); if (weldMap) weldMap.set(key, mapped); }
            welded[i] = mapped;
        }
        var index = geometry.index;
        var triangleCount = index ? index.length / 3 : welded.length / 3;
        var edgeMap = typeof Map !== "undefined" ? new Map() : {};
        var edges = [];
        var processEdge = function(a, b, normal) {
            var ka = a < b ? a + "_" + b : b + "_" + a;
            var existing = typeof Map !== "undefined" ? edgeMap.get(ka) : edgeMap[ka];
            if (existing === undefined) {
                var entry = { a: a, b: b, normal: normal, count: 1, sharp: false };
                edges.push(entry);
                if (typeof Map !== "undefined") edgeMap.set(ka, entry); else edgeMap[ka] = entry;
            } else {
                existing.count++;
                if (existing.normal.x * normal.x + existing.normal.y * normal.y + existing.normal.z * normal.z < thresholdDot) existing.sharp = true;
            }
        };
        for (var t = 0; t < triangleCount; t++) {
            var ia = index ? welded[index[t * 3]] : welded[t * 3];
            var ib = index ? welded[index[t * 3 + 1]] : welded[t * 3 + 1];
            var ic = index ? welded[index[t * 3 + 2]] : welded[t * 3 + 2];
            if (ia === undefined || ib === undefined || ic === undefined) continue;
            var pa = vertices[ia], pb = vertices[ib], pc = vertices[ic];
            var ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2];
            var vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
            var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
            var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nl === 0) continue;
            var normal = { x: nx / nl, y: ny / nl, z: nz / nl };
            processEdge(ia, ib, normal);
            processEdge(ib, ic, normal);
            processEdge(ic, ia, normal);
        }
        var outline = [];
        for (var e = 0; e < edges.length; e++) {
            var edge = edges[e];
            if (edge.count > 1 && !edge.sharp) continue;
            outline.push(vertices[edge.a][0], vertices[edge.a][1], vertices[edge.a][2], vertices[edge.b][0], vertices[edge.b][1], vertices[edge.b][2]);
        }
        this.setAttribute("position", new Float32Array(outline), 3);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { EdgeOutlineGeometry };
