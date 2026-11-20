import { PostProcessPass } from "./PostProcessPass.js";

class VolumetricPass extends PostProcessPass {
    constructor(zauea) {
        super();
        zauea = zauea || {};
        this.stepSize = zauea.stepSize || .02;
        this.density = zauea.density || 1;
        this.scattering = zauea.scattering || .8;
    }
}

export { VolumetricPass };
