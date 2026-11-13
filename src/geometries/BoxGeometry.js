import { faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";
import { faoxomgeometry } from "./faoxomgeometry.js";

class BoxGeometry extends Geometry {
    constructor(width, height, depth, sx, sy, sz) {
        super();
        width = faoxomvalue(width, 1);
        height = faoxomvalue(height, 1);
        depth = faoxomvalue(depth, 1);
        sx = Math.max(1, Math.floor(faoxomvalue(sx, 1)));
        sy = Math.max(1, Math.floor(faoxomvalue(sy, 1)));
        sz = Math.max(1, Math.floor(faoxomvalue(sz, 1)));
        var p = [], n = [], u = [], ind = [];
        var buildPlane = function(uAxis, vAxis, wAxis, udir, vdir, wWidth, wHeight, wDepth, gridX, gridY) {
            var segmentWidth = wWidth / gridX;
            var segmentHeight = wHeight / gridY;
            var widthHalf = wWidth / 2;
            var heightHalf = wHeight / 2;
            var depthHalf = wDepth / 2;
            var gridX1 = gridX + 1;
            var gridY1 = gridY + 1;
            var vertexCounter = p.length / 3;

            for (var iy = 0; iy < gridY1; iy++) {
                var y = iy * segmentHeight - heightHalf;
                for (var ix = 0; ix < gridX1; ix++) {
                    var x = ix * segmentWidth - widthHalf;
                    var pos = [0, 0, 0];
                    pos[uAxis] = x * udir;
                    pos[vAxis] = y * vdir;
                    pos[wAxis] = depthHalf;
                    p.push(pos[0], pos[1], pos[2]);

                    var norm = [0, 0, 0];
                    norm[wAxis] = wDepth > 0 ? 1 : -1;
                    n.push(norm[0], norm[1], norm[2]);

                    u.push(ix / gridX, 1 - (iy / gridY));
                }
            }

            for (var iy2 = 0; iy2 < gridY; iy2++) {
                for (var ix2 = 0; ix2 < gridX; ix2++) {
                    var a = vertexCounter + ix2 + gridX1 * iy2;
                    var b = vertexCounter + ix2 + gridX1 * (iy2 + 1);
                    var c = vertexCounter + (ix2 + 1) + gridX1 * (iy2 + 1);
                    var d = vertexCounter + (ix2 + 1) + gridX1 * iy2;
                    ind.push(a, b, d);
                    ind.push(b, c, d);
                }
            }
        };

        buildPlane(2, 1, 0, -1, -1, depth, height, width, sz, sy);
        buildPlane(2, 1, 0, 1, -1, depth, height, -width, sz, sy);
        buildPlane(0, 2, 1, 1, 1, width, depth, height, sx, sz);
        buildPlane(0, 2, 1, 1, -1, width, depth, -height, sx, sz);
        buildPlane(0, 1, 2, 1, -1, width, height, depth, sx, sy);
        buildPlane(0, 1, 2, -1, -1, width, height, -depth, sx, sy);

        var built = faoxomgeometry(p, n, u, ind);
        this.attributes = built.attributes;
        this.index = built.index;
        this.parameters = { width: width, height: height, depth: depth, widthSegments: sx, heightSegments: sy, depthSegments: sz };
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { BoxGeometry };
