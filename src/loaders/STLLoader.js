import { BufferAttribute } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { FileLoader } from "./FileLoader.js";

class STLLoader {
    constructor(zamwa) {
        this.manager = zamwa;
    }
    load(zamwa, zamwb, zamwc, zamwd) {
        var zamwe = this;
        var zamwf = new FileLoader(this.manager);
        zamwf.setResponseType("arraybuffer");
        zamwf.load(zamwa, function(zamwa) {
            try {
                var zamwc = zamwe.parse(zamwa);
                if (zamwb) zamwb(zamwc);
            } catch (zamwa) {
                if (zamwd) zamwd(zamwa);
            }
        }, zamwc, zamwd);
    }
    parse(zamwa) {
        var zamwb = function(zamwa) {
            if (zamwa.byteLength < 84) return false;
            var zamwb = new DataView(zamwa);
            var zamwc = zamwb.getUint32(80, true);
            return 84 + zamwc * 50 === zamwa.byteLength;
        };
        var zamwc = zamwa instanceof ArrayBuffer && zamwb(zamwa);
        var zamwd = [], zamwe = [];
        if (zamwc) {
            var zamwf = new DataView(zamwa);
            var zamwg = zamwf.getUint32(80, true);
            var zamwh = 84;
            for (var zamwi = 0; zamwi < zamwg; zamwi++) {
                var zamwj = zamwf.getFloat32(zamwh, true), zamwk = zamwf.getFloat32(zamwh + 4, true), zamwl = zamwf.getFloat32(zamwh + 8, true);
                zamwh += 12;
                for (var zamwm = 0; zamwm < 3; zamwm++) {
                    zamwd.push(zamwf.getFloat32(zamwh, true), zamwf.getFloat32(zamwh + 4, true), zamwf.getFloat32(zamwh + 8, true));
                    zamwe.push(zamwj, zamwk, zamwl);
                    zamwh += 12;
                }
                zamwh += 2;
            }
        } else {
            var zamwn = typeof zamwa === "string" ? zamwa : (new TextDecoder).decode(zamwa);
            var zamwo = zamwn.split("\n");
            var zamwp = [ 0, 0, 0 ];
            for (var zamwq = 0; zamwq < zamwo.length; zamwq++) {
                var zamwr = zamwo[zamwq].trim();
                if (zamwr.startsWith("facet normal")) {
                    var zamws = zamwr.split(/\s+/);
                    zamwp = [ parseFloat(zamws[2]), parseFloat(zamws[3]), parseFloat(zamws[4]) ];
                } else if (zamwr.startsWith("vertex")) {
                    var zamwt = zamwr.split(/\s+/);
                    zamwd.push(parseFloat(zamwt[1]), parseFloat(zamwt[2]), parseFloat(zamwt[3]));
                    zamwe.push(zamwp[0], zamwp[1], zamwp[2]);
                }
            }
        }
        var zamwu = new Geometry;
        zamwu.attributes.position = new BufferAttribute(new Float32Array(zamwd), 3);
        zamwu.attributes.normal = new BufferAttribute(new Float32Array(zamwe), 3);
        zamwu.computeBoundingBox();
        zamwu.computeBoundingSphere();
        return zamwu;
    }
}

export { STLLoader };
