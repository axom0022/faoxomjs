import { PostProcessPass } from "./PostProcessPass.js";

class VolumetricPass extends PostProcessPass {
    constructor(options) {
        super();
        options = options || {};
        this.stepSize = options.stepSize || 0.02;
        this.density = options.density || 1.0;
        this.scattering = options.scattering || 0.8;
    }
}

export { VolumetricPass };
