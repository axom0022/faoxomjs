import { Color } from "./Color.js";
import { Path } from "./Path.js";
import { Shape } from "./Shape.js";
import { ShapeUtils } from "./ShapeUtils.js";
import { Vector2 } from "./Vector2.js";

class ShapePath {
    constructor() { this.type = "ShapePath"; this.color = new Color(); this.subPaths = []; this.currentPath = null; this.userData = {}; }
    moveTo(x, y) { this.currentPath = new Path(); this.subPaths.push(this.currentPath); this.currentPath.moveTo(x, y); return this; }
    lineTo(x, y) { this.currentPath.lineTo(x, y); return this; }
    quadraticCurveTo(aCPx, aCPy, aX, aY) { this.currentPath.quadraticCurveTo(aCPx, aCPy, aX, aY); return this; }
    bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) { this.currentPath.bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY); return this; }
    splineThru(pts) { this.currentPath.splineThru(pts); return this; }
    toShapes() {
        function pointInPolygon(p, polygon) {
            var inside = false, n = polygon.length;
            for (var i = 0, j = n - 1; i < n; j = i++) {
                var a = polygon[i], b = polygon[j];
                if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
            }
            return inside;
        }
        function getInteriorPoint(polygon, minX, minY, maxX, maxY) {
            var point = new Vector2((minX + maxX) / 2, (minY + maxY) / 2);
            if (pointInPolygon(point, polygon)) return point;
            var y = point.y, intercepts = [], n = polygon.length;
            for (var i = 0; i < n; i++) {
                var a = polygon[i], b = polygon[(i + 1) % n];
                if ((a.y > y) !== (b.y > y)) intercepts.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
            }
            if (intercepts.length > 1) {
                intercepts.sort(function(x1, x2) { return x1 - x2; });
                point.x = (intercepts[0] + intercepts[1]) / 2;
            }
            return point;
        }
        function containsBox(inner, outer) { return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY; }
        var fillRule = (this.userData.style && this.userData.style.fillRule) || "nonzero";
        if (fillRule !== "nonzero" && fillRule !== "evenodd") fillRule = "nonzero";
        var isInside = fillRule === "nonzero" ? function(w) { return w !== 0; } : function(w) { return (w & 1) !== 0; };
        var entries = [];
        for (var i = 0; i < this.subPaths.length; i++) {
            var subPath = this.subPaths[i];
            var points = subPath.getPoints();
            if (points.length < 3) continue;
            var area = ShapeUtils.area(points);
            if (area === 0) continue;
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (var p = 0; p < points.length; p++) {
                if (points[p].x < minX) minX = points[p].x;
                if (points[p].x > maxX) maxX = points[p].x;
                if (points[p].y < minY) minY = points[p].y;
                if (points[p].y > maxY) maxY = points[p].y;
            }
            entries.push({ subPath: subPath, points: points, minX: minX, minY: minY, maxX: maxX, maxY: maxY, interiorPoint: getInteriorPoint(points, minX, minY, maxX, maxY), absArea: Math.abs(area), winding: area < 0 ? -1 : 1, container: null, exclude: false, role: null });
        }
        entries.sort(function(a, b) { return b.absArea - a.absArea; });
        for (var e = 0; e < entries.length; e++) {
            var entry = entries[e], containerWinding = 0;
            for (var j = e - 1; j >= 0; j--) {
                var candidate = entries[j];
                if (!containsBox(entry, candidate)) continue;
                if (!pointInPolygon(entry.interiorPoint, candidate.points)) continue;
                entry.container = candidate.exclude ? candidate.container : candidate;
                containerWinding = candidate.winding;
                entry.winding += containerWinding;
                break;
            }
            if (isInside(entry.winding) === isInside(containerWinding)) entry.exclude = true;
        }
        for (var k = 0; k < entries.length; k++) {
            if (entries[k].exclude) continue;
            entries[k].role = (entries[k].container === null || entries[k].container.role === "hole") ? "outer" : "hole";
        }
        var shapes = [], shapeByEntry = [];
        for (var o = 0; o < entries.length; o++) {
            var outerEntry = entries[o];
            if (outerEntry.exclude || outerEntry.role !== "outer") continue;
            var shape = new Shape();
            shape.curves = outerEntry.subPath.curves;
            shapes.push(shape);
            shapeByEntry.push([outerEntry, shape]);
        }
        for (var h = 0; h < entries.length; h++) {
            var holeEntry = entries[h];
            if (holeEntry.exclude || holeEntry.role !== "hole") continue;
            var containerShape = null;
            for (var s = 0; s < shapeByEntry.length; s++) if (shapeByEntry[s][0] === holeEntry.container) containerShape = shapeByEntry[s][1];
            if (!containerShape) continue;
            var hole = new Path();
            hole.curves = holeEntry.subPath.curves;
            containerShape.holes.push(hole);
        }
        return shapes;
    }
}

export { ShapePath };
