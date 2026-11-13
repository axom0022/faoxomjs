import fs from "node:fs/promises";

async function run() {
    console.log("Reading existing FaoxomJs.js...");
    let src = await fs.readFile("FaoxomJs.js", "utf8");

    // Clean up any previously inserted appendixes
    const appendixMarker = src.indexOf("class STLLoader {");
    if (appendixMarker !== -1) {
        src = src.slice(0, appendixMarker);
    }
    const versionMarker = src.indexOf("FaoxomJs.VERSION");
    if (versionMarker !== -1) {
        src = src.slice(0, versionMarker);
    }

    // Insert RectAreaLight after HemisphereLight if not already present
    const hemiTarget = "class HemisphereLight extends Light { constructor(skyColor, groundColor, intensity) { super(skyColor, intensity); this.type = \"HemisphereLight\"; this.groundColor = new Color(faoxomValue(groundColor, 0x444444)); } }";
    const hemiIdx = src.indexOf(hemiTarget);
    if (hemiIdx !== -1 && !src.includes("class RectAreaLight extends Light {")) {
        const hemiEnd = hemiIdx + hemiTarget.length;
        const rectAreaCode = "\nclass RectAreaLight extends Light { constructor(color, intensity, width, height) { super(color, intensity); this.type = 'RectAreaLight'; this.width = faoxomValue(width, 10); this.height = faoxomValue(height, 10); this.power = this.intensity * this.width * this.height * Math.PI; } }";
        src = src.slice(0, hemiEnd) + rectAreaCode + src.slice(hemiEnd);
    }

    // Insert curves & geometries before GeometryFactory if not already present
    if (!src.includes("class CatmullRomCurve3")) {
        const geomFactoryIdx = src.indexOf("class GeometryFactory {");
        if (geomFactoryIdx === -1) throw new Error("Cannot find GeometryFactory");

        const curveAndGeomCode = `
class Curve {
    constructor() { this.type = "Curve"; this.arcLengthDivisions = 200; this.needsUpdate = false; this.cacheArcLengths = []; }
    getPoint(t, optionalTarget) { var point = optionalTarget || new Vector3(); return point; }
    getPointAt(u, optionalTarget) { var t = this.getUtoTmapping(u); return this.getPoint(t, optionalTarget); }
    getPoints(divisions) { var d = divisions || 50, points = []; for (var i = 0; i <= d; i++) points.push(this.getPoint(i / d)); return points; }
    getSpacedPoints(divisions) { var d = divisions || 50, points = []; for (var i = 0; i <= d; i++) points.push(this.getPointAt(i / d)); return points; }
    getLength() { var lengths = this.getLengths(); return lengths[lengths.length - 1]; }
    getLengths(divisions) {
        var d = divisions || this.arcLengthDivisions;
        if (this.cacheArcLengths && this.cacheArcLengths.length === d + 1 && !this.needsUpdate) return this.cacheArcLengths;
        this.needsUpdate = false; var cache = [0], last = this.getPoint(0), sum = 0;
        for (var p = 1; p <= d; p++) { var current = this.getPoint(p / d); sum += current.distanceTo(last); cache.push(sum); last = current; }
        this.cacheArcLengths = cache; return cache;
    }
    getUtoTmapping(u, distance) {
        var lengths = this.getLengths(), len = lengths.length, targetArcLength = distance !== undefined ? distance : u * lengths[len - 1];
        var low = 0, high = len - 1, index;
        while (low <= high) { index = Math.floor(low + (high - low) / 2); var diff = lengths[index] - targetArcLength; if (diff < 0) low = index + 1; else if (diff > 0) high = index - 1; else { high = index; break; } }
        index = high; if (lengths[index] === targetArcLength) return index / (len - 1);
        var lengthBefore = lengths[index], lengthAfter = lengths[index + 1], segmentLength = lengthAfter - lengthBefore;
        var segmentFraction = (targetArcLength - lengthBefore) / segmentLength;
        return (index + segmentFraction) / (len - 1);
    }
    getTangent(t, optionalTarget) {
        var delta = 0.0001, t1 = Math.max(0, t - delta), t2 = Math.min(1, t + delta);
        var pt1 = this.getPoint(t1), pt2 = this.getPoint(t2);
        var tangent = optionalTarget || new Vector3();
        return tangent.subVectors(pt2, pt1).normalize();
    }
    getTangentAt(u, optionalTarget) { var t = this.getUtoTmapping(u); return this.getTangent(t, optionalTarget); }
    computeFrenetFrames(segments, closed) {
        var normal = new Vector3(), tangents = [], normals = [], binormals = [];
        var vec = new Vector3();
        var numSegments = segments || 50;
        for (var i = 0; i <= numSegments; i++) tangents.push(this.getTangentAt(i / numSegments, new Vector3()));
        normals[0] = new Vector3(); binormals[0] = new Vector3();
        var min = Number.MAX_VALUE, tx = Math.abs(tangents[0].x), ty = Math.abs(tangents[0].y), tz = Math.abs(tangents[0].z);
        if (tx <= min) { min = tx; normal.set(1, 0, 0); }
        if (ty <= min) { min = ty; normal.set(0, 1, 0); }
        if (tz <= min) { normal.set(0, 0, 1); }
        vec.crossVectors(tangents[0], normal).normalize();
        normals[0].crossVectors(tangents[0], vec);
        binormals[0].crossVectors(tangents[0], normals[0]);
        for (var j = 1; j <= numSegments; j++) {
            normals[j] = normals[j - 1].clone();
            binormals[j] = binormals[j - 1].clone();
            vec.crossVectors(tangents[j - 1], tangents[j]);
            if (vec.length() > 0.0001) {
                vec.normalize();
                var theta = Math.acos(faoxomClamp(tangents[j - 1].dot(tangents[j]), -1, 1));
                normals[j].applyAxisAngle(vec, theta);
            }
            binormals[j].crossVectors(tangents[j], normals[j]);
        }
        if (closed) {
            var thetaEnd = Math.acos(faoxomClamp(normals[0].dot(normals[numSegments]), -1, 1));
            thetaEnd /= numSegments;
            if (tangents[0].dot(vec.crossVectors(normals[0], normals[numSegments])) > 0) thetaEnd = -thetaEnd;
            for (var k = 1; k <= numSegments; k++) {
                normals[k].applyAxisAngle(tangents[k], thetaEnd * k);
                binormals[k].crossVectors(tangents[k], normals[k]);
            }
        }
        return { tangents: tangents, normals: normals, binormals: binormals };
    }
}

class CatmullRomCurve3 extends Curve {
    constructor(points, closed, curveType, tension) {
        super();
        this.type = "CatmullRomCurve3";
        this.points = points || [];
        this.closed = !!closed;
        this.curveType = curveType || "centripetal";
        this.tension = tension !== undefined ? tension : 0.5;
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var points = this.points, l = points.length;
        if (l < 2) return point;
        var p = (l - (this.closed ? 0 : 1)) * t;
        var intPoint = Math.floor(p), weight = p - intPoint;
        if (this.closed) intPoint += intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / l) + 1) * l;
        else if (weight === 0 && intPoint === l - 1) { intPoint = l - 2; weight = 1; }
        var p0, p1, p2, p3;
        if (this.closed || intPoint > 0) p0 = points[(intPoint - 1) % l]; else p0 = points[0].clone().sub(points[1].clone().sub(points[0]));
        p1 = points[intPoint % l];
        p2 = points[(intPoint + 1) % l];
        if (this.closed || intPoint + 2 < l) p3 = points[(intPoint + 2) % l]; else p3 = points[l - 1].clone().add(points[l - 1].clone().sub(points[l - 2]));
        var alpha = this.curveType === "chordal" ? 1.0 : this.curveType === "uniform" ? 0.0 : 0.5;
        var dt0 = Math.pow(p0.distanceToSquared(p1), alpha * 0.5);
        var dt1 = Math.pow(p1.distanceToSquared(p2), alpha * 0.5);
        var dt2 = Math.pow(p2.distanceToSquared(p3), alpha * 0.5);
        if (dt1 < 0.0001) dt1 = 1.0; if (dt0 < 0.0001) dt0 = dt1; if (dt2 < 0.0001) dt2 = dt1;
        var t1 = (p1.clone().sub(p0).multiplyScalar(1 / dt0).sub(p2.clone().sub(p0).multiplyScalar(1 / (dt0 + dt1))).add(p2.clone().sub(p1).multiplyScalar(1 / dt1))).multiplyScalar(dt1);
        var t2 = (p2.clone().sub(p1).multiplyScalar(1 / dt1).sub(p3.clone().sub(p1).multiplyScalar(1 / (dt1 + dt2))).add(p3.clone().sub(p2).multiplyScalar(1 / dt2))).multiplyScalar(dt1);
        var w2 = weight * weight, w3 = w2 * weight;
        var h00 = 2 * w3 - 3 * w2 + 1, h10 = w3 - 2 * w2 + weight, h01 = -2 * w3 + 3 * w2, h11 = w3 - w2;
        point.set(
            h00 * p1.x + h10 * t1.x + h01 * p2.x + h11 * t2.x,
            h00 * p1.y + h10 * t1.y + h01 * p2.y + h11 * t2.y,
            h00 * p1.z + h10 * t1.z + h01 * p2.z + h11 * t2.z
        );
        return point;
    }
}

class CubicBezierCurve3 extends Curve {
    constructor(v0, v1, v2, v3) {
        super();
        this.type = "CubicBezierCurve3";
        this.v0 = v0 || new Vector3();
        this.v1 = v1 || new Vector3();
        this.v2 = v2 || new Vector3();
        this.v3 = v3 || new Vector3();
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var u = 1 - t, tt = t * t, uu = u * u, uuu = uu * u, ttt = tt * t;
        point.x = uuu * this.v0.x + 3 * uu * t * this.v1.x + 3 * u * tt * this.v2.x + ttt * this.v3.x;
        point.y = uuu * this.v0.y + 3 * uu * t * this.v1.y + 3 * u * tt * this.v2.y + ttt * this.v3.y;
        point.z = uuu * this.v0.z + 3 * uu * t * this.v1.z + 3 * u * tt * this.v2.z + ttt * this.v3.z;
        return point;
    }
}

class QuadraticBezierCurve3 extends Curve {
    constructor(v0, v1, v2) {
        super();
        this.type = "QuadraticBezierCurve3";
        this.v0 = v0 || new Vector3();
        this.v1 = v1 || new Vector3();
        this.v2 = v2 || new Vector3();
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var u = 1 - t;
        point.x = u * u * this.v0.x + 2 * u * t * this.v1.x + t * t * this.v2.x;
        point.y = u * u * this.v0.y + 2 * u * t * this.v1.y + t * t * this.v2.y;
        point.z = u * u * this.v0.z + 2 * u * t * this.v1.z + t * t * this.v2.z;
        return point;
    }
}

class LineCurve3 extends Curve {
    constructor(v1, v2) { super(); this.type = "LineCurve3"; this.v1 = v1 || new Vector3(); this.v2 = v2 || new Vector3(); }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        if (t === 1) point.copy(this.v2); else point.copy(this.v2).sub(this.v1).multiplyScalar(t).add(this.v1);
        return point;
    }
}

class NURBSUtils {
    static findSpan(p, u, U) {
        var n = U.length - p - 2;
        if (u >= U[n + 1]) return n;
        if (u <= U[p]) return p;
        var low = p, high = n + 1, mid = Math.floor((low + high) / 2);
        while (u < U[mid] || u >= U[mid + 1]) {
            if (u < U[mid]) high = mid; else low = mid;
            mid = Math.floor((low + high) / 2);
        }
        return mid;
    }
    static calcBasisFunctions(span, u, p, U) {
        var N = [1.0], left = [0.0], right = [0.0];
        for (var j = 1; j <= p; j++) {
            left[j] = u - U[span + 1 - j];
            right[j] = U[span + j] - u;
            var saved = 0.0;
            for (var r = 0; r < j; r++) {
                var rv = right[r + 1], lv = left[j - r];
                var temp = N[r] / (rv + lv);
                N[r] = saved + rv * temp;
                saved = lv * temp;
            }
            N[j] = saved;
        }
        return N;
    }
    static calcBSplinePoint(p, U, P, u) {
        var span = this.findSpan(p, u, U), N = this.calcBasisFunctions(span, u, p, U), C = new Vector4(0, 0, 0, 0);
        for (var i = 0; i <= p; i++) {
            var pt = P[span - p + i], basis = N[i];
            C.x += basis * pt.x; C.y += basis * pt.y; C.z += basis * pt.z; C.w += basis * (pt.w !== undefined ? pt.w : 1.0);
        }
        return C;
    }
}

class NURBSCurve extends Curve {
    constructor(degree, knots, controlPoints, startKnot, endKnot) {
        super();
        this.type = "NURBSCurve";
        this.degree = degree || 3;
        this.knots = knots || [];
        this.controlPoints = controlPoints || [];
        this.startKnot = startKnot !== undefined ? startKnot : (this.knots[this.degree] || 0);
        this.endKnot = endKnot !== undefined ? endKnot : (this.knots[this.knots.length - 1 - this.degree] || 1);
    }
    getPoint(t, optionalTarget) {
        var point = optionalTarget || new Vector3();
        var u = this.startKnot + (this.endKnot - this.startKnot) * t;
        var hpoint = NURBSUtils.calcBSplinePoint(this.degree, this.knots, this.controlPoints, u);
        var w = hpoint.w || 1.0;
        point.set(hpoint.x / w, hpoint.y / w, hpoint.z / w);
        return point;
    }
}

class NURBSSurface {
    constructor(degree1, degree2, knots1, knots2, controlPoints) {
        this.degree1 = degree1 || 3;
        this.degree2 = degree2 || 3;
        this.knots1 = knots1 || [];
        this.knots2 = knots2 || [];
        this.controlPoints = controlPoints || [];
    }
    getPoint(t1, t2, target) {
        var u = this.knots1[this.degree1] + (this.knots1[this.knots1.length - 1 - this.degree1] - this.knots1[this.degree1]) * t1;
        var v = this.knots2[this.degree2] + (this.knots2[this.knots2.length - 1 - this.degree2] - this.knots2[this.degree2]) * t2;
        var span1 = NURBSUtils.findSpan(this.degree1, u, this.knots1);
        var span2 = NURBSUtils.findSpan(this.degree2, v, this.knots2);
        var N1 = NURBSUtils.calcBasisFunctions(span1, u, this.degree1, this.knots1);
        var N2 = NURBSUtils.calcBasisFunctions(span2, v, this.degree2, this.knots2);
        var pt = new Vector4(0, 0, 0, 0);
        for (var l = 0; l <= this.degree2; l++) {
            var temp = new Vector4(0, 0, 0, 0);
            for (var k = 0; k <= this.degree1; k++) {
                var p = this.controlPoints[span1 - this.degree1 + k][span2 - this.degree2 + l];
                var w = p.w !== undefined ? p.w : 1.0;
                temp.x += N1[k] * p.x * w; temp.y += N1[k] * p.y * w; temp.z += N1[k] * p.z * w; temp.w += N1[k] * w;
            }
            pt.x += N2[l] * temp.x; pt.y += N2[l] * temp.y; pt.z += N2[l] * temp.z; pt.w += N2[l] * temp.w;
        }
        var out = target || new Vector3();
        var wFinal = pt.w || 1.0;
        out.set(pt.x / wFinal, pt.y / wFinal, pt.z / wFinal);
        return out;
    }
}

class Path {
    constructor(points) { this.type = "Path"; this.currentPoint = new Vector2(); this.curves = []; this.autoClose = false; if (points) this.setFromPoints(points); }
    setFromPoints(points) { this.moveTo(points[0].x, points[0].y); for (var i = 1; i < points.length; i++) this.lineTo(points[i].x, points[i].y); return this; }
    moveTo(x, y) { this.currentPoint.set(x, y); return this; }
    lineTo(x, y) { this.curves.push({ type: "line", v1: this.currentPoint.clone(), v2: new Vector2(x, y) }); this.currentPoint.set(x, y); return this; }
    quadraticCurveTo(aCPx, aCPy, aX, aY) { this.curves.push({ type: "quadratic", v0: this.currentPoint.clone(), v1: new Vector2(aCPx, aCPy), v2: new Vector2(aX, aY) }); this.currentPoint.set(aX, aY); return this; }
    bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) { this.curves.push({ type: "bezier", v0: this.currentPoint.clone(), v1: new Vector2(aCP1x, aCP1y), v2: new Vector2(aCP2x, aCP2y), v3: new Vector2(aX, aY) }); this.currentPoint.set(aX, aY); return this; }
    absarc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) {
        this.curves.push({ type: "arc", cx: aX, cy: aY, radius: aRadius, startAngle: aStartAngle, endAngle: aEndAngle, clockwise: !!aClockwise });
        this.currentPoint.set(aX + aRadius * Math.cos(aEndAngle), aY + aRadius * Math.sin(aEndAngle));
        return this;
    }
    closePath() { if (this.curves.length) { var first = this.curves[0].v0 || this.curves[0].v1; if (first && (this.currentPoint.x !== first.x || this.currentPoint.y !== first.y)) this.lineTo(first.x, first.y); } return this; }
    getPoints(divisions) {
        var d = divisions || 12, points = [];
        for (var i = 0; i < this.curves.length; i++) {
            var c = this.curves[i];
            if (c.type === "line") { if (i === 0) points.push(c.v1.clone()); points.push(c.v2.clone()); }
            else if (c.type === "quadratic") {
                for (var j = (i === 0 ? 0 : 1); j <= d; j++) {
                    var t = j / d, u = 1 - t;
                    points.push(new Vector2(u * u * c.v0.x + 2 * u * t * c.v1.x + t * t * c.v2.x, u * u * c.v0.y + 2 * u * t * c.v1.y + t * t * c.v2.y));
                }
            } else if (c.type === "bezier") {
                for (var k = (i === 0 ? 0 : 1); k <= d; k++) {
                    var tb = k / d, ub = 1 - tb, uub = ub * ub, uuub = uub * ub, ttb = tb * tb, tttb = ttb * tb;
                    points.push(new Vector2(uuub * c.v0.x + 3 * uub * tb * c.v1.x + 3 * ub * ttb * c.v2.x + tttb * c.v3.x, uuub * c.v0.y + 3 * uub * tb * c.v1.y + 3 * ub * ttb * c.v2.y + tttb * c.v3.y));
                }
            } else if (c.type === "arc") {
                var start = c.startAngle, end = c.endAngle, sweep = end - start;
                for (var a = (i === 0 ? 0 : 1); a <= d; a++) {
                    var angle = start + sweep * (a / d);
                    points.push(new Vector2(c.cx + c.radius * Math.cos(angle), c.cy + c.radius * Math.sin(angle)));
                }
            }
        }
        return points;
    }
}

class Shape extends Path {
    constructor(points) { super(points); this.type = "Shape"; this.holes = []; }
    extractPoints(divisions) {
        var shapePoints = this.getPoints(divisions), holePoints = [];
        for (var i = 0; i < this.holes.length; i++) holePoints.push(this.holes[i].getPoints(divisions));
        return { shape: shapePoints, holes: holePoints };
    }
}

class ShapeGeometry extends Geometry {
    constructor(shapes, curveSegments) {
        super();
        this.type = "ShapeGeometry";
        curveSegments = Math.max(1, Math.floor(faoxomValue(curveSegments, 12)));
        var list = Array.isArray(shapes) ? shapes : [shapes];
        var positions = [], uvs = [], indices = [], vertexOffset = 0;
        for (var s = 0; s < list.length; s++) {
            var shape = list[s];
            var pts = shape.getPoints ? shape.getPoints(curveSegments) : (shape.points || []);
            if (pts.length < 3) continue;
            var numPts = pts.length;
            for (var p = 0; p < numPts; p++) {
                positions.push(pts[p].x, pts[p].y, 0);
                uvs.push(pts[p].x, pts[p].y);
            }
            for (var t = 1; t < numPts - 1; t++) {
                indices.push(vertexOffset, vertexOffset + t, vertexOffset + t + 1);
            }
            vertexOffset += numPts;
        }
        this.attributes.position = new BufferAttribute(new Float32Array(positions), 3);
        this.attributes.uv = new BufferAttribute(new Float32Array(uvs), 2);
        var normArr = new Float32Array(positions.length);
        for (var n = 2; n < positions.length; n += 3) normArr[n] = 1;
        this.attributes.normal = new BufferAttribute(normArr, 3);
        this.index = new Uint32Array(indices);
        this.computeVertexNormals();
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

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

class ExtrudeGeometry extends Geometry {
    constructor(shapes, options) {
        super();
        this.type = "ExtrudeGeometry";
        options = options || {};
        var shapeList = Array.isArray(shapes) ? shapes : [shapes];
        var depth = options.depth !== undefined ? options.depth : 1;
        var bevelEnabled = options.bevelEnabled !== undefined ? options.bevelEnabled : true;
        var bevelThickness = options.bevelThickness !== undefined ? options.bevelThickness : 0.2;
        var bevelSize = options.bevelSize !== undefined ? options.bevelSize : bevelThickness * 0.8;
        var steps = Math.max(1, options.steps || 1);
        var positions = [], normals = [], uvs = [], indices = [];

        function triangulatePolygon(contour) {
            var poly = contour.slice();
            var n = poly.length;
            if (n < 3) return [];
            var triangles = [], indexList = [];
            for (var i = 0; i < n; i++) indexList.push(i);
            var count = 2 * n, v = n - 1;
            while (indexList.length > 2) {
                if (count-- <= 0) break;
                var u = v; if (u >= indexList.length) u = 0;
                v = u + 1; if (v >= indexList.length) v = 0;
                var w = v + 1; if (w >= indexList.length) w = 0;
                var ax = poly[indexList[u]].x, ay = poly[indexList[u]].y;
                var bx = poly[indexList[v]].x, by = poly[indexList[v]].y;
                var cx = poly[indexList[w]].x, cy = poly[indexList[w]].y;
                if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) > 0.000001) {
                    var ear = true;
                    for (var p = 0; p < indexList.length; p++) {
                        if (p === u || p === v || p === w) continue;
                        var px = poly[indexList[p]].x, py = poly[indexList[p]].y;
                        var b0 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
                        var b1 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
                        var b2 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
                        if (b0 >= 0 && b1 >= 0 && b2 >= 0) { ear = false; break; }
                    }
                    if (ear) {
                        triangles.push(indexList[u], indexList[v], indexList[w]);
                        indexList.splice(v, 1);
                        count = 2 * indexList.length;
                    }
                }
            }
            return triangles;
        }

        for (var s = 0; s < shapeList.length; s++) {
            var shape = shapeList[s];
            var pts = shape.getPoints ? shape.getPoints(options.curveSegments || 12) : (shape.points || []);
            if (pts.length < 3) continue;
            var numPts = pts.length;
            var frontZ = depth * 0.5 + (bevelEnabled ? bevelThickness : 0);
            var backZ = -depth * 0.5 - (bevelEnabled ? bevelThickness : 0);
            var baseVertex = positions.length / 3;

            for (var p = 0; p < numPts; p++) {
                positions.push(pts[p].x, pts[p].y, frontZ);
                normals.push(0, 0, 1);
                uvs.push(pts[p].x, pts[p].y);
            }
            for (var pb = 0; pb < numPts; pb++) {
                positions.push(pts[pb].x, pts[pb].y, backZ);
                normals.push(0, 0, -1);
                uvs.push(pts[pb].x, pts[pb].y);
            }

            var tris = triangulatePolygon(pts);
            for (var t = 0; t < tris.length; t += 3) {
                indices.push(baseVertex + tris[t], baseVertex + tris[t + 1], baseVertex + tris[t + 2]);
                indices.push(baseVertex + numPts + tris[t + 2], baseVertex + numPts + tris[t + 1], baseVertex + numPts + tris[t]);
            }

            for (var side = 0; side < numPts; side++) {
                var next = (side + 1) % numPts;
                var sideStart = positions.length / 3;
                var p1 = pts[side], p2 = pts[next];
                var dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
                var nx = dy / len, ny = -dx / len;

                positions.push(p1.x, p1.y, frontZ, p2.x, p2.y, frontZ, p1.x, p1.y, backZ, p2.x, p2.y, backZ);
                normals.push(nx, ny, 0, nx, ny, 0, nx, ny, 0, nx, ny, 0);
                uvs.push(0, 1, 1, 1, 0, 0, 1, 0);
                indices.push(sideStart, sideStart + 1, sideStart + 2, sideStart + 1, sideStart + 3, sideStart + 2);
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
`;
        src = src.slice(0, geomFactoryIdx) + curveAndGeomCode + "\n" + src.slice(geomFactoryIdx);
    }

    // The remaining classes (Loaders, Exporters, Controls, Helpers, TSL, NodeMaterial, React, Data3DTexture)
    const ecosystemCode = `
class STLLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var geom = self.parse(buffer); if (onLoad) onLoad(geom); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) {
        var isBinary = function(buf) {
            if (buf.byteLength < 84) return false;
            var reader = new DataView(buf);
            var numFaces = reader.getUint32(80, true);
            return 84 + numFaces * 50 === buf.byteLength;
        };
        var isBin = (data instanceof ArrayBuffer) && isBinary(data);
        var positions = [], normals = [];
        if (isBin) {
            var reader = new DataView(data);
            var faces = reader.getUint32(80, true);
            var offset = 84;
            for (var i = 0; i < faces; i++) {
                var nx = reader.getFloat32(offset, true), ny = reader.getFloat32(offset + 4, true), nz = reader.getFloat32(offset + 8, true);
                offset += 12;
                for (var v = 0; v < 3; v++) {
                    positions.push(reader.getFloat32(offset, true), reader.getFloat32(offset + 4, true), reader.getFloat32(offset + 8, true));
                    normals.push(nx, ny, nz);
                    offset += 12;
                }
                offset += 2;
            }
        } else {
            var text = typeof data === "string" ? data : new TextDecoder().decode(data);
            var lines = text.split("\\n");
            var curNormal = [0, 0, 0];
            for (var l = 0; l < lines.length; l++) {
                var line = lines[l].trim();
                if (line.startsWith("facet normal")) {
                    var parts = line.split(/\\s+/);
                    curNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
                } else if (line.startsWith("vertex")) {
                    var vparts = line.split(/\\s+/);
                    positions.push(parseFloat(vparts[1]), parseFloat(vparts[2]), parseFloat(vparts[3]));
                    normals.push(curNormal[0], curNormal[1], curNormal[2]);
                }
            }
        }
        var geom = new Geometry();
        geom.attributes.position = new BufferAttribute(new Float32Array(positions), 3);
        geom.attributes.normal = new BufferAttribute(new Float32Array(normals), 3);
        geom.computeBoundingBox();
        geom.computeBoundingSphere();
        return geom;
    }
}

class PLYLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var geom = self.parse(buffer); if (onLoad) onLoad(geom); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(data) {
        var text = typeof data === "string" ? data : new TextDecoder().decode(data.slice(0, 2048));
        var lines = text.split("\\n");
        var isAscii = true, vertexCount = 0, faceCount = 0, headerEnd = 0;
        for (var i = 0; i < lines.i; i++) {}
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.startsWith("format")) isAscii = line.includes("ascii");
            if (line.startsWith("element vertex")) vertexCount = parseInt(line.split(/\\s+/)[2], 10);
            if (line.startsWith("element face")) faceCount = parseInt(line.split(/\\s+/)[2], 10);
            if (line === "end_header") { headerEnd = i + 1; break; }
        }
        var positions = [], normals = [], indices = [];
        if (isAscii) {
            var allLines = (typeof data === "string" ? data : new TextDecoder().decode(data)).split("\\n");
            var lineIdx = headerEnd;
            for (var v = 0; v < vertexCount; v++) {
                var vline = allLines[lineIdx++].trim().split(/\\s+/);
                positions.push(parseFloat(vline[0]), parseFloat(vline[1]), parseFloat(vline[2]));
                if (vline.length >= 6) normals.push(parseFloat(vline[3]), parseFloat(vline[4]), parseFloat(vline[5]));
            }
            for (var f = 0; f < faceCount; f++) {
                var fline = allLines[lineIdx++].trim().split(/\\s+/);
                var num = parseInt(fline[0], 10);
                if (num === 3) indices.push(parseInt(fline[1], 10), parseInt(fline[2], 10), parseInt(fline[3], 10));
                else if (num === 4) {
                    var i0 = parseInt(fline[1], 10), i1 = parseInt(fline[2], 10), i2 = parseInt(fline[3], 10), i3 = parseInt(fline[4], 10);
                    indices.push(i0, i1, i2, i0, i2, i3);
                }
            }
        }
        var geom = new Geometry();
        geom.attributes.position = new BufferAttribute(new Float32Array(positions), 3);
        if (normals.length) geom.attributes.normal = new BufferAttribute(new Float32Array(normals), 3);
        if (indices.length) geom.index = new Uint32Array(indices);
        geom.computeVertexNormals();
        geom.computeBoundingBox();
        geom.computeBoundingSphere();
        return geom;
    }
}

class RGBELoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.setResponseType("arraybuffer");
        loader.load(url, function(buffer) {
            try { var texture = self.parse(buffer); if (onLoad) onLoad(texture); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(buffer) {
        var decoded = faoxomDecodeHDR(buffer);
        var texture = new DataTexture(decoded.data, decoded.width, decoded.height, RGBAFormat, FloatType);
        texture.needsUpdate = true;
        return texture;
    }
}

class SVGLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        var loader = new FileLoader(this.manager);
        loader.load(url, function(text) {
            try { var data = self.parse(text); if (onLoad) onLoad(data); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(text) {
        var paths = [];
        var pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/gi;
        var match;
        while ((match = pathRegex.exec(text)) !== null) {
            var d = match[1];
            var path = new Shape();
            var commands = d.match(/([a-df-z]|[-+]?\\d*\\.?\\d+(?:e[-+]?\\d+)?)/gi) || [];
            var curX = 0, curY = 0;
            for (var c = 0; c < commands.length; c++) {
                var cmd = commands[c];
                if (cmd === "M" || cmd === "m") {
                    curX = parseFloat(commands[++c]); curY = parseFloat(commands[++c]);
                    path.moveTo(curX, curY);
                } else if (cmd === "L" || cmd === "l") {
                    curX = parseFloat(commands[++c]); curY = parseFloat(commands[++c]);
                    path.lineTo(curX, curY);
                } else if (cmd === "Z" || cmd === "z") {
                    path.closePath();
                }
            }
            paths.push(path);
        }
        return { paths: paths };
    }
}

class OBJExporter {
    parse(object) {
        var output = "# FaoxomJS OBJExporter\\n";
        var indexOffset = 0;
        object.traverse(function(child) {
            if (child instanceof Mesh && child.geometry && child.geometry.attributes.position) {
                var pos = child.geometry.attributes.position.array;
                var norm = child.geometry.attributes.normal ? child.geometry.attributes.normal.array : null;
                var uv = child.geometry.attributes.uv ? child.geometry.attributes.uv.array : null;
                var idx = child.geometry.index;
                output += "o " + (child.name || "Mesh_" + child.id) + "\\n";
                for (var i = 0; i < pos.length; i += 3) output += "v " + pos[i].toFixed(4) + " " + pos[i + 1].toFixed(4) + " " + pos[i + 2].toFixed(4) + "\\n";
                if (norm) for (var n = 0; n < norm.length; n += 3) output += "vn " + norm[n].toFixed(4) + " " + norm[n + 1].toFixed(4) + " " + norm[n + 2].toFixed(4) + "\\n";
                if (uv) for (var u = 0; u < uv.length; u += 2) output += "vt " + uv[u].toFixed(4) + " " + uv[u + 1].toFixed(4) + "\\n";
                if (idx) {
                    for (var f = 0; f < idx.length; f += 3) {
                        var a = idx[f] + 1 + indexOffset, b = idx[f + 1] + 1 + indexOffset, c = idx[f + 2] + 1 + indexOffset;
                        output += "f " + a + " " + b + " " + c + "\\n";
                    }
                } else {
                    for (var f2 = 0; f2 < pos.length / 3; f2 += 3) {
                        var a2 = f2 + 1 + indexOffset, b2 = f2 + 2 + indexOffset, c2 = f2 + 3 + indexOffset;
                        output += "f " + a2 + " " + b2 + " " + c2 + "\\n";
                    }
                }
                indexOffset += pos.length / 3;
            }
        });
        return output;
    }
}

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
            var output = "solid FaoxomJS\\n";
            for (var a = 0; a < triangles.length; a++) {
                var triA = triangles[a];
                output += "facet normal 0 0 0\\n  outer loop\\n";
                for (var b = 0; b < 3; b++) output += "    vertex " + triA[b].x.toFixed(4) + " " + triA[b].y.toFixed(4) + " " + triA[b].z.toFixed(4) + "\\n";
                output += "  endloop\\nendfacet\\n";
            }
            output += "endsolid FaoxomJS\\n";
            return output;
        }
    }
}

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
        var output = "ply\\nformat ascii 1.0\\n";
        output += "element vertex " + (positions.length / 3) + "\\n";
        output += "property float x\\nproperty float y\\nproperty float z\\n";
        output += "element face " + (indices.length / 3) + "\\n";
        output += "property list uchar int vertex_indices\\nend_header\\n";
        for (var v = 0; v < positions.length; v += 3) output += positions[v].toFixed(4) + " " + positions[v + 1].toFixed(4) + " " + positions[v + 2].toFixed(4) + "\\n";
        for (var t = 0; t < indices.length; t += 3) output += "3 " + indices[t] + " " + indices[t + 1] + " " + indices[t + 2] + "\\n";
        return output;
    }
}

class GLTFExporter {
    parse(scene, onDone, onError, options) {
        try {
            var gltf = {
                asset: { generator: "FaoxomJS GLTFExporter", version: "2.0" },
                scenes: [{ nodes: [] }],
                nodes: [],
                meshes: [],
                materials: [],
                accessors: [],
                bufferViews: [],
                buffers: []
            };
            var binChunks = [], byteOffset = 0;
            scene.traverse(function(child) {
                if (child instanceof Mesh && child.geometry && child.geometry.attributes.position) {
                    var nodeIdx = gltf.nodes.length;
                    gltf.scenes[0].nodes.push(nodeIdx);
                    var meshIdx = gltf.meshes.length;
                    gltf.nodes.push({ name: child.name || "Mesh", mesh: meshIdx, translation: [child.position.x, child.position.y, child.position.z] });
                    var posArray = child.geometry.attributes.position.array;
                    var posBuffer = posArray.buffer.slice(posArray.byteOffset, posArray.byteOffset + posArray.byteLength);
                    var bvIdx = gltf.bufferViews.length;
                    gltf.bufferViews.push({ buffer: 0, byteOffset: byteOffset, byteLength: posBuffer.byteLength, target: 34962 });
                    byteOffset += posBuffer.byteLength;
                    binChunks.push(new Uint8Array(posBuffer));
                    var accIdx = gltf.accessors.length;
                    gltf.accessors.push({ bufferView: bvIdx, byteOffset: 0, componentType: 5126, count: posArray.length / 3, type: "VEC3", min: [-10, -10, -10], max: [10, 10, 10] });
                    gltf.meshes.push({ primitives: [{ attributes: { POSITION: accIdx } }] });
                }
            });
            var totalLength = binChunks.reduce(function(a, b) { return a + b.byteLength; }, 0);
            var combinedBin = new Uint8Array(totalLength);
            var curOff = 0;
            for (var c = 0; c < binChunks.length; c++) { combinedBin.set(binChunks[c], curOff); curOff += binChunks[c].byteLength; }
            gltf.buffers.push({ byteLength: totalLength });
            if (options && options.binary) {
                var jsonText = JSON.stringify(gltf);
                var jsonBytes = new TextEncoder().encode(jsonText);
                var jsonPadding = (4 - (jsonBytes.byteLength % 4)) % 4;
                var binPadding = (4 - (combinedBin.byteLength % 4)) % 4;
                var totalGlbSize = 12 + 8 + jsonBytes.byteLength + jsonPadding + 8 + combinedBin.byteLength + binPadding;
                var glb = new ArrayBuffer(totalGlbSize);
                var view = new DataView(glb);
                view.setUint32(0, 0x46546C67, true); view.setUint32(4, 2, true); view.setUint32(8, totalGlbSize, true);
                var cur = 12;
                view.setUint32(cur, jsonBytes.byteLength + jsonPadding, true); view.setUint32(cur + 4, 0x4E4F534A, true); cur += 8;
                new Uint8Array(glb, cur, jsonBytes.byteLength).set(jsonBytes); cur += jsonBytes.byteLength + jsonPadding;
                view.setUint32(cur, combinedBin.byteLength + binPadding, true); view.setUint32(cur + 4, 0x004E4942, true); cur += 8;
                new Uint8Array(glb, cur, combinedBin.byteLength).set(combinedBin);
                if (onDone) onDone(glb); return glb;
            } else {
                if (onDone) onDone(gltf); return gltf;
            }
        } catch (e) { if (onError) onError(e); }
    }
}

class CascadedShadowMap {
    constructor(directionalLight, cascades, maxDistance) {
        this.light = directionalLight;
        this.cascades = cascades || 3;
        this.maxDistance = maxDistance || 100;
        this.breaks = [0.1, 0.3, 1.0];
        this.cameras = [];
        for (var i = 0; i < this.cascades; i++) {
            var cam = new OrthographicCamera(-20, 20, 20, -20, 0.1, this.maxDistance);
            this.cameras.push(cam);
        }
    }
    update(camera) {
        for (var i = 0; i < this.cascades; i++) {
            var dist = this.maxDistance * this.breaks[i];
            this.cameras[i].position.copy(camera.position).addScaledVector(this.light.position, 1);
            this.cameras[i].lookAt(camera.position);
            this.cameras[i].updateMatrixWorld(true);
        }
    }
}

class AtmosphericSky extends Mesh {
    constructor(options) {
        options = options || {};
        var geom = new SphereGeometry(faoxomValue(options.radius, 450), 32, 16);
        var mat = new ShaderMaterial({
            vertexShader: "varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader: "uniform vec3 uSunPosition; uniform float uTurbidity; uniform float uRayleigh; varying vec3 vWorldPosition; void main() { vec3 dir = normalize(vWorldPosition); float sunDot = max(0.0, dot(dir, normalize(uSunPosition))); vec3 skyColor = mix(vec3(0.2, 0.5, 0.85), vec3(0.05, 0.15, 0.35), max(0.0, dir.y)); skyColor += vec3(1.0, 0.8, 0.5) * pow(sunDot, 32.0); gl_FragColor = vec4(skyColor, 1.0); }",
            uniforms: { uSunPosition: { value: new Vector3(0, 1, 0.5) }, uTurbidity: { value: 2.0 }, uRayleigh: { value: 1.0 } },
            side: BackSide,
            depthWrite: false
        });
        super(geom, mat);
        this.type = "AtmosphericSky";
    }
}

class StatsPanel {
    constructor(options) {
        options = options || {};
        this.dom = document.createElement("div");
        this.dom.style.cssText = options.container ? "position:relative;cursor:pointer;opacity:0.95;font-family:monospace;font-size:11px;background:rgba(17,28,36,0.9);color:#55ddff;padding:8px 12px;border-radius:6px;border:1px solid #234;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,0.5);" : "position:fixed;top:70px;left:10px;cursor:pointer;opacity:0.95;z-index:10000;font-family:monospace;font-size:11px;background:rgba(17,28,36,0.9);color:#55ddff;padding:8px 12px;border-radius:6px;border:1px solid #234;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
        this.fpsText = document.createElement("div");
        this.msText = document.createElement("div");
        this.drawText = document.createElement("div");
        this.triText = document.createElement("div");
        this.dom.appendChild(this.fpsText);
        this.dom.appendChild(this.msText);
        this.dom.appendChild(this.drawText);
        this.dom.appendChild(this.triText);
        this.frames = 0; this.prevTime = performance.now(); this.fps = 60;
        if (options.container) options.container.appendChild(this.dom); else if (typeof document !== "undefined" && document.body) document.body.appendChild(this.dom);
    }
    update(renderer) {
        this.frames++;
        var time = performance.now();
        if (time >= this.prevTime + 1000) {
            this.fps = Math.round((this.frames * 1000) / (time - this.prevTime));
            this.frames = 0; this.prevTime = time;
        }
        var calls = renderer && renderer.info && renderer.info.render ? renderer.info.render.calls : 0;
        var tris = renderer && renderer.info && renderer.info.render ? renderer.info.render.triangles : 0;
        this.fpsText.textContent = "FPS: " + this.fps;
        this.msText.textContent = "Frame: " + (1000 / Math.max(1, this.fps)).toFixed(2) + " ms";
        this.drawText.textContent = "Draws: " + calls;
        this.triText.textContent = "Tris: " + tris.toLocaleString();
    }
    destroy() { if (this.dom && this.dom.parentNode) this.dom.parentNode.removeChild(this.dom); }
}

class TransformControls extends Object3D {
    constructor(camera, domElement) {
        super();
        this.type = "TransformControls";
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.target = null;
        this.mode = "translate";
        this.dragging = false;
        this.axis = null;
        this.pointer = new Vector2();
        this.prevPointer = new Vector2();
        this.plane = new Plane(new Vector3(0, 0, 1), 0);
        this.raycaster = new Raycaster();
        
        var makeArrow = function(dir, color) {
            var group = new Group();
            var shaft = new Mesh(new CylinderGeometry(0.04, 0.04, 1.2, 8), new BasicMaterial({ color: color }));
            shaft.position.y = 0.6;
            var tip = new Mesh(new ConeGeometry(0.12, 0.3, 12), new BasicMaterial({ color: color }));
            tip.position.y = 1.35;
            group.add(shaft, tip);
            if (dir === "x") group.rotation.z = -Math.PI * 0.5;
            else if (dir === "z") group.rotation.x = Math.PI * 0.5;
            group.name = "axis_" + dir;
            return group;
        };
        this.gizmo = new Group();
        this.gizmo.add(makeArrow("x", 0xff3b30));
        this.gizmo.add(makeArrow("y", 0x34c759));
        this.gizmo.add(makeArrow("z", 0x007aff));
        this.add(this.gizmo);
        this.initEvents();
    }
    attach(object) { this.target = object; this.visible = true; this.update(); return this; }
    detach() { this.target = null; this.visible = false; return this; }
    setMode(mode) { this.mode = mode; return this; }
    update() {
        if (!this.target) { this.visible = false; return; }
        this.position.copy(this.target.position);
        if (this.camera) {
            var dist = this.position.distanceTo(this.camera.position);
            var scale = Math.max(0.1, dist * 0.15);
            this.scale.set(scale, scale, scale);
        }
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onDown = function(e) {
            if (!self.target) return;
            var rect = self.domElement.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            self.pointer.set(x, y); self.prevPointer.set(x, y);
            self.raycaster.setFromCamera(self.pointer, self.camera);
            var intersects = self.raycaster.intersectObjects(self.gizmo.children, true);
            if (intersects.length > 0) {
                self.dragging = true;
                var parent = intersects[0].object.parent;
                self.axis = parent && parent.name ? parent.name.replace("axis_", "") : "y";
            }
        };
        var onMove = function(e) {
            if (!self.dragging || !self.target) return;
            var rect = self.domElement.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            var dx = (x - self.prevPointer.x) * 5;
            var dy = (y - self.prevPointer.y) * 5;
            if (self.mode === "translate") {
                if (self.axis === "x") self.target.position.x += dx;
                else if (self.axis === "y") self.target.position.y += dy;
                else if (self.axis === "z") self.target.position.z += dy;
            } else if (self.mode === "rotate") {
                if (self.axis === "x") self.target.rotation.x += dy;
                else if (self.axis === "y") self.target.rotation.y += dx;
                else if (self.axis === "z") self.target.rotation.z += dx;
            } else if (self.mode === "scale") {
                var factor = 1 + dy;
                if (self.axis === "x") self.target.scale.x *= factor;
                else if (self.axis === "y") self.target.scale.y *= factor;
                else if (self.axis === "z") self.target.scale.z *= factor;
            }
            self.prevPointer.set(x, y);
            self.update();
        };
        var onUp = function() { self.dragging = false; self.axis = null; };
        this.domElement.addEventListener("pointerdown", onDown);
        this.domElement.addEventListener("pointermove", onMove);
        this.domElement.addEventListener("pointerup", onUp);
        this._handlers = { onDown: onDown, onMove: onMove, onUp: onUp };
    }
    dispose() {
        if (this.domElement && this._handlers) {
            this.domElement.removeEventListener("pointerdown", this._handlers.onDown);
            this.domElement.removeEventListener("pointermove", this._handlers.onMove);
            this.domElement.removeEventListener("pointerup", this._handlers.onUp);
        }
    }
}

class CameraHelper extends Line {
    constructor(camera) {
        var geom = new Geometry();
        var p = [
            0,0,0, -1,1,-1, 0,0,0, 1,1,-1, 0,0,0, 1,-1,-1, 0,0,0, -1,-1,-1,
            -1,1,-1, 1,1,-1, 1,1,-1, 1,-1,-1, 1,-1,-1, -1,-1,-1, -1,-1,-1, -1,1,-1,
            -1,1,-1, -2,2,-2, 1,1,-1, 2,2,-2, 1,-1,-1, 2,-2,-2, -1,-1,-1, -2,-2,-2,
            -2,2,-2, 2,2,-2, 2,2,-2, 2,-2,-2, 2,-2,-2, -2,-2,-2, -2,-2,-2, -2,2,-2
        ];
        geom.attributes.position = new BufferAttribute(new Float32Array(p), 3);
        super(geom, new BasicMaterial({ color: 0xffaa00 }));
        this.type = "CameraHelper";
        this.camera = camera;
    }
    update() { if (this.camera) this.matrix.copy(this.camera.matrixWorld); }
}

class DirectionalLightHelper extends Group {
    constructor(light, size, color) {
        super();
        this.light = light;
        this.size = size !== undefined ? size : 1;
        var geom = new Geometry();
        var s = this.size;
        geom.attributes.position = new BufferAttribute(new Float32Array([
            -s, s, 0,  s, s, 0,  s, s, 0,  s, -s, 0,  s, -s, 0, -s, -s, 0, -s, -s, 0, -s, s, 0,
            0, 0, 0, 0, 0, -s * 4
        ]), 3);
        this.add(new Line(geom, new BasicMaterial({ color: color || (light.color ? light.color.getHex() : 0xffff00) })));
    }
    update() { if (this.light) this.position.copy(this.light.position); }
}

class PointLightHelper extends Mesh {
    constructor(light, sphereSize, color) {
        super(new SphereGeometry(sphereSize || 0.5, 8, 4), new BasicMaterial({ color: color || (light.color ? light.color.getHex() : 0xffff00), wireframe: true }));
        this.light = light;
    }
    update() { if (this.light) this.position.copy(this.light.position); }
}

class SkeletonHelper extends Line {
    constructor(root) {
        var bones = [];
        root.traverse(function(child) { if (child instanceof Bone) bones.push(child); });
        var geom = new Geometry();
        var positions = new Float32Array(Math.max(1, bones.length * 2) * 3);
        geom.attributes.position = new BufferAttribute(positions, 3);
        super(geom, new BasicMaterial({ color: 0x00ffff }));
        this.root = root;
        this.bones = bones;
    }
    update() {
        var p = this.geometry.attributes.position.array;
        var idx = 0;
        for (var i = 0; i < this.bones.length; i++) {
            var bone = this.bones[i];
            if (bone.parent && bone.parent instanceof Bone) {
                var p1 = bone.parent.position, p2 = bone.position;
                p[idx++] = p1.x; p[idx++] = p1.y; p[idx++] = p1.z;
                p[idx++] = p2.x; p[idx++] = p2.y; p[idx++] = p2.z;
            }
        }
        this.geometry.attributes.position.needsUpdate = true;
    }
}

class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.target = new Vector3(0, 0, 0);
        this.enabled = true;
        this.enableDamping = true;
        this.dampingFactor = 0.08;
        this.enableZoom = true;
        this.zoomSpeed = 1.0;
        this.enableRotate = true;
        this.rotateSpeed = 1.0;
        this.enablePan = true;
        this.panSpeed = 1.0;
        this.autoRotate = false;
        this.autoRotateSpeed = 2.0;
        this.minDistance = 0.2;
        this.maxDistance = 1000;
        this.minPolarAngle = 0.01;
        this.maxPolarAngle = Math.PI - 0.01;
        
        var offset = new Vector3().subVectors(this.camera.position, this.target);
        var r = Math.max(0.1, offset.length());
        this.spherical = {
            radius: r,
            theta: Math.atan2(offset.x, offset.z),
            phi: Math.acos(faoxomClamp(offset.y / r, -1, 1))
        };
        this.targetSpherical = { radius: this.spherical.radius, theta: this.spherical.theta, phi: this.spherical.phi };
        this.isPointerDown = false;
        this.pointerStart = new Vector2();
        this.pointerButton = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onPointerDown = function(e) {
            if (!self.enabled) return;
            self.isPointerDown = true;
            self.pointerButton = e.button;
            self.pointerStart.set(e.clientX, e.clientY);
            if (self.domElement.setPointerCapture && e.pointerId !== undefined) {
                try { self.domElement.setPointerCapture(e.pointerId); } catch(err) {}
            }
        };
        var onPointerMove = function(e) {
            if (!self.enabled || !self.isPointerDown) return;
            var dx = e.clientX - self.pointerStart.x;
            var dy = e.clientY - self.pointerStart.y;
            self.pointerStart.set(e.clientX, e.clientY);
            if (self.pointerButton === 0 && self.enableRotate) {
                self.targetSpherical.theta -= (dx * 0.005) * self.rotateSpeed;
                self.targetSpherical.phi = faoxomClamp(self.targetSpherical.phi + (dy * 0.005) * self.rotateSpeed, self.minPolarAngle, self.maxPolarAngle);
            } else if ((self.pointerButton === 2 || self.pointerButton === 1) && self.enablePan) {
                var factor = self.spherical.radius * 0.001 * self.panSpeed;
                var right = new Vector3(1, 0, 0).applyQuaternion(self.camera.quaternion);
                var up = new Vector3(0, 1, 0).applyQuaternion(self.camera.quaternion);
                self.target.addScaledVector(right, -dx * factor);
                self.target.addScaledVector(up, dy * factor);
            }
        };
        var onPointerUp = function(e) {
            self.isPointerDown = false;
            if (self.domElement && self.domElement.releasePointerCapture && e && e.pointerId !== undefined) {
                try { self.domElement.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        };
        var onWheel = function(e) {
            if (!self.enabled || !self.enableZoom) return;
            e.preventDefault();
            var delta = faoxomClamp(e.deltaY, -100, 100);
            var scale = Math.pow(0.998, delta * self.zoomSpeed);
            self.targetSpherical.radius = faoxomClamp(self.targetSpherical.radius * scale, self.minDistance, self.maxDistance);
        };
        var onContext = function(e) { e.preventDefault(); };

        this.domElement.addEventListener("pointerdown", onPointerDown);
        this.domElement.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        this.domElement.addEventListener("wheel", onWheel, { passive: false });
        this.domElement.addEventListener("contextmenu", onContext);
        this._handlers = { onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onWheel: onWheel, onContext: onContext };
    }
    update(dt) {
        if (!this.enabled) return;
        if (this.autoRotate) this.targetSpherical.theta += (this.autoRotateSpeed * (dt || 0.016) * Math.PI) / 60;
        var damp = this.enableDamping ? this.dampingFactor : 1;
        this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * damp;
        this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * damp;
        this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * damp;
        var sinPhiRadius = Math.sin(this.spherical.phi) * this.spherical.radius;
        this.camera.position.x = this.target.x + sinPhiRadius * Math.sin(this.spherical.theta);
        this.camera.position.y = this.target.y + Math.cos(this.spherical.phi) * this.spherical.radius;
        this.camera.position.z = this.target.z + sinPhiRadius * Math.cos(this.spherical.theta);
        this.camera.lookAt(this.target);
    }
    dispose() {
        if (this._handlers) {
            if (this.domElement) {
                this.domElement.removeEventListener("pointerdown", this._handlers.onPointerDown);
                this.domElement.removeEventListener("pointermove", this._handlers.onPointerMove);
                this.domElement.removeEventListener("wheel", this._handlers.onWheel);
                this.domElement.removeEventListener("contextmenu", this._handlers.onContext);
            }
            window.removeEventListener("pointerup", this._handlers.onPointerUp);
            window.removeEventListener("pointercancel", this._handlers.onPointerUp);
        }
    }
}

class FirstPersonControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.movementSpeed = 10.0;
        this.lookSpeed = 0.005;
        this.keys = {};
        this.pitch = 0; this.yaw = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onKeyDown = function(e) { self.keys[e.code] = true; };
        var onKeyUp = function(e) { self.keys[e.code] = false; };
        var onMouseMove = function(e) {
            if (e.buttons === 1) {
                self.yaw -= e.movementX * self.lookSpeed;
                self.pitch = faoxomClamp(self.pitch - e.movementY * self.lookSpeed, -Math.PI * 0.48, Math.PI * 0.48);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        this.domElement.addEventListener("mousemove", onMouseMove);
        this._handlers = { onKeyDown: onKeyDown, onKeyUp: onKeyUp, onMouseMove: onMouseMove };
    }
    update(dt) {
        var delta = dt || 0.016;
        var speed = this.movementSpeed * delta;
        var forward = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        var right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        if (this.keys["KeyW"] || this.keys["ArrowUp"]) this.camera.position.addScaledVector(forward, speed);
        if (this.keys["KeyS"] || this.keys["ArrowDown"]) this.camera.position.addScaledVector(forward, -speed);
        if (this.keys["KeyA"] || this.keys["ArrowLeft"]) this.camera.position.addScaledVector(right, -speed);
        if (this.keys["KeyD"] || this.keys["ArrowRight"]) this.camera.position.addScaledVector(right, speed);
        var euler = new Euler(this.pitch, this.yaw, 0, "YXZ");
        this.camera.quaternion.setFromEuler(euler);
    }
    dispose() {
        if (this._handlers) {
            window.removeEventListener("keydown", this._handlers.onKeyDown);
            window.removeEventListener("keyup", this._handlers.onKeyUp);
            if (this.domElement) this.domElement.removeEventListener("mousemove", this._handlers.onMouseMove);
        }
    }
}

class PointerLockControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.isLocked = false;
        this.pitch = 0; this.yaw = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onMouseMove = function(e) {
            if (!self.isLocked) return;
            self.yaw -= (e.movementX || 0) * 0.002;
            self.pitch = faoxomClamp(self.pitch - (e.movementY || 0) * 0.002, -Math.PI * 0.48, Math.PI * 0.48);
            var euler = new Euler(self.pitch, self.yaw, 0, "YXZ");
            self.camera.quaternion.setFromEuler(euler);
        };
        var onLockChange = function() { self.isLocked = document.pointerLockElement === self.domElement; };
        document.addEventListener("pointerlockchange", onLockChange);
        document.addEventListener("mousemove", onMouseMove);
        this._handlers = { onLockChange: onLockChange, onMouseMove: onMouseMove };
    }
    lock() { if (this.domElement && this.domElement.requestPointerLock) this.domElement.requestPointerLock(); }
    unlock() { if (document.exitPointerLock) document.exitPointerLock(); }
    dispose() {
        if (this._handlers) {
            document.removeEventListener("pointerlockchange", this._handlers.onLockChange);
            document.removeEventListener("mousemove", this._handlers.onMouseMove);
        }
    }
}

class ArcballControls extends OrbitControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.type = "ArcballControls";
    }
}

class MapControls extends OrbitControls {
    constructor(camera, domElement) {
        super(camera, domElement);
        this.type = "MapControls";
        this.screenSpacePanning = false;
        this.maxPolarAngle = Math.PI * 0.45;
    }
}

class Font {
    constructor(data) {
        this.data = data || {};
        this.glyphs = this.data.glyphs || {};
        this.resolution = this.data.resolution || 1000;
        this.underlineThickness = this.data.underlineThickness || 50;
    }
    generateShapes(text, size) {
        var shapes = [];
        var s = (size !== undefined ? size : 100) / this.resolution;
        var chars = String(text).split("");
        var offsetX = 0;
        for (var i = 0; i < chars.length; i++) {
            var glyph = this.glyphs[chars[i]] || this.glyphs["?"];
            if (!glyph) continue;
            var path = new Shape();
            var o = glyph.o ? glyph.o.split(/\\s+/) : [];
            var curX = 0, curY = 0;
            for (var j = 0; j < o.length; j++) {
                var cmd = o[j];
                if (cmd === "m") {
                    curX = parseFloat(o[++j]) * s + offsetX; curY = parseFloat(o[++j]) * s;
                    path.moveTo(curX, curY);
                } else if (cmd === "l") {
                    curX = parseFloat(o[++j]) * s + offsetX; curY = parseFloat(o[++j]) * s;
                    path.lineTo(curX, curY);
                } else if (cmd === "q") {
                    var cpx = parseFloat(o[++j]) * s + offsetX, cpy = parseFloat(o[++j]) * s;
                    curX = parseFloat(o[++j]) * s + offsetX; curY = parseFloat(o[++j]) * s;
                    path.quadraticCurveTo(cpx, cpy, curX, curY);
                } else if (cmd === "b") {
                    var cp1x = parseFloat(o[++j]) * s + offsetX, cp1y = parseFloat(o[++j]) * s;
                    var cp2x = parseFloat(o[++j]) * s + offsetX, cp2y = parseFloat(o[++j]) * s;
                    curX = parseFloat(o[++j]) * s + offsetX; curY = parseFloat(o[++j]) * s;
                    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curX, curY);
                }
            }
            shapes.push(path);
            offsetX += (glyph.ha || this.resolution * 0.6) * s;
        }
        return shapes;
    }
}

class FontLoader {
    constructor(manager) { this.manager = manager; }
    load(url, onLoad, onProgress, onError) {
        var loader = new FileLoader(this.manager);
        loader.load(url, function(text) {
            try { var json = JSON.parse(text); var font = new Font(json); if (onLoad) onLoad(font); } catch (e) { if (onError) onError(e); }
        }, onProgress, onError);
    }
    parse(json) { return new Font(json); }
}

class TextGeometry extends ExtrudeGeometry {
    constructor(text, options) {
        options = options || {};
        var font = options.font || new Font();
        var shapes = font.generateShapes(text, options.size || 1);
        super(shapes, {
            depth: options.height !== undefined ? options.height : (options.depth !== undefined ? options.depth : 0.2),
            bevelEnabled: options.bevelEnabled !== undefined ? options.bevelEnabled : true,
            bevelThickness: options.bevelThickness !== undefined ? options.bevelThickness : 0.03,
            bevelSize: options.bevelSize !== undefined ? options.bevelSize : 0.02,
            bevelSegments: options.bevelSegments || 3,
            steps: options.steps || 1
        });
        this.type = "TextGeometry";
    }
}

class MSDFText extends Mesh {
    constructor(text, options) {
        options = options || {};
        var canvas = typeof document !== "undefined" ? document.createElement("canvas") : { getContext: function() { return null; } };
        canvas.width = 512; canvas.height = 256;
        var ctx = canvas.getContext ? canvas.getContext("2d") : null;
        if (ctx) {
            ctx.fillStyle = "transparent";
            ctx.fillRect(0, 0, 512, 256);
            ctx.font = (options.fontWeight || "bold") + " " + (options.fontSize || 64) + "px " + (options.fontFamily || "Inter, system-ui, sans-serif");
            ctx.fillStyle = options.color ? (typeof options.color === "number" ? "#" + options.color.toString(16).padStart(6, "0") : options.color) : "#ffffff";
            ctx.textAlign = options.align || "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text || "FaoxomJS", 256, 128);
        }
        var tex = new Texture(canvas);
        tex.needsUpdate = true;
        var geom = new PlaneGeometry(options.width || 4, options.height || 2);
        var mat = new BasicMaterial({ map: tex, transparent: true, alphaTest: 0.01 });
        super(geom, mat);
        this.type = "MSDFText";
        this.text = text;
    }
}

class ShaderNode {
    constructor(type, outputType) {
        this.id = faoxomId++;
        this.type = type || "node";
        this.outputType = outputType || "float";
        this.children = [];
    }
    getType() { return this.outputType; }
    build(builder) { return "0.0"; }
    hash() { return this.type + "_" + this.id; }
}

class FloatNode extends ShaderNode {
    constructor(value) { super("float", "float"); this.value = value || 0.0; }
    build() { return this.value.toFixed(4); }
}

class Vector2Node extends ShaderNode {
    constructor(x, y) { super("vec2", "vec2"); this.x = x || 0; this.y = y || 0; }
    build() { return "vec2(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ")"; }
}

class Vector3Node extends ShaderNode {
    constructor(x, y, z) { super("vec3", "vec3"); this.x = x || 0; this.y = y || 0; this.z = z || 0; }
    build() { return "vec3(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ", " + this.z.toFixed(4) + ")"; }
}

class Vector4Node extends ShaderNode {
    constructor(x, y, z, w) { super("vec4", "vec4"); this.x = x || 0; this.y = y || 0; this.z = z || 0; this.w = w !== undefined ? w : 1; }
    build() { return "vec4(" + this.x.toFixed(4) + ", " + this.y.toFixed(4) + ", " + this.z.toFixed(4) + ", " + this.w.toFixed(4) + ")"; }
}

class ColorNode extends ShaderNode {
    constructor(color) {
        super("color", "vec3");
        this.color = color instanceof Color ? color : new Color(color);
    }
    build() { return "vec3(" + this.color.r.toFixed(4) + ", " + this.color.g.toFixed(4) + ", " + this.color.b.toFixed(4) + ")"; }
}

class OperatorNode extends ShaderNode {
    constructor(op, a, b) {
        super("operator", a && a.getType ? a.getType() : "float");
        this.op = op; this.a = a instanceof ShaderNode ? a : new FloatNode(a);
        this.b = b instanceof ShaderNode ? b : new FloatNode(b);
    }
    build(builder) {
        if (this.op === "dot") return "dot(" + this.a.build(builder) + ", " + this.b.build(builder) + ")";
        if (this.op === "cross") return "cross(" + this.a.build(builder) + ", " + this.b.build(builder) + ")";
        return "(" + this.a.build(builder) + " " + this.op + " " + this.b.build(builder) + ")";
    }
}

class MathNode extends ShaderNode {
    constructor(method, a, b, c) {
        super("math", a && a.getType ? a.getType() : "float");
        this.method = method;
        this.a = a instanceof ShaderNode ? a : (a !== undefined ? new FloatNode(a) : null);
        this.b = b instanceof ShaderNode ? b : (b !== undefined ? new FloatNode(b) : null);
        this.c = c instanceof ShaderNode ? c : (c !== undefined ? new FloatNode(c) : null);
    }
    build(builder) {
        var strA = this.a ? this.a.build(builder) : "";
        var strB = this.b ? ", " + this.b.build(builder) : "";
        var strC = this.c ? ", " + this.c.build(builder) : "";
        return this.method + "(" + strA + strB + strC + ")";
    }
}

class UVNode extends ShaderNode { constructor() { super("uv", "vec2"); } build() { return "vUv"; } }
class NormalNode extends ShaderNode { constructor(space) { super("normal", "vec3"); this.space = space || "world"; } build() { return this.space === "local" ? "vNormal" : "normalize(vNormal)"; } }
class PositionNode extends ShaderNode { constructor(space) { super("position", "vec3"); this.space = space || "world"; } build() { return this.space === "local" ? "vLocalPosition" : "vWorldPosition"; } }
class CameraPositionNode extends ShaderNode { constructor() { super("cameraPosition", "vec3"); } build() { return "uCameraPosition"; } }
class TimerNode extends ShaderNode { constructor(speed) { super("time", "float"); this.speed = speed || 1.0; } build() { return "(uTime * " + this.speed.toFixed(4) + ")"; } }

class FresnelNode extends ShaderNode {
    constructor(bias, power, scale) {
        super("fresnel", "float");
        this.bias = bias || 0.1;
        this.power = power || 2.0;
        this.scale = scale || 1.0;
    }
    build() { return "(" + this.bias.toFixed(4) + " + " + this.scale.toFixed(4) + " * pow(1.0 - max(0.0, dot(normalize(vNormal), normalize(uCameraPosition - vWorldPosition))), " + this.power.toFixed(4) + "))"; }
}

class NoiseNode extends ShaderNode {
    constructor(type, scale) {
        super("noise", "float");
        this.noiseType = type || "2d";
        this.scale = scale || 1.0;
    }
    build() { return "fract(sin(dot(vUv * " + this.scale.toFixed(4) + ", vec2(12.9898, 78.233))) * 43758.5453)"; }
}

class TextureNode extends ShaderNode {
    constructor(texture, uvNode) {
        super("texture", "vec4");
        this.texture = texture;
        this.uvNode = uvNode || new UVNode();
    }
    build(builder) { return "texture2D(uDiffuseMap, " + this.uvNode.build(builder) + ")"; }
}

const tsl = {
    float: function(v) { return new FloatNode(v); },
    vec2: function(x, y) { return new Vector2Node(x, y); },
    vec3: function(x, y, z) { return new Vector3Node(x, y, z); },
    vec4: function(x, y, z, w) { return new Vector4Node(x, y, z, w); },
    color: function(c) { return new ColorNode(c); },
    uv: function() { return new UVNode(); },
    normalLocal: new NormalNode("local"),
    normalWorld: new NormalNode("world"),
    positionLocal: new PositionNode("local"),
    positionWorld: new PositionNode("world"),
    cameraPosition: new CameraPositionNode(),
    time: new TimerNode(1.0),
    timerLocal: function(s) { return new TimerNode(s); },
    fresnel: function(b, p, s) { return new FresnelNode(b, p, s); },
    noise2d: function(scale) { return new NoiseNode("2d", scale); },
    sin: function(a) { return new MathNode("sin", a); },
    cos: function(a) { return new MathNode("cos", a); },
    mix: function(a, b, t) { return new MathNode("mix", a, b, t); },
    dot: function(a, b) { return new OperatorNode("dot", a, b); },
    cross: function(a, b) { return new OperatorNode("cross", a, b); },
    add: function(a, b) { return new OperatorNode("+", a, b); },
    sub: function(a, b) { return new OperatorNode("-", a, b); },
    mul: function(a, b) { return new OperatorNode("*", a, b); },
    div: function(a, b) { return new OperatorNode("/", a, b); },
    normalize: function(a) { return new MathNode("normalize", a); },
    length: function(a) { return new MathNode("length", a); },
    clamp: function(a, min, max) { return new MathNode("clamp", a, min, max); }
};

class NodeMaterial extends Material {
    constructor(options) {
        super(options);
        this.type = "NodeMaterial";
        options = options || {};
        this.colorNode = options.colorNode || null;
        this.roughnessNode = options.roughnessNode || null;
        this.metalnessNode = options.metalnessNode || null;
        this.normalNode = options.normalNode || null;
        this.emissiveNode = options.emissiveNode || null;
        this.opacityNode = options.opacityNode || null;
        this.positionNode = options.positionNode || null;
    }
    compileShader() {
        var colorExpr = this.colorNode ? this.colorNode.build() : "vec3(1.0)";
        var roughExpr = this.roughnessNode ? this.roughnessNode.build() : "0.5";
        var metalExpr = this.metalnessNode ? this.metalnessNode.build() : "0.0";
        var emissiveExpr = this.emissiveNode ? this.emissiveNode.build() : "vec3(0.0)";
        var opacityExpr = this.opacityNode ? this.opacityNode.build() : "1.0";
        return {
            vertexShader: "varying vec3 vWorldPosition; varying vec3 vNormal; varying vec2 vUv; void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPos.xyz; gl_Position = projectionMatrix * viewMatrix * worldPos; }",
            fragmentShader: "varying vec3 vWorldPosition; varying vec3 vNormal; varying vec2 vUv; uniform vec3 uCameraPosition; uniform float uTime; void main() { vec3 baseColor = " + colorExpr + "; float roughness = " + roughExpr + "; float metalness = " + metalExpr + "; vec3 emissive = " + emissiveExpr + "; float opacity = " + opacityExpr + "; vec3 N = normalize(vNormal); vec3 V = normalize(uCameraPosition - vWorldPosition); vec3 L = normalize(vec3(0.5, 1.0, 0.75)); float NdotL = max(0.0, dot(N, L)); vec3 diffuse = baseColor * (NdotL * 0.8 + 0.2); gl_FragColor = vec4(diffuse + emissive, opacity); }"
        };
    }
}

class MeshStandardNodeMaterial extends NodeMaterial { constructor(options) { super(options); this.type = "MeshStandardNodeMaterial"; } }
class MeshBasicNodeMaterial extends NodeMaterial { constructor(options) { super(options); this.type = "MeshBasicNodeMaterial"; } }

class Data3DTexture extends Texture {
    constructor(data, width, height, depth) {
        super(null);
        this.type = "Data3DTexture";
        this.data = data;
        this.width = width || 16;
        this.height = height || 16;
        this.depth = depth || 16;
        this.is3D = true;
    }
}

class VolumetricPass extends PostProcessPass {
    constructor(options) {
        super();
        options = options || {};
        this.stepSize = options.stepSize || 0.02;
        this.density = options.density || 1.0;
        this.scattering = options.scattering || 0.8;
    }
}

class FaoxomReact {
    static createElement(type, props) {
        var children = [];
        for (var i = 2; i < arguments.length; i++) {
            var child = arguments[i];
            if (Array.isArray(child)) children.push.apply(children, child);
            else if (child !== null && child !== undefined) children.push(child);
        }
        return { type: type, props: props || {}, children: children };
    }
    static createFaoxomRoot(domElement) {
        var app = new FaoxomJs({ renderer: { canvas: domElement } }).init();
        var currentTree = null;
        return {
            render: function(element) {
                currentTree = element;
                var scene = app.activeScene || app.createScene("main");
                scene.clear();
                var mount = function(node, parent) {
                    if (!node) return;
                    if (typeof node.type === "function") {
                        var componentResult = node.type(Object.assign({}, node.props, { children: node.children }));
                        mount(componentResult, parent);
                        return;
                    }
                    var obj = null;
                    if (node.type === "Mesh" || node.type === "mesh") {
                        var geom = node.props.geometry || new BoxGeometry(1, 1, 1);
                        var mat = node.props.material || new StandardMaterial({ color: node.props.color || 0x4f9be8 });
                        obj = new Mesh(geom, mat);
                    } else if (node.type === "PointLight" || node.type === "pointLight") {
                        obj = new PointLight(node.props.color || 0xffffff, node.props.intensity || 1);
                    } else if (node.type === "DirectionalLight" || node.type === "directionalLight") {
                        obj = new DirectionalLight(node.props.color || 0xffffff, node.props.intensity || 1);
                    } else if (node.type === "AmbientLight" || node.type === "ambientLight") {
                        obj = new AmbientLight(node.props.color || 0xffffff, node.props.intensity || 0.5);
                    } else if (node.type === "Group" || node.type === "group") {
                        obj = new Group();
                    }
                    if (obj) {
                        if (node.props.position) obj.position.set(node.props.position[0], node.props.position[1], node.props.position[2]);
                        if (node.props.rotation) obj.rotation.set(node.props.rotation[0], node.props.rotation[1], node.props.rotation[2]);
                        if (node.props.scale) obj.scale.set(node.props.scale[0], node.props.scale[1], node.props.scale[2]);
                        parent.add(obj);
                        for (var c = 0; c < node.children.length; c++) mount(node.children[c], obj);
                    }
                };
                mount(element, scene);
                app.start();
            },
            unmount: function() { app.destroy(); }
        };
    }
}
`;

    const newExports = `
FaoxomJs.Curve = Curve;
FaoxomJs.CatmullRomCurve3 = CatmullRomCurve3;
FaoxomJs.CubicBezierCurve3 = CubicBezierCurve3;
FaoxomJs.QuadraticBezierCurve3 = QuadraticBezierCurve3;
FaoxomJs.LineCurve3 = LineCurve3;
FaoxomJs.NURBSUtils = NURBSUtils;
FaoxomJs.NURBSCurve = NURBSCurve;
FaoxomJs.NURBSSurface = NURBSSurface;
FaoxomJs.Path = Path;
FaoxomJs.Shape = Shape;
FaoxomJs.ShapeGeometry = ShapeGeometry;
FaoxomJs.CircleGeometry = CircleGeometry;
FaoxomJs.ExtrudeGeometry = ExtrudeGeometry;
FaoxomJs.LatheGeometry = LatheGeometry;
FaoxomJs.TubeGeometry = TubeGeometry;
FaoxomJs.ParametricGeometry = ParametricGeometry;

FaoxomJs.STLLoader = STLLoader;
FaoxomJs.PLYLoader = PLYLoader;
FaoxomJs.RGBELoader = RGBELoader;
FaoxomJs.HDRLoader = RGBELoader;
FaoxomJs.SVGLoader = SVGLoader;
FaoxomJs.OBJExporter = OBJExporter;
FaoxomJs.STLExporter = STLExporter;
FaoxomJs.PLYExporter = PLYExporter;
FaoxomJs.GLTFExporter = GLTFExporter;

FaoxomJs.CascadedShadowMap = CascadedShadowMap;
FaoxomJs.AtmosphericSky = AtmosphericSky;

FaoxomJs.StatsPanel = StatsPanel;
FaoxomJs.TransformControls = TransformControls;
FaoxomJs.CameraHelper = CameraHelper;
FaoxomJs.DirectionalLightHelper = DirectionalLightHelper;
FaoxomJs.PointLightHelper = PointLightHelper;
FaoxomJs.SkeletonHelper = SkeletonHelper;

FaoxomJs.OrbitControls = OrbitControls;
FaoxomJs.FirstPersonControls = FirstPersonControls;
FaoxomJs.PointerLockControls = PointerLockControls;
FaoxomJs.ArcballControls = ArcballControls;
FaoxomJs.MapControls = MapControls;

FaoxomJs.Font = Font;
FaoxomJs.FontLoader = FontLoader;
FaoxomJs.TextGeometry = TextGeometry;
FaoxomJs.MSDFText = MSDFText;

FaoxomJs.ShaderNode = ShaderNode;
FaoxomJs.FloatNode = FloatNode;
FaoxomJs.Vector2Node = Vector2Node;
FaoxomJs.Vector3Node = Vector3Node;
FaoxomJs.Vector4Node = Vector4Node;
FaoxomJs.ColorNode = ColorNode;
FaoxomJs.OperatorNode = OperatorNode;
FaoxomJs.MathNode = MathNode;
FaoxomJs.UVNode = UVNode;
FaoxomJs.NormalNode = NormalNode;
FaoxomJs.PositionNode = PositionNode;
FaoxomJs.CameraPositionNode = CameraPositionNode;
FaoxomJs.TimerNode = TimerNode;
FaoxomJs.FresnelNode = FresnelNode;
FaoxomJs.NoiseNode = NoiseNode;
FaoxomJs.TextureNode = TextureNode;
FaoxomJs.tsl = tsl;
FaoxomJs.NodeMaterial = NodeMaterial;
FaoxomJs.MeshStandardNodeMaterial = MeshStandardNodeMaterial;
FaoxomJs.MeshBasicNodeMaterial = MeshBasicNodeMaterial;

FaoxomJs.Data3DTexture = Data3DTexture;
FaoxomJs.VolumetricPass = VolumetricPass;

FaoxomJs.FaoxomReact = FaoxomReact;
FaoxomJs.createFaoxomRoot = FaoxomReact.createFaoxomRoot;

FaoxomJs.prototype.createOrbitControls = function(camera, dom) { return new OrbitControls(camera || this.activeScene.camera, dom || this.renderer.canvas); };
FaoxomJs.prototype.createTransformControls = function(camera, dom) { return new TransformControls(camera || this.activeScene.camera, dom || this.renderer.canvas); };
FaoxomJs.prototype.createStatsPanel = function(options) { return new StatsPanel(options); };

FaoxomJs.VERSION = "0.3.0";
FaoxomJs.RELEASE = "0.3.0-ecosystem";

if (typeof window !== "undefined") window.FaoxomJs = FaoxomJs;
export default FaoxomJs;
`;

    const finalEngine = src.trim() + "\n" + ecosystemCode.trim() + "\n" + newExports.trim() + "\n";
    await fs.writeFile("FaoxomJs.js", finalEngine, "utf8");
    console.log("Successfully wrote updated FaoxomJs.js! Total length:", finalEngine.length);
}

run().catch(console.error);
