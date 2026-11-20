import { Light } from "./Light.js";

class AmbientLight extends Light {
    constructor(zalia, zalib) {
        super(zalia, zalib);
        this.type = "AmbientLight";
    }
}

export { AmbientLight };
