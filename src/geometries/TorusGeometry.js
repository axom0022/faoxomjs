import { faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";
import { faoxomgeometry } from "./faoxomgeometry.js";

class TorusGeometry extends Geometry {
    constructor(radius, tube, radialSegments, tubularSegments, arc) { super(); radius = faoxomvalue(radius, 1); tube = faoxomvalue(tube, 0.4); radialSegments = Math.max(3, Math.floor(faoxomvalue(radialSegments, 12))); tubularSegments = Math.max(3, Math.floor(faoxomvalue(tubularSegments, 24))); arc = faoxomvalue(arc, Math.PI * 2); var p = [], n = [], u = [], ind = []; for (var j = 0; j <= radialSegments; j++) for (var i = 0; i <= tubularSegments; i++) { var uu = i / tubularSegments * arc; var vv = j / radialSegments * Math.PI * 2; var cx = radius * Math.cos(uu); var cy = radius * Math.sin(uu); var nx = Math.cos(uu) * Math.cos(vv); var ny = Math.sin(uu) * Math.cos(vv); var nz = Math.sin(vv); p.push(cx + tube * nx, tube * nz, cy + tube * ny); n.push(nx, nz, ny); u.push(i / tubularSegments, j / radialSegments); } for (var y = 1; y <= radialSegments; y++) for (var x = 1; x <= tubularSegments; x++) { var a = (tubularSegments + 1) * (y - 1) + x - 1; var b = (tubularSegments + 1) * y + x - 1; var c = (tubularSegments + 1) * y + x; var d = (tubularSegments + 1) * (y - 1) + x; ind.push(a, b, d, b, c, d); } this.attributes = faoxomgeometry(p, n, u, ind).attributes; this.index = ind.length > 65535 ? new Uint32Array(ind) : new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

export { TorusGeometry };
