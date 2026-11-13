import { faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";
import { faoxomgeometry } from "./faoxomgeometry.js";

class SphereGeometry extends Geometry {
    constructor(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength) { super(); radius = faoxomvalue(radius, 1); widthSegments = Math.max(3, Math.floor(faoxomvalue(widthSegments, 24))); heightSegments = Math.max(2, Math.floor(faoxomvalue(heightSegments, 16))); phiStart = faoxomvalue(phiStart, 0); phiLength = faoxomvalue(phiLength, Math.PI * 2); thetaStart = faoxomvalue(thetaStart, 0); thetaLength = faoxomvalue(thetaLength, Math.PI); var p = [], n = [], u = [], ind = []; for (var y = 0; y <= heightSegments; y++) { var v = y / heightSegments; var theta = thetaStart + v * thetaLength; for (var x = 0; x <= widthSegments; x++) { var uu = x / widthSegments; var phi = phiStart + uu * phiLength; var sx = -radius * Math.cos(phi) * Math.sin(theta); var sy = radius * Math.cos(theta); var sz = radius * Math.sin(phi) * Math.sin(theta); p.push(sx, sy, sz); n.push(sx / radius, sy / radius, sz / radius); u.push(uu, 1 - v); } } for (var iy = 0; iy < heightSegments; iy++) for (var ix = 0; ix < widthSegments; ix++) { var a = iy * (widthSegments + 1) + ix; var b = a + widthSegments + 1; var c = b + 1; var d = a + 1; if (iy !== 0) ind.push(a, b, d); if (iy !== heightSegments - 1) ind.push(b, c, d); } this.attributes = faoxomgeometry(p, n, u, ind).attributes; this.index = ind.length > 65535 ? new Uint32Array(ind) : new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

export { SphereGeometry };
