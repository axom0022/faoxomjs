import { BufferAttribute } from "../core/index.js";
import { Vector2 } from "../math/index.js";
import { Geometry } from "./Geometry.js";

class LatheGeometry extends Geometry {
    constructor(points, segments, phiStart, phiLength) {
        super();
        this.type = "LatheGeometry";
        var pts = points || [new Vector2(0, -0.5), new Vector2(0.5, 0), new Vector2(0, 0.5)];
        var segs = Math.max(3, segments || 12);
        var start = phiStart || 0, length = phiLength || Math.PI * 2;
        var positions = [], normals = [], uvs = [], indices = [];

        for (var i = 0; i <= segs; i++) {
            var phi = start + (i / segs) * length;
            var sin = Math.sin(phi), cos = Math.cos(phi);
            for (var j = 0; j < pts.length; j++) {
                var pt = pts[j];
                positions.push(pt.x * sin, pt.y, pt.x * cos);
                uvs.push(i / segs, j / (pts.length - 1));
                normals.push(sin, 0, cos);
            }
        }
        var numPoints = pts.length;
        for (var si = 0; si < segs; si++) {
            for (var sj = 0; sj < numPoints - 1; sj++) {
                var a = si * numPoints + sj;
                var b = (si + 1) * numPoints + sj;
                var c = (si + 1) * numPoints + (sj + 1);
                var d = si * numPoints + (sj + 1);
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

export { LatheGeometry };
