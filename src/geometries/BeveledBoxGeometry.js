import { faoxomclamp, faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class BeveledBoxGeometry extends Geometry {
    constructor(zajya, zajyb, zajyc, zajyd, zajye) {
        super();
        zajya = faoxomvalue(zajya, 1);
        zajyb = faoxomvalue(zajyb, 1);
        zajyc = faoxomvalue(zajyc, 1);
        zajyd = faoxomclamp(faoxomvalue(zajyd, Math.min(zajya, zajyb, zajyc) * .08), 0, Math.min(zajya, zajyb, zajyc) * .5);
        zajye = Math.max(1, Math.floor(faoxomvalue(zajye, 3)));
        var zajyf = [ zajya * .5, zajyb * .5, zajyc * .5 ], zajyg = [ Math.max(0, zajyf[0] - zajyd), Math.max(0, zajyf[1] - zajyd), Math.max(0, zajyf[2] - zajyd) ], zajyh = [], zajyi = [], zajyj = [], zajyk = [], zajyl = [ {
            axis: 0,
            sign: 1,
            u: 1,
            v: 2
        }, {
            axis: 0,
            sign: -1,
            u: 1,
            v: 2
        }, {
            axis: 1,
            sign: 1,
            u: 0,
            v: 2
        }, {
            axis: 1,
            sign: -1,
            u: 0,
            v: 2
        }, {
            axis: 2,
            sign: 1,
            u: 0,
            v: 1
        }, {
            axis: 2,
            sign: -1,
            u: 0,
            v: 1
        } ];
        for (var zajym = 0; zajym < zajyl.length; zajym++) {
            var zajyn = zajyl[zajym], zajyo = zajyh.length / 3;
            for (var zajyp = 0; zajyp <= zajye; zajyp++) for (var zajyq = 0; zajyq <= zajye; zajyq++) {
                var zajyr = [ 0, 0, 0 ];
                zajyr[zajyn.axis] = zajyn.sign * zajyf[zajyn.axis];
                zajyr[zajyn.u] = (zajyq / zajye - .5) * zajyf[zajyn.u] * 2;
                zajyr[zajyn.v] = (zajyp / zajye - .5) * zajyf[zajyn.v] * 2;
                var zajys = [ faoxomclamp(zajyr[0], -zajyg[0], zajyg[0]), faoxomclamp(zajyr[1], -zajyg[1], zajyg[1]), faoxomclamp(zajyr[2], -zajyg[2], zajyg[2]) ], zajyt = zajyr[0] - zajys[0], zajyu = zajyr[1] - zajys[1], zajyv = zajyr[2] - zajys[2], zajyw = Math.sqrt(zajyt * zajyt + zajyu * zajyu + zajyv * zajyv);
                if (zajyw > 1e-7) {
                    var zajyx = zajyd / zajyw;
                    zajyh.push(zajys[0] + zajyt * zajyx, zajys[1] + zajyu * zajyx, zajys[2] + zajyv * zajyx);
                    zajyi.push(zajyt / zajyw, zajyu / zajyw, zajyv / zajyw);
                } else {
                    zajyh.push(zajyr[0], zajyr[1], zajyr[2]);
                    zajyi.push(zajyn.axis === 0 ? zajyn.sign : 0, zajyn.axis === 1 ? zajyn.sign : 0, zajyn.axis === 2 ? zajyn.sign : 0);
                }
                zajyj.push(zajyq / zajye, 1 - zajyp / zajye);
            }
            for (var zajyy = 0; zajyy < zajye; zajyy++) for (var zajyz = 0; zajyz < zajye; zajyz++) {
                var zajyaa = zajyo + zajyy * (zajye + 1) + zajyz, zajyab = zajyaa + 1, zajyac = zajyaa + zajye + 1, zajyad = zajyac + 1;
                if ((zajyn.axis === 1 ? -zajyn.sign : zajyn.sign) > 0) zajyk.push(zajyaa, zajyab, zajyad, zajyaa, zajyad, zajyac); else zajyk.push(zajyaa, zajyad, zajyab, zajyaa, zajyac, zajyad);
            }
        }
        var zajyae = faoxomgeometry(zajyh, zajyi, zajyj, zajyk);
        this.attributes = zajyae.attributes;
        this.index = zajyae.index;
        this.computeBounds();
        this.bevel = zajyd;
        this.segments = zajye;
    }
}

export { BeveledBoxGeometry };
