import { Matrix3 } from "../math/index.js";

function faoxomsvgcomputelocalbbox(shapePath, worldTransform) {
    var inv = worldTransform ? new Matrix3().copy(worldTransform).invert() : null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < shapePath.subPaths.length; i++) {
        var pts = shapePath.subPaths[i].getPoints();
        for (var p = 0; p < pts.length; p++) {
            var x = pts[p].x, y = pts[p].y;
            if (inv) {
                var tx = inv.elements[0] * x + inv.elements[3] * y + inv.elements[6];
                var ty = inv.elements[1] * x + inv.elements[4] * y + inv.elements[7];
                x = tx;
                y = ty;
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    if (minX === Infinity) return null;
    return { minX: minX, minY: minY, width: maxX - minX, height: maxY - minY };
}

export { faoxomsvgcomputelocalbbox };
