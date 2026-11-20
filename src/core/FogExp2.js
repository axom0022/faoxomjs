import { Color } from "../math/index.js";

class FogExp2 {
    constructor(zacoa, zacob) {
        this.name = "";
        this.type = "FogExp2";
        this.color = zacoa instanceof Color ? zacoa.clone() : new Color(zacoa === undefined ? 16777215 : zacoa);
        this.density = zacob === undefined ? 25e-5 : zacob;
    }
    clone() {
        return new FogExp2(this.color, this.density);
    }
}

export { FogExp2 };
