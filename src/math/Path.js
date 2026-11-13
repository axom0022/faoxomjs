import { Vector2 } from "./Vector2.js";
import { faoxomcatmullrompoint } from "./faoxomcatmullrompoint.js";
import { faoxomellipsecurvepoint } from "./faoxomellipsecurvepoint.js";

class Path {
    constructor(points) { this.type = "Path"; this.currentPoint = new Vector2(); this.curves = []; this.autoClose = false; if (points) this.setFromPoints(points); }
    setFromPoints(points) { this.moveTo(points[0].x, points[0].y); for (var i = 1; i < points.length; i++) this.lineTo(points[i].x, points[i].y); return this; }
    moveTo(x, y) { this.currentPoint.set(x, y); return this; }
    lineTo(x, y) { this.curves.push({ type: "line", v1: this.currentPoint.clone(), v2: new Vector2(x, y) }); this.currentPoint.set(x, y); return this; }
    quadraticCurveTo(aCPx, aCPy, aX, aY) { this.curves.push({ type: "quadratic", v0: this.currentPoint.clone(), v1: new Vector2(aCPx, aCPy), v2: new Vector2(aX, aY) }); this.currentPoint.set(aX, aY); return this; }
    bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) { this.curves.push({ type: "bezier", v0: this.currentPoint.clone(), v1: new Vector2(aCP1x, aCP1y), v2: new Vector2(aCP2x, aCP2y), v3: new Vector2(aX, aY) }); this.currentPoint.set(aX, aY); return this; }
    absarc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) { return this.absellipse(aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise, 0); }
    absellipse(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation) {
        this.curves.push({ type: "arc", cx: aX, cy: aY, xRadius: xRadius, yRadius: yRadius, startAngle: aStartAngle, endAngle: aEndAngle, clockwise: !!aClockwise, rotation: aRotation || 0 });
        faoxomellipsecurvepoint(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, !!aClockwise, aRotation || 0, 1, this.currentPoint);
        return this;
    }
    splineThru(pts) { var points = [this.currentPoint.clone()].concat(pts || []); this.curves.push({ type: "spline", points: points }); this.currentPoint.copy(points[points.length - 1]); return this; }
    closePath() { if (this.curves.length) { var first = this.curves[0].v0 || this.curves[0].v1; if (first && (this.currentPoint.x !== first.x || this.currentPoint.y !== first.y)) this.lineTo(first.x, first.y); } return this; }
    getPoints(divisions) {
        var d = divisions || 12, points = [], last = null, tmp = new Vector2();
        for (var i = 0; i < this.curves.length; i++) {
            var c = this.curves[i];
            var resolution = c.type === "arc" ? d * 2 : c.type === "line" ? 1 : c.type === "spline" ? d * c.points.length : d;
            var pts = [];
            if (c.type === "line") { pts.push(c.v1.clone(), c.v2.clone()); }
            else if (c.type === "quadratic") { for (var j = 0; j <= resolution; j++) { var t = j / resolution, u = 1 - t; pts.push(new Vector2(u * u * c.v0.x + 2 * u * t * c.v1.x + t * t * c.v2.x, u * u * c.v0.y + 2 * u * t * c.v1.y + t * t * c.v2.y)); } }
            else if (c.type === "bezier") { for (var k = 0; k <= resolution; k++) { var tb = k / resolution, ub = 1 - tb, uub = ub * ub, uuub = uub * ub, ttb = tb * tb, tttb = ttb * tb; pts.push(new Vector2(uuub * c.v0.x + 3 * uub * tb * c.v1.x + 3 * ub * ttb * c.v2.x + tttb * c.v3.x, uuub * c.v0.y + 3 * uub * tb * c.v1.y + 3 * ub * ttb * c.v2.y + tttb * c.v3.y)); } }
            else if (c.type === "arc") { for (var a = 0; a <= resolution; a++) pts.push(faoxomellipsecurvepoint(c.cx, c.cy, c.xRadius, c.yRadius, c.startAngle, c.endAngle, c.clockwise, c.rotation, a / resolution, new Vector2()).clone()); }
            else if (c.type === "spline") { for (var s = 0; s <= resolution; s++) pts.push(faoxomcatmullrompoint(c.points, s / resolution, tmp).clone()); }
            for (var q = 0; q < pts.length; q++) {
                if (last && last.equals(pts[q])) continue;
                points.push(pts[q]);
                last = pts[q];
            }
        }
        if (this.autoClose && points.length > 1 && !points[points.length - 1].equals(points[0])) points.push(points[0].clone());
        return points;
    }
}

export { Path };
