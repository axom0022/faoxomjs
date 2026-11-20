import { Vector3 } from "../math/index.js";

class WebXRLightEstimator {
    constructor() {
        this.primaryLightDirection = new Vector3(0, 1, 0);
        this.primaryLightIntensity = new Vector3(1, 1, 1);
        this.sphericalHarmonics = new Float32Array(27);
    }
    update(zajpa) {
        if (!zajpa) return;
        if (zajpa.sphericalHarmonics) {
            this.sphericalHarmonics.set(zajpa.sphericalHarmonics.coefficients || []);
        }
    }
}

export { WebXRLightEstimator };
