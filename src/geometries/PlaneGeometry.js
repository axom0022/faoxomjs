import { faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";
import { faoxomgeometry } from "./faoxomgeometry.js";

class PlaneGeometry extends Geometry {
    constructor(width, height, sx, sy) { super(); width = faoxomvalue(width, 1); height = faoxomvalue(height, 1); sx = Math.max(1, Math.floor(faoxomvalue(sx, 1))); sy = Math.max(1, Math.floor(faoxomvalue(sy, 1))); var p = [], n = [], u = [], ind = []; for (var iy = 0; iy <= sy; iy++) for (var ix = 0; ix <= sx; ix++) { p.push((ix / sx - 0.5) * width, (iy / sy - 0.5) * height, 0); n.push(0, 0, 1); u.push(ix / sx, iy / sy); } for (var y = 0; y < sy; y++) for (var x = 0; x < sx; x++) { var a = y * (sx + 1) + x; var b = a + 1; var c = a + sx + 1; var d = c + 1; ind.push(a, b, d, a, d, c); } this.attributes = faoxomgeometry(p, n, u, ind).attributes; this.index = new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

export { PlaneGeometry };
