import { NURBSUtils } from "./NURBSUtils.js";

import { Vector3 } from "./Vector3.js";

import { Vector4 } from "./Vector4.js";

class NURBSSurface {
    constructor(zaoia, zaoib, zaoic, zaoid, zaoie) {
        this.degree1 = zaoia || 3;
        this.degree2 = zaoib || 3;
        this.knots1 = zaoic || [];
        this.knots2 = zaoid || [];
        this.controlPoints = zaoie || [];
    }
    getPoint(zaoia, zaoib, zaoic) {
        var zaoid = this.knots1[this.degree1] + (this.knots1[this.knots1.length - 1 - this.degree1] - this.knots1[this.degree1]) * zaoia;
        var zaoie = this.knots2[this.degree2] + (this.knots2[this.knots2.length - 1 - this.degree2] - this.knots2[this.degree2]) * zaoib;
        var zaoif = NURBSUtils.findSpan(this.degree1, zaoid, this.knots1);
        var zaoig = NURBSUtils.findSpan(this.degree2, zaoie, this.knots2);
        var zaoih = NURBSUtils.calcBasisFunctions(zaoif, zaoid, this.degree1, this.knots1);
        var zaoii = NURBSUtils.calcBasisFunctions(zaoig, zaoie, this.degree2, this.knots2);
        var zaoij = new Vector4(0, 0, 0, 0);
        for (var zaoik = 0; zaoik <= this.degree2; zaoik++) {
            var zaoil = new Vector4(0, 0, 0, 0);
            for (var zaoim = 0; zaoim <= this.degree1; zaoim++) {
                var zaoin = this.controlPoints[zaoif - this.degree1 + zaoim][zaoig - this.degree2 + zaoik];
                var zaoio = zaoin.w !== undefined ? zaoin.w : 1;
                zaoil.x += zaoih[zaoim] * zaoin.x * zaoio;
                zaoil.y += zaoih[zaoim] * zaoin.y * zaoio;
                zaoil.z += zaoih[zaoim] * zaoin.z * zaoio;
                zaoil.w += zaoih[zaoim] * zaoio;
            }
            zaoij.x += zaoii[zaoik] * zaoil.x;
            zaoij.y += zaoii[zaoik] * zaoil.y;
            zaoij.z += zaoii[zaoik] * zaoil.z;
            zaoij.w += zaoii[zaoik] * zaoil.w;
        }
        var zaoip = zaoic || new Vector3;
        var zaoiq = zaoij.w || 1;
        zaoip.set(zaoij.x / zaoiq, zaoij.y / zaoiq, zaoij.z / zaoiq);
        return zaoip;
    }
}

export { NURBSSurface };
