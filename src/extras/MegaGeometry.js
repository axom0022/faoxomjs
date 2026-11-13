import { Geometry } from "../geometries/Geometry.js";
import { Color, Matrix4, Vector3 } from "../math/index.js";

class MegaGeometry {
    constructor() {
        this.entries = [];
        this.geometry = null;
        this.materials = [];
        this.stats = { objects: 0, triangles: 0, vertices: 0, materials: 0, drawCalls: 1, buildms: 0 };
    }
    add(geometry, matrix, options) {
        options = options || {};
        var entry = {
            geometry: geometry,
            matrix: matrix ? (matrix.elements ? Array.prototype.slice.call(matrix.elements) : new Matrix4().makeTranslation(matrix[0] || 0, matrix[1] || 0, matrix[2] || 0).elements) : null,
            color: options.color !== undefined ? (options.color instanceof Color ? options.color : new Color(options.color)) : new Color(0xffffff),
            materialIndex: options.materialIndex !== undefined ? options.materialIndex : this.addMaterial(options),
            name: options.name || ""
        };
        this.entries.push(entry);
        return this.entries.length - 1;
    }
    addMaterial(material) {
        this.materials.push({
            color: material && material.color !== undefined ? (material.color instanceof Color ? material.color : new Color(material.color)) : new Color(0xffffff),
            roughness: material && material.roughness !== undefined ? material.roughness : 0.5,
            metalness: material && material.metalness !== undefined ? material.metalness : 0,
            emissive: material && material.emissive !== undefined ? (material.emissive instanceof Color ? material.emissive : new Color(material.emissive)) : new Color(0),
            opacity: material && material.opacity !== undefined ? material.opacity : 1
        });
        return this.materials.length - 1;
    }    uploadMaterials(renderer) {
        var records = [];
        for (var i = 0; i < this.materials.length; i++) records.push(this.materials[i]);
        if (!records.length) records.push({ color: 0xffffff, roughness: 1, metalness: 0 });
        renderer.setMegaMaterials(records);
        this.stats.materials = records.length;
        return this;
    }

    build() {
        var t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
        var positions = [], normals = [], uvs = [], colors = [], objectIds = [], materialIndices = [];
        var triOwners = [];
        var totalTris = 0;
        var v = new Vector3();
        for (var i = 0; i < this.entries.length; i++) {
            var entry = this.entries[i];
            var geometry = entry.geometry;
            if (!geometry || !geometry.attributes || !geometry.attributes.position) continue;
            var pos = geometry.attributes.position.array;
            var nrm = geometry.attributes.normal ? geometry.attributes.normal.array : null;
            var uv = geometry.attributes.uv ? geometry.attributes.uv.array : null;
            var idxraw = geometry.index;
            var idx = idxraw ? (idxraw.array ? idxraw.array : idxraw) : null;
            var triCount = idx ? idx.length / 3 : pos.length / 9;
            var m = entry.matrix;
            var inv = null;
            if (m && nrm) inv = new Matrix4().fromArray(m).invert().transpose().elements;
            for (var t = 0; t < triCount; t++) {
                for (var vv = 0; vv < 3; vv++) {
                    var vi = idx ? idx[t * 3 + vv] : t * 3 + vv;
                    var x = pos[vi * 3], y = pos[vi * 3 + 1], z = pos[vi * 3 + 2];
                    if (m) {
                        v.set(x, y, z).applyMatrix4({ elements: m });
                        x = v.x; y = v.y; z = v.z;
                    }
                    positions.push(x, y, z);
                    if (nrm) {
                        var nx = nrm[vi * 3], ny = nrm[vi * 3 + 1], nz = nrm[vi * 3 + 2];
                        if (inv) {
                            var tx = inv[0] * nx + inv[4] * ny + inv[8] * nz;
                            var ty = inv[1] * nx + inv[5] * ny + inv[9] * nz;
                            var tz = inv[2] * nx + inv[6] * ny + inv[10] * nz;
                            var tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
                            nx = tx / tl; ny = ty / tl; nz = tz / tl;
                        }
                        normals.push(nx, ny, nz);
                    } else {
                        normals.push(0, 1, 0);
                    }
                    if (uv) uvs.push(uv[vi * 2], uv[vi * 2 + 1]);
                    else uvs.push(0, 0);
                    colors.push(entry.color.r, entry.color.g, entry.color.b);
                    objectIds.push(i);
                    materialIndices.push(entry.materialIndex);
                }
                triOwners.push(i);
                totalTris++;
            }
        }
        var out = new Geometry();
        out.setAttribute("position", new Float32Array(positions), 3);
        out.setAttribute("normal", new Float32Array(normals), 3);
        out.setAttribute("uv", new Float32Array(uvs), 2);
        out.setAttribute("color", new Float32Array(colors), 3);
        out.setAttribute("objectId", new Float32Array(objectIds), 1);
        out.setAttribute("materialIndex", new Float32Array(materialIndices), 1);
        out.computeBounds();
        this.triangleOwners = new Uint16Array(triOwners.length <= 65535 ? triOwners.length : 0);
        if (triOwners.length <= 65535) {
            for (var o = 0; o < triOwners.length; o++) this.triangleOwners[o] = triOwners[o];
        } else {
            this.triangleOwnersBig = new Float32Array(triOwners);
        }
        this.geometry = out;
        this.stats.objects = this.entries.length;
        this.stats.triangles = totalTris;
        this.stats.vertices = positions.length / 3;
        this.stats.materials = this.materials.length;
        this.stats.buildms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
        return this;
    }
    objectIdOfTriangle(triIndex) {
        if (this.triangleOwners && this.triangleOwners.length) return this.triangleOwners[triIndex];
        if (this.triangleOwnersBig) return this.triangleOwnersBig[triIndex];
        return -1;
    }
    materialIndexOfTriangle(triIndex) {
        return this.entries[this.objectIdOfTriangle(triIndex)] ? this.entries[this.objectIdOfTriangle(triIndex)].materialIndex : -1;
    }
    dispose() {
        this.entries = [];
        this.geometry = null;
        this.materials = [];
        this.triangleOwners = null;
        this.triangleOwnersBig = null;
        this.stats = { objects: 0, triangles: 0, vertices: 0, materials: 0, drawCalls: 1, buildms: 0 };
    }
}

export { MegaGeometry };
