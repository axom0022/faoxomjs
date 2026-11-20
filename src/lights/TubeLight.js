import { faoxomvalue } from "../math/index.js";

import { RectAreaLight } from "./RectAreaLight.js";

class TubeLight extends RectAreaLight {
    constructor(zalta, zaltb, zaltc, zaltd) {
        super(zalta, zaltb, faoxomvalue(zaltc, 4), faoxomvalue(zaltd, .25) * 2, {
            shape: "tube",
            radius: zaltd
        });
        this.type = "TubeLight";
        this.length = faoxomvalue(zaltc, 4);
        this.radius = faoxomvalue(zaltd, .25);
        this.power = this.intensity * this.length * Math.PI * Math.PI * this.radius * 2;
    }
    get isAreaLight() {
        return true;
    }
}

export { TubeLight };
