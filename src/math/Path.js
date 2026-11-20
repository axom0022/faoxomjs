import { Vector2 } from "./Vector2.js";

import { faoxomcatmullrompoint } from "./faoxomcatmullrompoint.js";

import { faoxomellipsecurvepoint } from "./faoxomellipsecurvepoint.js";

class Path {
    constructor(zaoka) {
        this.type = "Path";
        this.currentPoint = new Vector2;
        this.curves = [];
        this.autoClose = false;
        if (zaoka) this.setFromPoints(zaoka);
    }
    setFromPoints(zaoka) {
        this.moveTo(zaoka[0].x, zaoka[0].y);
        for (var zaokb = 1; zaokb < zaoka.length; zaokb++) this.lineTo(zaoka[zaokb].x, zaoka[zaokb].y);
        return this;
    }
    moveTo(zaoka, zaokb) {
        this.currentPoint.set(zaoka, zaokb);
        return this;
    }
    lineTo(zaoka, zaokb) {
        this.curves.push({
            type: "line",
            v1: this.currentPoint.clone(),
            v2: new Vector2(zaoka, zaokb)
        });
        this.currentPoint.set(zaoka, zaokb);
        return this;
    }
    quadraticCurveTo(zaoka, zaokb, zaokc, zaokd) {
        this.curves.push({
            type: "quadratic",
            v0: this.currentPoint.clone(),
            v1: new Vector2(zaoka, zaokb),
            v2: new Vector2(zaokc, zaokd)
        });
        this.currentPoint.set(zaokc, zaokd);
        return this;
    }
    bezierCurveTo(zaoka, zaokb, zaokc, zaokd, zaoke, zaokf) {
        this.curves.push({
            type: "bezier",
            v0: this.currentPoint.clone(),
            v1: new Vector2(zaoka, zaokb),
            v2: new Vector2(zaokc, zaokd),
            v3: new Vector2(zaoke, zaokf)
        });
        this.currentPoint.set(zaoke, zaokf);
        return this;
    }
    absarc(zaoka, zaokb, zaokc, zaokd, zaoke, zaokf) {
        return this.absellipse(zaoka, zaokb, zaokc, zaokc, zaokd, zaoke, zaokf, 0);
    }
    absellipse(zaoka, zaokb, zaokc, zaokd, zaoke, zaokf, zaokg, zaokh) {
        this.curves.push({
            type: "arc",
            cx: zaoka,
            cy: zaokb,
            xRadius: zaokc,
            yRadius: zaokd,
            startAngle: zaoke,
            endAngle: zaokf,
            clockwise: !!zaokg,
            rotation: zaokh || 0
        });
        faoxomellipsecurvepoint(zaoka, zaokb, zaokc, zaokd, zaoke, zaokf, !!zaokg, zaokh || 0, 1, this.currentPoint);
        return this;
    }
    splineThru(zaoka) {
        var zaokb = [ this.currentPoint.clone() ].concat(zaoka || []);
        this.curves.push({
            type: "spline",
            points: zaokb
        });
        this.currentPoint.copy(zaokb[zaokb.length - 1]);
        return this;
    }
    closePath() {
        if (this.curves.length) {
            var zaoka = this.curves[0].v0 || this.curves[0].v1;
            if (zaoka && (this.currentPoint.x !== zaoka.x || this.currentPoint.y !== zaoka.y)) this.lineTo(zaoka.x, zaoka.y);
        }
        return this;
    }
    getPoints(zaoka) {
        var zaokb = zaoka || 12, zaokc = [], zaokd = null, zaoke = new Vector2;
        for (var zaokf = 0; zaokf < this.curves.length; zaokf++) {
            var zaokg = this.curves[zaokf];
            var zaokh = zaokg.type === "arc" ? zaokb * 2 : zaokg.type === "line" ? 1 : zaokg.type === "spline" ? zaokb * zaokg.points.length : zaokb;
            var zaoki = [];
            if (zaokg.type === "line") {
                zaoki.push(zaokg.v1.clone(), zaokg.v2.clone());
            } else if (zaokg.type === "quadratic") {
                for (var zaokj = 0; zaokj <= zaokh; zaokj++) {
                    var zaokk = zaokj / zaokh, zaokl = 1 - zaokk;
                    zaoki.push(new Vector2(zaokl * zaokl * zaokg.v0.x + 2 * zaokl * zaokk * zaokg.v1.x + zaokk * zaokk * zaokg.v2.x, zaokl * zaokl * zaokg.v0.y + 2 * zaokl * zaokk * zaokg.v1.y + zaokk * zaokk * zaokg.v2.y));
                }
            } else if (zaokg.type === "bezier") {
                for (var zaokm = 0; zaokm <= zaokh; zaokm++) {
                    var zaokn = zaokm / zaokh, zaoko = 1 - zaokn, zaokp = zaoko * zaoko, zaokq = zaokp * zaoko, zaokr = zaokn * zaokn, zaoks = zaokr * zaokn;
                    zaoki.push(new Vector2(zaokq * zaokg.v0.x + 3 * zaokp * zaokn * zaokg.v1.x + 3 * zaoko * zaokr * zaokg.v2.x + zaoks * zaokg.v3.x, zaokq * zaokg.v0.y + 3 * zaokp * zaokn * zaokg.v1.y + 3 * zaoko * zaokr * zaokg.v2.y + zaoks * zaokg.v3.y));
                }
            } else if (zaokg.type === "arc") {
                for (var zaokt = 0; zaokt <= zaokh; zaokt++) zaoki.push(faoxomellipsecurvepoint(zaokg.cx, zaokg.cy, zaokg.xRadius, zaokg.yRadius, zaokg.startAngle, zaokg.endAngle, zaokg.clockwise, zaokg.rotation, zaokt / zaokh, new Vector2).clone());
            } else if (zaokg.type === "spline") {
                for (var zaoku = 0; zaoku <= zaokh; zaoku++) zaoki.push(faoxomcatmullrompoint(zaokg.points, zaoku / zaokh, zaoke).clone());
            }
            for (var zaokv = 0; zaokv < zaoki.length; zaokv++) {
                if (zaokd && zaokd.equals(zaoki[zaokv])) continue;
                zaokc.push(zaoki[zaokv]);
                zaokd = zaoki[zaokv];
            }
        }
        if (this.autoClose && zaokc.length > 1 && !zaokc[zaokc.length - 1].equals(zaokc[0])) zaokc.push(zaokc[0].clone());
        return zaokc;
    }
}

export { Path };
