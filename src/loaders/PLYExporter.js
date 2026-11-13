import { Mesh } from "../objects/index.js";

class PLYExporter {
    parse(scene, options) {
        var positions = [], indices = [];
        var offset = 0;
        scene.traverse(function(child) {
            if (child instanceof Mesh && child.geometry && child.geometry.attributes.position) {
                var pos = child.geometry.attributes.position.array;
                var idx = child.geometry.index;
                for (var i = 0; i < pos.length; i += 3) positions.push(pos[i], pos[i + 1], pos[i + 2]);
                if (idx) for (var f = 0; f < idx.length; f++) indices.push(idx[f] + offset);
                offset += pos.length / 3;
            }
        });
        var output = "ply\nformat ascii 1.0\n";
        output += "element vertex " + (positions.length / 3) + "\n";
        output += "property float x\nproperty float y\nproperty float z\n";
        output += "element face " + (indices.length / 3) + "\n";
        output += "property list uchar int vertex_indices\nend_header\n";
        for (var v = 0; v < positions.length; v += 3) output += positions[v].toFixed(4) + " " + positions[v + 1].toFixed(4) + " " + positions[v + 2].toFixed(4) + "\n";
        for (var t = 0; t < indices.length; t += 3) output += "3 " + indices[t] + " " + indices[t + 1] + " " + indices[t + 2] + "\n";
        return output;
    }
}

export { PLYExporter };
