import { Vector3 } from "../math/index.js";
import { Mesh } from "../objects/index.js";

class STLExporter {
    parse(scene, options) {
        options = options || {};
        var binary = !!options.binary;
        var triangles = [];
        scene.traverse(function(child) {
            if (child instanceof Mesh && child.geometry && child.geometry.attributes.position) {
                var pos = child.geometry.attributes.position.array;
                var idx = child.geometry.index;
                child.updateMatrixWorld(true);
                var mat = child.matrixWorld;
                var getV = function(i) {
                    var v = new Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
                    return v.applyMatrix4(mat);
                };
                if (idx) {
                    for (var f = 0; f < idx.length; f += 3) triangles.push([getV(idx[f]), getV(idx[f + 1]), getV(idx[f + 2])]);
                } else {
                    for (var f2 = 0; f2 < pos.length / 3; f2 += 3) triangles.push([getV(f2), getV(f2 + 1), getV(f2 + 2)]);
                }
            }
        });
        if (binary) {
            var buffer = new ArrayBuffer(84 + triangles.length * 50);
            var view = new DataView(buffer);
            view.setUint32(80, triangles.length, true);
            var offset = 84;
            for (var t = 0; t < triangles.length; t++) {
                var tri = triangles[t];
                var vA = tri[0], vB = tri[1], vC = tri[2];
                var cb = new Vector3().subVectors(vC, vB), ab = new Vector3().subVectors(vA, vB);
                var norm = cb.cross(ab).normalize();
                view.setFloat32(offset, norm.x, true); view.setFloat32(offset + 4, norm.y, true); view.setFloat32(offset + 8, norm.z, true);
                offset += 12;
                for (var v = 0; v < 3; v++) {
                    var vert = tri[v];
                    view.setFloat32(offset, vert.x, true); view.setFloat32(offset + 4, vert.y, true); view.setFloat32(offset + 8, vert.z, true);
                    offset += 12;
                }
                offset += 2;
            }
            return buffer;
        } else {
            var output = "solid FaoxomJS\n";
            for (var a = 0; a < triangles.length; a++) {
                var triA = triangles[a];
                output += "facet normal 0 0 0\n  outer loop\n";
                for (var b = 0; b < 3; b++) output += "    vertex " + triA[b].x.toFixed(4) + " " + triA[b].y.toFixed(4) + " " + triA[b].z.toFixed(4) + "\n";
                output += "  endloop\nendfacet\n";
            }
            output += "endsolid FaoxomJS\n";
            return output;
        }
    }
}

export { STLExporter };
