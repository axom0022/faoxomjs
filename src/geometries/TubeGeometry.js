import { BufferAttribute } from "../core/index.js";
import { CatmullRomCurve3, Vector3 } from "../math/index.js";
import { Geometry } from "./Geometry.js";

class TubeGeometry extends Geometry {
    constructor(path, tubularSegments, radius, radialSegments, closed) {
        super();
        this.type = "TubeGeometry";
        this.path = path || new CatmullRomCurve3([new Vector3(0, -1, 0), new Vector3(0, 0, 0.5), new Vector3(0, 1, 0)]);
        var numTubular = Math.max(2, tubularSegments || 64);
        var r = radius !== undefined ? radius : 0.2;
        var numRadial = Math.max(3, radialSegments || 8);
        var isClosed = !!closed;
        var frames = this.path.computeFrenetFrames ? this.path.computeFrenetFrames(numTubular, isClosed) : { tangents: [], normals: [], binormals: [] };
        var positions = [], normals = [], uvs = [], indices = [];

        for (var i = 0; i <= numTubular; i++) {
            var u = i / numTubular;
            var pt = this.path.getPointAt ? this.path.getPointAt(u, new Vector3()) : this.path.getPoint(u);
            var N = frames.normals[i] || new Vector3(0, 1, 0), B = frames.binormals[i] || new Vector3(1, 0, 0);
            for (var j = 0; j <= numRadial; j++) {
                var v = (j / numRadial) * Math.PI * 2;
                var sin = Math.sin(v), cos = -Math.cos(v);
                var normal = new Vector3().addScaledVector(N, cos).addScaledVector(B, sin).normalize();
                var vertex = pt.clone().addScaledVector(normal, r);
                positions.push(vertex.x, vertex.y, vertex.z);
                normals.push(normal.x, normal.y, normal.z);
                uvs.push(u, j / numRadial);
            }
        }
        for (var ti = 0; ti < numTubular; ti++) {
            for (var tj = 0; tj < numRadial; tj++) {
                var a = ti * (numRadial + 1) + tj;
                var b = (ti + 1) * (numRadial + 1) + tj;
                var c = (ti + 1) * (numRadial + 1) + (tj + 1);
                var d = ti * (numRadial + 1) + (tj + 1);
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

export { TubeGeometry };
