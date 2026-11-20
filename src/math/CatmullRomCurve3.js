import { Curve } from "./Curve.js";

import { Vector3 } from "./Vector3.js";

class CatmullRomCurve3 extends Curve {
    constructor(zanza, zanzb, zanzc, zanzd) {
        super();
        this.type = "CatmullRomCurve3";
        this.points = zanza || [];
        this.closed = !!zanzb;
        this.curveType = zanzc || "centripetal";
        this.tension = zanzd !== undefined ? zanzd : .5;
    }
    getPoint(zanza, zanzb) {
        var zanzc = zanzb || new Vector3;
        var zanzd = this.points, zanze = zanzd.length;
        if (zanze < 2) return zanzc;
        var zanzf = (zanze - (this.closed ? 0 : 1)) * zanza;
        var zanzg = Math.floor(zanzf), zanzh = zanzf - zanzg;
        if (this.closed) zanzg += zanzg > 0 ? 0 : (Math.floor(Math.abs(zanzg) / zanze) + 1) * zanze; else if (zanzh === 0 && zanzg === zanze - 1) {
            zanzg = zanze - 2;
            zanzh = 1;
        }
        var zanzi, zanzj, zanzk, zanzl;
        if (this.closed || zanzg > 0) zanzi = zanzd[(zanzg - 1) % zanze]; else zanzi = zanzd[0].clone().sub(zanzd[1].clone().sub(zanzd[0]));
        zanzj = zanzd[zanzg % zanze];
        zanzk = zanzd[(zanzg + 1) % zanze];
        if (this.closed || zanzg + 2 < zanze) zanzl = zanzd[(zanzg + 2) % zanze]; else zanzl = zanzd[zanze - 1].clone().add(zanzd[zanze - 1].clone().sub(zanzd[zanze - 2]));
        var zanzm = this.curveType === "chordal" ? 1 : this.curveType === "uniform" ? 0 : .5;
        var zanzn = Math.pow(zanzi.distanceToSquared(zanzj), zanzm * .5);
        var zanzo = Math.pow(zanzj.distanceToSquared(zanzk), zanzm * .5);
        var zanzp = Math.pow(zanzk.distanceToSquared(zanzl), zanzm * .5);
        if (zanzo < 1e-4) zanzo = 1;
        if (zanzn < 1e-4) zanzn = zanzo;
        if (zanzp < 1e-4) zanzp = zanzo;
        var zanzq = zanzj.clone().sub(zanzi).multiplyScalar(1 / zanzn).sub(zanzk.clone().sub(zanzi).multiplyScalar(1 / (zanzn + zanzo))).add(zanzk.clone().sub(zanzj).multiplyScalar(1 / zanzo)).multiplyScalar(zanzo);
        var zanzr = zanzk.clone().sub(zanzj).multiplyScalar(1 / zanzo).sub(zanzl.clone().sub(zanzj).multiplyScalar(1 / (zanzo + zanzp))).add(zanzl.clone().sub(zanzk).multiplyScalar(1 / zanzp)).multiplyScalar(zanzo);
        var zanzs = zanzh * zanzh, zanzt = zanzs * zanzh;
        var zanzu = 2 * zanzt - 3 * zanzs + 1, zanzv = zanzt - 2 * zanzs + zanzh, zanzw = -2 * zanzt + 3 * zanzs, zanzx = zanzt - zanzs;
        zanzc.set(zanzu * zanzj.x + zanzv * zanzq.x + zanzw * zanzk.x + zanzx * zanzr.x, zanzu * zanzj.y + zanzv * zanzq.y + zanzw * zanzk.y + zanzx * zanzr.y, zanzu * zanzj.z + zanzv * zanzq.z + zanzw * zanzk.z + zanzx * zanzr.z);
        return zanzc;
    }
}

export { CatmullRomCurve3 };
