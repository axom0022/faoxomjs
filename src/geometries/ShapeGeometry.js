import { BufferAttribute } from "../core/index.js";
import { ShapeUtils, faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";

class ShapeGeometry extends Geometry {
    constructor(shapes, curveSegments) {
        super();
        this.type = "ShapeGeometry";
        curveSegments = Math.max(1, Math.floor(faoxomvalue(curveSegments, 12)));
        var list = Array.isArray(shapes) ? shapes : [shapes];
        var indices = [], vertices = [], normals = [], uvs = [];
        function addShape(shape) {
            var indexOffset = vertices.length / 3;
            var points = shape.extractPoints(curveSegments);
            var shapeVertices = points.shape;
            var shapeHoles = points.holes;
            if (ShapeUtils.isClockWise(shapeVertices) === false) shapeVertices = shapeVertices.reverse();
            for (var i = 0; i < shapeHoles.length; i++) {
                if (ShapeUtils.isClockWise(shapeHoles[i]) === true) shapeHoles[i] = shapeHoles[i].reverse();
            }
            var faces = ShapeUtils.triangulateShape(shapeVertices, shapeHoles);
            for (var h = 0; h < shapeHoles.length; h++) shapeVertices = shapeVertices.concat(shapeHoles[h]);
            for (var v = 0; v < shapeVertices.length; v++) {
                var vertex = shapeVertices[v];
                vertices.push(vertex.x, vertex.y, 0);
                normals.push(0, 0, 1);
                uvs.push(vertex.x, vertex.y);
            }
            for (var f = 0; f < faces.length; f++) {
                var face = faces[f];
                indices.push(face[0] + indexOffset, face[1] + indexOffset, face[2] + indexOffset);
            }
        }
        for (var s = 0; s < list.length; s++) {
            var shape = list[s];
            if (shape.extractPoints) addShape(shape);
            else {
                var pts = shape.getPoints ? shape.getPoints(curveSegments) : (shape.points || []);
                if (pts.length < 3) continue;
                var numPts = pts.length, vertexOffset = vertices.length / 3;
                for (var p = 0; p < numPts; p++) { vertices.push(pts[p].x, pts[p].y, 0); normals.push(0, 0, 1); uvs.push(pts[p].x, pts[p].y); }
                for (var t = 1; t < numPts - 1; t++) indices.push(vertexOffset, vertexOffset + t, vertexOffset + t + 1);
            }
        }
        this.attributes.position = new BufferAttribute(new Float32Array(vertices), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(uvs), 2);
        this.attributes.normal = new BufferAttribute(new Float32Array(normals), 3);
        this.index = new Uint32Array(indices);
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { ShapeGeometry };
