import { faoxomworlduvgenerator } from "../core/index.js";
import { Shape, ShapeUtils, Vector2 } from "../math/index.js";
import { Geometry } from "./Geometry.js";

class ExtrudeGeometry extends Geometry {
    constructor(shapes, options) {
        super();
        this.type = "ExtrudeGeometry";
        if (shapes === undefined) shapes = new Shape([new Vector2(0.5, 0.5), new Vector2(-0.5, 0.5), new Vector2(-0.5, -0.5), new Vector2(0.5, -0.5)]);
        if (typeof options === "number") options = { depth: options };
        options = options || {};
        this.parameters = { shapes: shapes, options: options };
        if (options.extrudePath) console.warn("ExtrudeGeometry: extrudePath is not supported; extruding along +z.");
        var shapeList = Array.isArray(shapes) ? shapes : [shapes];
        var scope = this;
        var verticesArray = [];
        var uvArray = [];
        function addShape(shape) {
            var placeholder = [];
            var curveSegments = options.curveSegments !== undefined ? options.curveSegments : 12;
            var steps = options.steps !== undefined ? options.steps : 1;
            var depth = options.depth !== undefined ? options.depth : 1;
            var bevelEnabled = options.bevelEnabled !== undefined ? options.bevelEnabled : true;
            var bevelThickness = options.bevelThickness !== undefined ? options.bevelThickness : 0.2;
            var bevelSize = options.bevelSize !== undefined ? options.bevelSize : bevelThickness - 0.1;
            var bevelOffset = options.bevelOffset !== undefined ? options.bevelOffset : 0;
            var bevelSegments = options.bevelSegments !== undefined ? options.bevelSegments : 3;
            var uvgen = options.UVGenerator !== undefined ? options.UVGenerator : faoxomworlduvgenerator;
            if (!bevelEnabled) {
                bevelSegments = 0;
                bevelThickness = 0;
                bevelSize = 0;
                bevelOffset = 0;
            }
            var shapePoints = shape.extractPoints(curveSegments);
            var vertices = shapePoints.shape;
            var holes = shapePoints.holes;
            var reverse = !ShapeUtils.isClockWise(vertices);
            if (reverse) {
                vertices = vertices.reverse();
                for (var h = 0, hl = holes.length; h < hl; h++) {
                    var ahole = holes[h];
                    if (ShapeUtils.isClockWise(ahole)) holes[h] = ahole.reverse();
                }
            }
            function mergeOverlappingPoints(points) {
                var THRESHOLD = 1e-10;
                var THRESHOLD_SQ = THRESHOLD * THRESHOLD;
                var prevPos = points[0];
                for (var i = 1; i <= points.length; i++) {
                    var currentIndex = i % points.length;
                    var currentPos = points[currentIndex];
                    var dx = currentPos.x - prevPos.x;
                    var dy = currentPos.y - prevPos.y;
                    var distSq = dx * dx + dy * dy;
                    var scalingFactorSqrt = Math.max(Math.abs(currentPos.x), Math.abs(currentPos.y), Math.abs(prevPos.x), Math.abs(prevPos.y));
                    var thresholdSqScaled = THRESHOLD_SQ * scalingFactorSqrt * scalingFactorSqrt;
                    if (distSq <= thresholdSqScaled) {
                        points.splice(currentIndex, 1);
                        i--;
                        continue;
                    }
                    prevPos = currentPos;
                }
            }
            mergeOverlappingPoints(vertices);
            holes.forEach(mergeOverlappingPoints);
            var numHoles = holes.length;
            var contour = vertices;
            for (var h2 = 0; h2 < numHoles; h2++) vertices = vertices.concat(holes[h2]);
            function scalePt2(pt, vec, size) {
                if (!vec) console.error("ExtrudeGeometry: vec does not exist");
                return pt.clone().addScaledVector(vec, size);
            }
            var vlen = vertices.length;
            function getBevelVec(inPt, inPrev, inNext) {
                var v_trans_x, v_trans_y, shrink_by;
                var v_prev_x = inPt.x - inPrev.x, v_prev_y = inPt.y - inPrev.y;
                var v_next_x = inNext.x - inPt.x, v_next_y = inNext.y - inPt.y;
                var v_prev_lensq = (v_prev_x * v_prev_x + v_prev_y * v_prev_y);
                var collinear0 = (v_prev_x * v_next_y - v_prev_y * v_next_x);
                if (Math.abs(collinear0) > Number.EPSILON) {
                    var v_prev_len = Math.sqrt(v_prev_lensq);
                    var v_next_len = Math.sqrt(v_next_x * v_next_x + v_next_y * v_next_y);
                    var ptPrevShift_x = (inPrev.x - v_prev_y / v_prev_len);
                    var ptPrevShift_y = (inPrev.y + v_prev_x / v_prev_len);
                    var ptNextShift_x = (inNext.x - v_next_y / v_next_len);
                    var ptNextShift_y = (inNext.y + v_next_x / v_next_len);
                    var sf = ((ptNextShift_x - ptPrevShift_x) * v_next_y -
                            (ptNextShift_y - ptPrevShift_y) * v_next_x) /
                            (v_prev_x * v_next_y - v_prev_y * v_next_x);
                    v_trans_x = (ptPrevShift_x + v_prev_x * sf - inPt.x);
                    v_trans_y = (ptPrevShift_y + v_prev_y * sf - inPt.y);
                    var v_trans_lensq = (v_trans_x * v_trans_x + v_trans_y * v_trans_y);
                    if (v_trans_lensq <= 2) {
                        return new Vector2(v_trans_x, v_trans_y);
                    } else {
                        shrink_by = Math.sqrt(v_trans_lensq / 2);
                    }
                } else {
                    var direction_eq = false;
                    if (v_prev_x > Number.EPSILON) {
                        if (v_next_x > Number.EPSILON) { direction_eq = true; }
                    } else {
                        if (v_prev_x < -Number.EPSILON) {
                            if (v_next_x < -Number.EPSILON) { direction_eq = true; }
                        } else {
                            if (Math.sign(v_prev_y) === Math.sign(v_next_y)) { direction_eq = true; }
                        }
                    }
                    if (direction_eq) {
                        v_trans_x = -v_prev_y;
                        v_trans_y = v_prev_x;
                        shrink_by = Math.sqrt(v_prev_lensq);
                    } else {
                        v_trans_x = v_prev_x;
                        v_trans_y = v_prev_y;
                        shrink_by = Math.sqrt(v_prev_lensq / 2);
                    }
                }
                return new Vector2(v_trans_x / shrink_by, v_trans_y / shrink_by);
            }
            var contourMovements = [];
            for (var i = 0, il = contour.length, j = il - 1, k = i + 1; i < il; i++, j++, k++) {
                if (j === il) j = 0;
                if (k === il) k = 0;
                contourMovements[i] = getBevelVec(contour[i], contour[j], contour[k]);
            }
            var holesMovements = [];
            var oneHoleMovements, verticesMovements = contourMovements.concat();
            for (var h3 = 0, hl3 = numHoles; h3 < hl3; h3++) {
                var ahole3 = holes[h3];
                oneHoleMovements = [];
                for (var i2 = 0, il2 = ahole3.length, j2 = il2 - 1, k2 = i2 + 1; i2 < il2; i2++, j2++, k2++) {
                    if (j2 === il2) j2 = 0;
                    if (k2 === il2) k2 = 0;
                    oneHoleMovements[i2] = getBevelVec(ahole3[i2], ahole3[j2], ahole3[k2]);
                }
                holesMovements.push(oneHoleMovements);
                verticesMovements = verticesMovements.concat(oneHoleMovements);
            }
            var faces;
            if (bevelSegments === 0) {
                faces = ShapeUtils.triangulateShape(contour, holes);
            } else {
                var contractedContourVertices = [];
                var expandedHoleVertices = [];
                for (var b = 0; b < bevelSegments; b++) {
                    var t = b / bevelSegments;
                    var z = bevelThickness * Math.cos(t * Math.PI / 2);
                    var bs = bevelSize * Math.sin(t * Math.PI / 2) + bevelOffset;
                    for (var i3 = 0, il3 = contour.length; i3 < il3; i3++) {
                        var vert = scalePt2(contour[i3], contourMovements[i3], bs);
                        v(vert.x, vert.y, -z);
                        if (t === 0) contractedContourVertices.push(vert);
                    }
                    for (var h4 = 0, hl4 = numHoles; h4 < hl4; h4++) {
                        var ahole4 = holes[h4];
                        oneHoleMovements = holesMovements[h4];
                        var oneHoleVertices = [];
                        for (var i4 = 0, il4 = ahole4.length; i4 < il4; i4++) {
                            var vert4 = scalePt2(ahole4[i4], oneHoleMovements[i4], bs);
                            v(vert4.x, vert4.y, -z);
                            if (t === 0) oneHoleVertices.push(vert4);
                        }
                        if (t === 0) expandedHoleVertices.push(oneHoleVertices);
                    }
                }
                faces = ShapeUtils.triangulateShape(contractedContourVertices, expandedHoleVertices);
            }
            var flen = faces.length;
            var bs2 = bevelSize + bevelOffset;
            var i5;
            for (i5 = 0; i5 < vlen; i5++) {
                var vert5 = bevelEnabled ? scalePt2(vertices[i5], verticesMovements[i5], bs2) : vertices[i5];
                v(vert5.x, vert5.y, 0);
            }
            var s;
            for (s = 1; s <= steps; s++) {
                for (var i6 = 0; i6 < vlen; i6++) {
                    var vert6 = bevelEnabled ? scalePt2(vertices[i6], verticesMovements[i6], bs2) : vertices[i6];
                    v(vert6.x, vert6.y, depth / steps * s);
                }
            }
            var b2;
            for (b2 = bevelSegments - 1; b2 >= 0; b2--) {
                var t2 = b2 / bevelSegments;
                var z2 = bevelThickness * Math.cos(t2 * Math.PI / 2);
                var bs3 = bevelSize * Math.sin(t2 * Math.PI / 2) + bevelOffset;
                for (var i7 = 0, il7 = contour.length; i7 < il7; i7++) {
                    var vert7 = scalePt2(contour[i7], contourMovements[i7], bs3);
                    v(vert7.x, vert7.y, depth + z2);
                }
                for (var h5 = 0, hl5 = numHoles; h5 < hl5; h5++) {
                    var ahole5 = holes[h5];
                    oneHoleMovements = holesMovements[h5];
                    for (var i8 = 0, il8 = ahole5.length; i8 < il8; i8++) {
                        var vert8 = scalePt2(ahole5[i8], oneHoleMovements[i8], bs3);
                        v(vert8.x, vert8.y, depth + z2);
                    }
                }
            }
            function buildLidFaces() {
                var start = verticesArray.length / 3;
                if (bevelEnabled) {
                    var layer = 0;
                    var offset = vlen * layer;
                    for (var i = 0; i < flen; i++) {
                        var face = faces[i];
                        f3(face[2] + offset, face[1] + offset, face[0] + offset);
                    }
                    layer = steps + bevelSegments * 2;
                    offset = vlen * layer;
                    for (var i9 = 0; i9 < flen; i9++) {
                        var face2 = faces[i9];
                        f3(face2[0] + offset, face2[1] + offset, face2[2] + offset);
                    }
                } else {
                    for (var i10 = 0; i10 < flen; i10++) {
                        var face3 = faces[i10];
                        f3(face3[2], face3[1], face3[0]);
                    }
                    for (var i11 = 0; i11 < flen; i11++) {
                        var face4 = faces[i11];
                        f3(face4[0] + vlen * steps, face4[1] + vlen * steps, face4[2] + vlen * steps);
                    }
                }
                scope.addGroup(start, verticesArray.length / 3 - start, 0);
            }
            function buildSideFaces() {
                var start = verticesArray.length / 3;
                var layeroffset = 0;
                sidewalls(contour, layeroffset);
                layeroffset += contour.length;
                for (var h = 0, hl = holes.length; h < hl; h++) {
                    var ahole = holes[h];
                    sidewalls(ahole, layeroffset);
                    layeroffset += ahole.length;
                }
                scope.addGroup(start, verticesArray.length / 3 - start, 1);
            }
            function sidewalls(contour, layeroffset) {
                var i = contour.length;
                while (--i >= 0) {
                    var j = i;
                    var k = i - 1;
                    if (k < 0) k = contour.length - 1;
                    for (var s = 0, sl = (steps + bevelSegments * 2); s < sl; s++) {
                        var slen1 = vlen * s;
                        var slen2 = vlen * (s + 1);
                        var a = layeroffset + j + slen1, b = layeroffset + k + slen1, c = layeroffset + k + slen2, d = layeroffset + j + slen2;
                        f4(a, b, c, d);
                    }
                }
            }
            function v(x, y, z) {
                placeholder.push(x);
                placeholder.push(y);
                placeholder.push(z);
            }
            function f3(a, b, c) {
                addVertex(a);
                addVertex(b);
                addVertex(c);
                var nextIndex = verticesArray.length / 3;
                var uvs = uvgen.generateTopUV(scope, verticesArray, nextIndex - 3, nextIndex - 2, nextIndex - 1);
                addUV(uvs[0]);
                addUV(uvs[1]);
                addUV(uvs[2]);
            }
            function f4(a, b, c, d) {
                addVertex(a);
                addVertex(b);
                addVertex(d);
                addVertex(b);
                addVertex(c);
                addVertex(d);
                var nextIndex = verticesArray.length / 3;
                var uvs = uvgen.generateSideWallUV(scope, verticesArray, nextIndex - 6, nextIndex - 3, nextIndex - 2, nextIndex - 1);
                addUV(uvs[0]);
                addUV(uvs[1]);
                addUV(uvs[3]);
                addUV(uvs[1]);
                addUV(uvs[2]);
                addUV(uvs[3]);
            }
            function addVertex(index) {
                verticesArray.push(placeholder[index * 3 + 0]);
                verticesArray.push(placeholder[index * 3 + 1]);
                verticesArray.push(placeholder[index * 3 + 2]);
            }
            function addUV(vector2) {
                uvArray.push(vector2.x);
                uvArray.push(vector2.y);
            }
            buildLidFaces();
            buildSideFaces();
        }
        for (var si = 0; si < shapeList.length; si++) addShape(shapeList[si]);
        this.setAttribute("position", new Float32Array(verticesArray), 3);
        this.setAttribute("uv", new Float32Array(uvArray), 2);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { ExtrudeGeometry };
