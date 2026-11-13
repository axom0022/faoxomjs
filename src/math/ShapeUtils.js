import { faoxomearcut } from "./faoxomearcut.js";

class ShapeUtils {
    static area(contour) {
        var n = contour.length, a = 0.0;
        for (var p = n - 1, q = 0; q < n; p = q++) a += contour[p].x * contour[q].y - contour[q].x * contour[p].y;
        return a * 0.5;
    }
    static isClockWise(pts) { return ShapeUtils.area(pts) < 0; }
    static triangulateShape(contour, holes) {
        var vertices = [], holeIndices = [], faces = [];
        function removeDupEndPts(points) {
            var l = points.length;
            if (l > 2 && points[l - 1].equals(points[0])) points.pop();
        }
        function addContour(target, contour) {
            for (var i = 0; i < contour.length; i++) { target.push(contour[i].x); target.push(contour[i].y); }
        }
        removeDupEndPts(contour);
        addContour(vertices, contour);
        var holeIndex = contour.length;
        for (var h = 0; h < holes.length; h++) removeDupEndPts(holes[h]);
        for (var i2 = 0; i2 < holes.length; i2++) {
            holeIndices.push(holeIndex);
            holeIndex += holes[i2].length;
            addContour(vertices, holes[i2]);
        }
        var triangles = faoxomearcut(vertices, holeIndices);
        for (var t = 0; t < triangles.length; t += 3) faces.push(triangles.slice(t, t + 3));
        return faces;
    }
}

export { ShapeUtils };
