import { Geometry } from "../geometries/Geometry.js";

class MeshletSet {
    constructor(geometry, options) {
        options = options || {};
        this.maxVertices = Math.max(3, options.maxVertices || 96);
        this.maxTriangles = Math.max(1, options.maxTriangles || 192);
        this.source = geometry;
        this.meshlets = [];
        this.geometry = null;
        this.stats = { meshlets: 0, triangles: 0, vertices: 0, maxMeshletTriangles: 0, avgMeshletTriangles: 0, avgMeshletVertices: 0, buildms: 0, coneCullable: 0 };
        this.build();
    }
    build() {
        var t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        var geometry = this.source;
        if (!geometry || !geometry.attributes || !geometry.attributes.position) return;
        var pos = geometry.attributes.position.array;
        var idxraw = geometry.index;
        var idx = idxraw ? (idxraw.array ? idxraw.array : idxraw) : null;
        var triCount = idx ? idx.length / 3 : pos.length / 9;
        triCount = Math.floor(triCount);
        if (triCount === 0) return;
        if (!idx) {
            idx = new Uint32Array(triCount * 3);
            for (var g = 0; g < triCount * 3; g++) idx[g] = g;
        }
        var vertCount = pos.length / 3;
        var normals = new Float32Array(triCount * 3);
        var centroids = new Float32Array(triCount * 3);
        for (var t = 0; t < triCount; t++) {
            var i0 = idx[t * 3], i1 = idx[t * 3 + 1], i2 = idx[t * 3 + 2];
            var ax = pos[i1 * 3] - pos[i0 * 3], ay = pos[i1 * 3 + 1] - pos[i0 * 3 + 1], az = pos[i1 * 3 + 2] - pos[i0 * 3 + 2];
            var bx = pos[i2 * 3] - pos[i0 * 3], by = pos[i2 * 3 + 1] - pos[i0 * 3 + 1], bz = pos[i2 * 3 + 2] - pos[i0 * 3 + 2];
            var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
            var nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nl > 1e-12) { nx /= nl; ny /= nl; nz /= nl; } else { nx = 0; ny = 1; nz = 0; }
            normals[t * 3] = nx; normals[t * 3 + 1] = ny; normals[t * 3 + 2] = nz;
            centroids[t * 3] = (pos[i0 * 3] + pos[i1 * 3] + pos[i2 * 3]) / 3;
            centroids[t * 3 + 1] = (pos[i0 * 3 + 1] + pos[i1 * 3 + 1] + pos[i2 * 3 + 1]) / 3;
            centroids[t * 3 + 2] = (pos[i0 * 3 + 2] + pos[i1 * 3 + 2] + pos[i2 * 3 + 2]) / 3;
        }
        var vertTris = new Array(vertCount);
        for (var v = 0; v < vertCount; v++) vertTris[v] = [];
        for (var t2 = 0; t2 < triCount; t2++) {
            vertTris[idx[t2 * 3]].push(t2);
            vertTris[idx[t2 * 3 + 1]].push(t2);
            vertTris[idx[t2 * 3 + 2]].push(t2);
        }
        var visited = new Uint8Array(triCount);
        var reordered = new Uint32Array(triCount * 3);
        var cursor = 0;
        for (var seed = 0; seed < triCount; seed++) {
            if (visited[seed]) continue;
            var memberTris = [seed];
            visited[seed] = 1;
            var memberVerts = {};
            var newVertCount = 0;
            var seedVerts = [idx[seed * 3], idx[seed * 3 + 1], idx[seed * 3 + 2]];
            for (var sv = 0; sv < 3; sv++) {
                if (!memberVerts[seedVerts[sv]]) { memberVerts[seedVerts[sv]] = 1; newVertCount++; }
            }
            while (memberTris.length < this.maxTriangles) {
                var bestTri = -1, bestNewVerts = 1e9;
                var scanned = 0;
                for (var mt = 0; mt < memberTris.length && scanned < 256; mt++) {
                    var tri = memberTris[mt];
                    for (var e = 0; e < 3; e++) {
                        var verts = vertTris[idx[tri * 3 + e]];
                        for (var cv = 0; cv < verts.length; cv++) {
                            var cand = verts[cv];
                            if (visited[cand]) continue;
                            scanned++;
                            if (scanned > 256) break;
                            var cVerts = [idx[cand * 3], idx[cand * 3 + 1], idx[cand * 3 + 2]];
                            var add = 0;
                            for (var w = 0; w < 3; w++) if (!memberVerts[cVerts[w]]) add++;
                            if (newVertCount + add <= this.maxVertices && add < bestNewVerts) {
                                bestNewVerts = add;
                                bestTri = cand;
                                if (add === 0) break;
                            }
                        }
                        if (scanned > 256) break;
                    }
                    if (bestNewVerts === 0) break;
                }
                if (bestTri < 0) break;
                memberTris.push(bestTri);
                visited[bestTri] = 1;
                var bVerts = [idx[bestTri * 3], idx[bestTri * 3 + 1], idx[bestTri * 3 + 2]];
                for (var b2 = 0; b2 < 3; b2++) {
                    if (!memberVerts[bVerts[b2]]) { memberVerts[bVerts[b2]] = 1; newVertCount++; }
                }
            }
            var first = cursor / 3;
            for (var m = 0; m < memberTris.length; m++) {
                reordered[cursor++] = idx[memberTris[m] * 3];
                reordered[cursor++] = idx[memberTris[m] * 3 + 1];
                reordered[cursor++] = idx[memberTris[m] * 3 + 2];
            }
            var minx = 1e30, miny = 1e30, minz = 1e30, maxx = -1e30, maxy = -1e30, maxz = -1e30;
            var sx = 0, sy = 0, sz = 0, sn = 0;
            for (var key in memberVerts) {
                var vi = key | 0;
                var px = pos[vi * 3], py = pos[vi * 3 + 1], pz = pos[vi * 3 + 2];
                if (px < minx) minx = px;
                if (py < miny) miny = py;
                if (pz < minz) minz = pz;
                if (px > maxx) maxx = px;
                if (py > maxy) maxy = py;
                if (pz > maxz) maxz = pz;
                sx += px; sy += py; sz += pz; sn++;
            }
            var cx = sx / sn, cy = sy / sn, cz = sz / sn;
            var radius = 0;
            for (var key2 in memberVerts) {
                var vi2 = key2 | 0;
                var dx = pos[vi2 * 3] - cx, dy = pos[vi2 * 3 + 1] - cy, dz = pos[vi2 * 3 + 2] - cz;
                var dl = dx * dx + dy * dy + dz * dz;
                if (dl > radius) radius = dl;
            }
            radius = Math.sqrt(radius);
            var axv = 0, ayv = 0, azv = 0;
            for (var m2 = 0; m2 < memberTris.length; m2++) {
                axv += normals[memberTris[m2] * 3];
                ayv += normals[memberTris[m2] * 3 + 1];
                azv += normals[memberTris[m2] * 3 + 2];
            }
            var al = Math.sqrt(axv * axv + ayv * ayv + azv * azv);
            var cullable = 0;
            var axis = [0, 1, 0];
            var cosThetaMax = -1;
            if (al > 1e-6) {
                axis = [axv / al, ayv / al, azv / al];
                var ctm = 1;
                for (var m3 = 0; m3 < memberTris.length; m3++) {
                    var d = normals[memberTris[m3] * 3] * axis[0] + normals[memberTris[m3] * 3 + 1] * axis[1] + normals[memberTris[m3] * 3 + 2] * axis[2];
                    if (d < ctm) ctm = d;
                }
                cosThetaMax = ctm;
                if (ctm > -0.98) cullable = 1;
            }
            this.meshlets.push({ first: first, count: memberTris.length * 3, center: [cx, cy, cz], radius: radius, axis: axis, cosThetaMax: cosThetaMax, cullable: cullable, min: [minx, miny, minz], max: [maxx, maxy, maxz], triangles: memberTris.length, vertices: newVertCount });
        }
        var out = new Geometry();
        out.setAttribute("position", geometry.attributes.position);
        if (geometry.attributes.normal) out.setAttribute("normal", geometry.attributes.normal);
        if (geometry.attributes.uv) out.setAttribute("uv", geometry.attributes.uv);
        out.setIndex(reordered);
        out.computeBounds();
        this.geometry = out;
        this.stats.meshlets = this.meshlets.length;
        this.stats.triangles = triCount;
        this.stats.vertices = vertCount;
        var maxT = 0, sumT = 0, sumV = 0;
        for (var ml = 0; ml < this.meshlets.length; ml++) {
            if (this.meshlets[ml].triangles > maxT) maxT = this.meshlets[ml].triangles;
            sumT += this.meshlets[ml].triangles;
            sumV += this.meshlets[ml].vertices;
            if (this.meshlets[ml].cullable) this.stats.coneCullable++;
        }
        this.stats.maxMeshletTriangles = maxT;
        this.stats.avgMeshletTriangles = sumT / Math.max(1, this.meshlets.length);
        this.stats.avgMeshletVertices = sumV / Math.max(1, this.meshlets.length);
        this.stats.buildms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
        return this;
    }
    cull(viewPos) {
        var n = this.meshlets.length;
        var out = new Uint8Array(n);
        var pos = this.source.attributes.position.array;
        var idxraw = this.source.index;
        var idx = idxraw ? (idxraw.array ? idxraw.array : idxraw) : null;
        if (!idx) {
            idx = new Uint32Array(this.stats.triangles * 3);
            for (var g = 0; g < idx.length; g++) idx[g] = g;
        }
        for (var i = 0; i < n; i++) {
            var m = this.meshlets[i];
            out[i] = 1;
            if (!m.cullable) continue;
            var ux = viewPos[0] - m.center[0], uy = viewPos[1] - m.center[1], uz = viewPos[2] - m.center[2];
            var r = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
            ux /= r; uy /= r; uz /= r;
            var cosb = ux * m.axis[0] + uy * m.axis[1] + uz * m.axis[2];
            var sinb = Math.sqrt(Math.max(0, 1 - cosb * cosb));
            var sintheta = Math.sqrt(Math.max(0, 1 - m.cosThetaMax * m.cosThetaMax));
            var bbound = cosb * m.cosThetaMax + sinb * sintheta;
            if (cosb < m.cosThetaMax && bbound < -1e-6 && r * (-bbound) >= m.radius) out[i] = 0;
        }
        return out;
    }
    cullView(planes, viewPos) {
        var cone = this.cull(viewPos);
        for (var i = 0; i < this.meshlets.length; i++) {
            if (!cone[i]) continue;
            var m = this.meshlets[i];
            for (var p = 0; p < 6; p++) {
                var dist = planes[p * 4] * m.center[0] + planes[p * 4 + 1] * m.center[1] + planes[p * 4 + 2] * m.center[2] + planes[p * 4 + 3];
                if (dist < -m.radius) { cone[i] = 0; break; }
            }
        }
        return cone;
    }
    mergeIndices(visibility) {
        var total = 0;
        for (var i = 0; i < this.meshlets.length; i++) {
            if (!visibility || visibility[i]) total += this.meshlets[i].count;
        }
        var out = new Uint32Array(total);
        var cursor = 0;
        var idx = this.geometry.index;
        for (var j = 0; j < this.meshlets.length; j++) {
            if (!visibility || visibility[j]) {
                var m = this.meshlets[j];
                for (var k = 0; k < m.count; k++) out[cursor++] = idx[m.first * 3 + k];
            }
        }
        return out;
    }
    meshletGeometry(visibility) {
        var out = new Geometry();
        out.setAttribute("position", this.source.attributes.position);
        if (this.source.attributes.normal) out.setAttribute("normal", this.source.attributes.normal);
        if (this.source.attributes.uv) out.setAttribute("uv", this.source.attributes.uv);
        out.setIndex(this.mergeIndices(visibility));
        out.computeBounds();
        return out;
    }
}

export { MeshletSet };
