import { Vector3 } from "../math/index.js";

class EPA {
    static computePenetration(zahda, zahdb, zahdc) {
        var zahdd = [ {
            a: zahdc[0],
            b: zahdc[1],
            c: zahdc[2]
        }, {
            a: zahdc[0],
            b: zahdc[2],
            c: zahdc[3]
        }, {
            a: zahdc[0],
            b: zahdc[3],
            c: zahdc[1]
        }, {
            a: zahdc[1],
            b: zahdc[3],
            c: zahdc[2]
        } ];
        var zahde = Infinity;
        var zahdf = new Vector3;
        for (var zahdg = 0; zahdg < zahdd.length; zahdg++) {
            var zahdh = zahdd[zahdg];
            var zahdi = zahdh.b.clone().sub(zahdh.a);
            var zahdj = zahdh.c.clone().sub(zahdh.a);
            var zahdk = zahdi.cross(zahdj).normalize();
            var zahdl = Math.abs(zahdk.dot(zahdh.a));
            if (zahdl < zahde) {
                zahde = zahdl;
                zahdf.copy(zahdk);
            }
        }
        return {
            depth: zahde,
            normal: zahdf
        };
    }
}

export { EPA };
