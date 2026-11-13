import { BufferAttribute } from "../core/index.js";
import { Vector3 } from "../math/index.js";
import { Geometry } from "./Geometry.js";

class ParametricGeometry extends Geometry {
    constructor(func, slices, stacks) {
        super();
        this.type = "ParametricGeometry";
        var numSlices = Math.max(1, slices || 16), numStacks = Math.max(1, stacks || 16);
        var positions = [], normals = [], uvs = [], indices = [];
        var target = new Vector3();
        var f = func || function(u, v, t) { t.set((u - 0.5) * 2, 0, (v - 0.5) * 2); };

        for (var i = 0; i <= numStacks; i++) {
            var v = i / numStacks;
            for (var j = 0; j <= numSlices; j++) {
                var u = j / numSlices;
                f(u, v, target);
                positions.push(target.x, target.y, target.z);
                normals.push(0, 1, 0);
                uvs.push(u, v);
            }
        }
        for (var si = 0; si < numStacks; si++) {
            for (var sj = 0; sj < numSlices; sj++) {
                var a = si * (numSlices + 1) + sj;
                var b = (si + 1) * (numSlices + 1) + sj;
                var c = (si + 1) * (numSlices + 1) + (sj + 1);
                var d = si * (numSlices + 1) + (sj + 1);
                indices.push(a, b, d, b, c, d);
            }
        }
        this.attributes.position = new BufferAttribute(new Float32Array(positions), 3);
        this.attributes.normal = new BufferAttribute(new Float32Array(normals), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(uvs), 2);
        this.index = new Uint32Array(indices);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { ParametricGeometry };
