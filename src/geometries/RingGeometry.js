import { faoxomvalue } from "../math/index.js";
import { Geometry } from "./Geometry.js";
import { faoxomgeometry } from "./faoxomgeometry.js";

class RingGeometry extends Geometry {
    constructor(innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength) { super(); innerRadius = faoxomvalue(innerRadius, 0.25); outerRadius = faoxomvalue(outerRadius, 0.5); thetaSegments = Math.max(3, Math.floor(faoxomvalue(thetaSegments, 16))); phiSegments = Math.max(1, Math.floor(faoxomvalue(phiSegments, 1))); thetaStart = faoxomvalue(thetaStart, 0); thetaLength = faoxomvalue(thetaLength, Math.PI * 2); var p = [], n = [], u = [], ind = []; for (var y = 0; y <= phiSegments; y++) for (var x = 0; x <= thetaSegments; x++) { var r = innerRadius + (outerRadius - innerRadius) * y / phiSegments; var a = thetaStart + thetaLength * x / thetaSegments; p.push(r * Math.cos(a), r * Math.sin(a), 0); n.push(0, 0, 1); u.push(x / thetaSegments, y / phiSegments); } for (var yy = 0; yy < phiSegments; yy++) for (var xx = 0; xx < thetaSegments; xx++) { var a0 = yy * (thetaSegments + 1) + xx; var a1 = a0 + 1; var b0 = a0 + thetaSegments + 1; var b1 = b0 + 1; ind.push(a0, b0, a1, a1, b0, b1); } this.attributes = faoxomgeometry(p, n, u, ind).attributes; this.index = new Uint16Array(ind); this.computeBoundingBox(); this.computeBoundingSphere(); }
}

export { RingGeometry };
