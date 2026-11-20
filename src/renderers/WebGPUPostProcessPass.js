import { faoxomvalue } from "../math/index.js";

class WebGPUPostProcessPass {
    constructor(zauka, zaukb, zaukc) {
        zaukc = zaukc || {};
        this.name = zauka || "pass";
        this.body = zaukb;
        this.enabled = zaukc.enabled !== false;
        this.exposure = faoxomvalue(zaukc.exposure, 1);
        this.strength = faoxomvalue(zaukc.strength, 1);
        this.threshold = faoxomvalue(zaukc.threshold, .8);
    }
}

export { WebGPUPostProcessPass };
