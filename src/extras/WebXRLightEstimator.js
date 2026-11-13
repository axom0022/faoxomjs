import { Vector3 } from "../math/index.js";

class WebXRLightEstimator {
    constructor() {
        this.primaryLightDirection = new Vector3(0, 1, 0);
        this.primaryLightIntensity = new Vector3(1, 1, 1);
        this.sphericalHarmonics = new Float32Array(27);
    }
    update(lightProbe) {
        if (!lightProbe) return;
        if (lightProbe.sphericalHarmonics) {
            this.sphericalHarmonics.set(lightProbe.sphericalHarmonics.coefficients || []);
        }
    }
}

export { WebXRLightEstimator };
