import { Vector3 } from "./Vector3.js";
import { faoxomclamp } from "./faoxomclamp.js";

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
                var theta = Math.acos(faoxomclamp(tangents[j - 1].dot(tangents[j]), -1, 1));
                normals[j].applyAxisAngle(vec, theta);
            }
            binormals[j].crossVectors(tangents[j], normals[j]);
        }
        if (closed) {
            var thetaEnd = Math.acos(faoxomclamp(normals[0].dot(normals[numSegments]), -1, 1));
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

export { Curve };
