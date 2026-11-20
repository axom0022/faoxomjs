import { faoxomvalue } from "../math/index.js";

import { Geometry } from "./Geometry.js";

import { faoxomgeometry } from "./faoxomgeometry.js";

class BoxGeometry extends Geometry {
    constructor(zajza, zajzb, zajzc, zajzd, zajze, zajzf) {
        super();
        zajza = faoxomvalue(zajza, 1);
        zajzb = faoxomvalue(zajzb, 1);
        zajzc = faoxomvalue(zajzc, 1);
        zajzd = Math.max(1, Math.floor(faoxomvalue(zajzd, 1)));
        zajze = Math.max(1, Math.floor(faoxomvalue(zajze, 1)));
        zajzf = Math.max(1, Math.floor(faoxomvalue(zajzf, 1)));
        var zajzg = [], zajzh = [], zajzi = [], zajzj = [];
        var zajzk = function(zajza, zajzb, zajzc, zajzd, zajze, zajzf, zajzk, zajzl, zajzm, zajzn) {
            var zajzo = zajzf / zajzm;
            var zajzp = zajzk / zajzn;
            var zajzq = zajzf / 2;
            var zajzr = zajzk / 2;
            var zajzs = zajzl / 2;
            var zajzt = zajzm + 1;
            var zajzu = zajzn + 1;
            var zajzv = zajzg.length / 3;
            for (var zajzw = 0; zajzw < zajzu; zajzw++) {
                var zajzx = zajzw * zajzp - zajzr;
                for (var zajzy = 0; zajzy < zajzt; zajzy++) {
                    var zajzz = zajzy * zajzo - zajzq;
                    var zajzaa = [ 0, 0, 0 ];
                    zajzaa[zajza] = zajzz * zajzd;
                    zajzaa[zajzb] = zajzx * zajze;
                    zajzaa[zajzc] = zajzs;
                    zajzg.push(zajzaa[0], zajzaa[1], zajzaa[2]);
                    var zajzab = [ 0, 0, 0 ];
                    zajzab[zajzc] = zajzl > 0 ? 1 : -1;
                    zajzh.push(zajzab[0], zajzab[1], zajzab[2]);
                    zajzi.push(zajzy / zajzm, 1 - zajzw / zajzn);
                }
            }
            for (var zajzac = 0; zajzac < zajzn; zajzac++) {
                for (var zajzad = 0; zajzad < zajzm; zajzad++) {
                    var zajzae = zajzv + zajzad + zajzt * zajzac;
                    var zajzaf = zajzv + zajzad + zajzt * (zajzac + 1);
                    var zajzag = zajzv + (zajzad + 1) + zajzt * (zajzac + 1);
                    var zajzah = zajzv + (zajzad + 1) + zajzt * zajzac;
                    zajzj.push(zajzae, zajzaf, zajzah);
                    zajzj.push(zajzaf, zajzag, zajzah);
                }
            }
        };
        zajzk(2, 1, 0, -1, -1, zajzc, zajzb, zajza, zajzf, zajze);
        zajzk(2, 1, 0, 1, -1, zajzc, zajzb, -zajza, zajzf, zajze);
        zajzk(0, 2, 1, 1, 1, zajza, zajzc, zajzb, zajzd, zajzf);
        zajzk(0, 2, 1, 1, -1, zajza, zajzc, -zajzb, zajzd, zajzf);
        zajzk(0, 1, 2, 1, -1, zajza, zajzb, zajzc, zajzd, zajze);
        zajzk(0, 1, 2, -1, -1, zajza, zajzb, -zajzc, zajzd, zajze);
        var zajzl = faoxomgeometry(zajzg, zajzh, zajzi, zajzj);
        this.attributes = zajzl.attributes;
        this.index = zajzl.index;
        this.parameters = {
            width: zajza,
            height: zajzb,
            depth: zajzc,
            widthSegments: zajzd,
            heightSegments: zajze,
            depthSegments: zajzf
        };
        this.computeBoundingBox();
        this.computeBoundingSphere();
    }
}

export { BoxGeometry };
