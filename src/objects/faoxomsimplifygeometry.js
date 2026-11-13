import { Geometry } from "../geometries/index.js";
import { faoxomclamp, faoxomvalue } from "../math/index.js";

function faoxomsimplifygeometry(geometry, options) {
    options = options || {};
    var position = geometry && geometry.attributes ? geometry.attributes.position : null;
    if (!position) return geometry;
    var ratio = faoxomclamp(faoxomvalue(options.targetRatio, 0.5), 0.01, 1);
    var positions = position.array;
    var vertexCount = Math.floor(positions.length / position.itemSize);
    var sourceIndex = geometry.index ? geometry.index : null;
    var triangles = sourceIndex ? Math.floor(sourceIndex.length / 3) : Math.floor(vertexCount / 3);
    var targetTriangles = Math.max(1, Math.floor(triangles * ratio));
    if (targetTriangles >= triangles) return geometry.clone();
    var box = geometry.boundingBox || geometry.computeBoundingBox().boundingBox;
    var min = box.min, max = box.max;
    var extentX = Math.max(1e-9, max.x - min.x), extentY = Math.max(1e-9, max.y - min.y), extentZ = Math.max(1e-9, max.z - min.z);
    var resolution = Math.max(1, Math.floor(Math.pow(targetTriangles, 1 / 3) * 0.8));
    var groups = {}, assignment = new Array(vertexCount), sums = {};
    for (var i = 0; i < vertexCount; i++) {
        var x = positions[i * position.itemSize], y = positions[i * position.itemSize + 1], z = positions[i * position.itemSize + 2];
        var key = Math.min(resolution - 1, Math.floor((x - min.x) / extentX * resolution)) + ":" + Math.min(resolution - 1, Math.floor((y - min.y) / extentY * resolution)) + ":" + Math.min(resolution - 1, Math.floor((z - min.z) / extentZ * resolution));
        if (!groups[key]) { groups[key] = Object.keys(groups).length; sums[key] = { count: 0, values: {} }; }
        assignment[i] = groups[key];
        var sum = sums[key]; sum.count++;
        for (var attributeName in geometry.attributes) { var attribute = geometry.attributes[attributeName]; if (!attribute || !attribute.array) continue; var size = attribute.itemSize || 1; if (!sum.values[attributeName]) sum.values[attributeName] = new Array(size).fill(0); for (var component = 0; component < size; component++) sum.values[attributeName][component] += attribute.array[i * size + component] || 0; }
    }
    var groupCount = Object.keys(groups).length;
    var out = new Geometry();
    for (var name in geometry.attributes) {
        var source = geometry.attributes[name]; var size = source.itemSize || 1; var Type = source.array.constructor; var values = new Type(groupCount * size);
        for (var groupName in groups) { var groupIndex = groups[groupName]; var valuesForName = sums[groupName].values[name] || []; for (var componentIndex = 0; componentIndex < size; componentIndex++) values[groupIndex * size + componentIndex] = valuesForName[componentIndex] === undefined ? 0 : valuesForName[componentIndex] / (source.array instanceof Float32Array || source.array instanceof Float64Array ? sums[groupName].count : 1); }
        out.setAttribute(name, { array: values, itemSize: size, normalized: !!source.normalized });
    }
    var resultIndex = [], seen = {};
    for (var t = 0; t < triangles; t++) { var ia = sourceIndex ? sourceIndex[t * 3] : t * 3; var ib = sourceIndex ? sourceIndex[t * 3 + 1] : t * 3 + 1; var ic = sourceIndex ? sourceIndex[t * 3 + 2] : t * 3 + 2; var a = assignment[ia], b = assignment[ib], c = assignment[ic]; if (a === b || b === c || a === c) continue; var face = a + ":" + b + ":" + c; if (seen[face]) continue; seen[face] = true; resultIndex.push(a, b, c); }
    out.setIndex(groupCount > 65535 ? new Uint32Array(resultIndex) : new Uint16Array(resultIndex));
    if (out.attributes.normal) out.computeVertexNormals(); else if (position) out.computeVertexNormals();
    out.computeBounds();
    return out;
}
Geometry.prototype.simplify = function(options) { return faoxomsimplifygeometry(this, options); };

export { faoxomsimplifygeometry };
