import { Curve } from "./Curve.js";

import { Vector3 } from "./Vector3.js";

class CubicBezierCurve3 extends Curve {
    constructor(zaoba, zaobb, zaobc, zaobd) {
        super();
        this.type = "CubicBezierCurve3";
        this.v0 = zaoba || new Vector3;
        this.v1 = zaobb || new Vector3;
        this.v2 = zaobc || new Vector3;
        this.v3 = zaobd || new Vector3;
    }
    getPoint(zaoba, zaobb) {
        var zaobc = zaobb || new Vector3;
        var zaobd = 1 - zaoba, zaobe = zaoba * zaoba, zaobf = zaobd * zaobd, zaobg = zaobf * zaobd, zaobh = zaobe * zaoba;
        zaobc.x = zaobg * this.v0.x + 3 * zaobf * zaoba * this.v1.x + 3 * zaobd * zaobe * this.v2.x + zaobh * this.v3.x;
        zaobc.y = zaobg * this.v0.y + 3 * zaobf * zaoba * this.v1.y + 3 * zaobd * zaobe * this.v2.y + zaobh * this.v3.y;
        zaobc.z = zaobg * this.v0.z + 3 * zaobf * zaoba * this.v1.z + 3 * zaobd * zaobe * this.v2.z + zaobh * this.v3.z;
        return zaobc;
    }
}

export { CubicBezierCurve3 };
