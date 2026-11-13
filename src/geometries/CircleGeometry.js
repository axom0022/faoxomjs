import { BufferAttribute } from "../core/index.js";
import { Geometry } from "./Geometry.js";

class CircleGeometry extends Geometry {
    constructor(radius, segments, thetaStart, thetaLength) {
        super();
        this.type = "CircleGeometry";
        radius = radius !== undefined ? radius : 1;
        segments = Math.max(3, segments || 32);
        thetaStart = thetaStart !== undefined ? thetaStart : 0;
        thetaLength = thetaLength !== undefined ? thetaLength : Math.PI * 2;
        var positions = [0, 0, 0], uvs = [0.5, 0.5], normals = [0, 0, 1], indices = [];
        for (var i = 0; i <= segments; i++) {
            var theta = thetaStart + (i / segments) * thetaLength;
            var x = radius * Math.cos(theta), y = radius * Math.sin(theta);
            positions.push(x, y, 0);
            uvs.push((x / radius + 1) * 0.5, (y / radius + 1) * 0.5);
            normals.push(0, 0, 1);
        }
        for (var s = 1; s <= segments; s++) indices.push(0, s, s + 1);
        this.attributes.position = new BufferAttribute(new Float32Array(positions), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(uvs), 2);
        this.attributes.normal = new BufferAttribute(new Float32Array(normals), 3);
        this.index = new Uint32Array(indices);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { CircleGeometry };
