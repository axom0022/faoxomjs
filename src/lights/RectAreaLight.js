import { faoxomvalue } from "../math/index.js";

import { Light } from "./Light.js";

class RectAreaLight extends Light {
    constructor(zalra, zalrb, zalrc, zalrd, zalre) {
        super(zalra, zalrb);
        zalre = zalre || {};
        this.type = "RectAreaLight";
        this.width = faoxomvalue(zalrc, 10);
        this.height = faoxomvalue(zalrd, 10);
        this.shape = zalre.shape === "tube" ? "tube" : "rect";
        this.radius = faoxomvalue(zalre.radius, .25);
        this.emissiveMap = zalre.emissiveMap || null;
        this.doubleSided = zalre.doubleSided === true;
        this.power = this.intensity * this.width * this.height * Math.PI;
    }
    setShape(zalra) {
        this.shape = zalra === "tube" ? "tube" : "rect";
        return this;
    }
    get isAreaLight() {
        return true;
    }
}

export { RectAreaLight };
