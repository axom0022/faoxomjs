import { Mesh } from "../objects/index.js";

class OBJExporter {
    parse(object) {
        var output = "# FaoxomJS OBJExporter\n";
        var indexOffset = 0;
        object.traverse(function(child) {
            if (child instanceof Mesh && child.geometry && child.geometry.attributes.position) {
                var pos = child.geometry.attributes.position.array;
                var norm = child.geometry.attributes.normal ? child.geometry.attributes.normal.array : null;
                var uv = child.geometry.attributes.uv ? child.geometry.attributes.uv.array : null;
                var idx = child.geometry.index;
                output += "o " + (child.name || "Mesh_" + child.id) + "\n";
                for (var i = 0; i < pos.length; i += 3) output += "v " + pos[i].toFixed(4) + " " + pos[i + 1].toFixed(4) + " " + pos[i + 2].toFixed(4) + "\n";
                if (norm) for (var n = 0; n < norm.length; n += 3) output += "vn " + norm[n].toFixed(4) + " " + norm[n + 1].toFixed(4) + " " + norm[n + 2].toFixed(4) + "\n";
                if (uv) for (var u = 0; u < uv.length; u += 2) output += "vt " + uv[u].toFixed(4) + " " + uv[u + 1].toFixed(4) + "\n";
                if (idx) {
                    for (var f = 0; f < idx.length; f += 3) {
                        var a = idx[f] + 1 + indexOffset, b = idx[f + 1] + 1 + indexOffset, c = idx[f + 2] + 1 + indexOffset;
                        output += "f " + a + " " + b + " " + c + "\n";
                    }
                } else {
                    for (var f2 = 0; f2 < pos.length / 3; f2 += 3) {
                        var a2 = f2 + 1 + indexOffset, b2 = f2 + 2 + indexOffset, c2 = f2 + 3 + indexOffset;
                        output += "f " + a2 + " " + b2 + " " + c2 + "\n";
                    }
                }
                indexOffset += pos.length / 3;
            }
        });
        return output;
    }
}

export { OBJExporter };
