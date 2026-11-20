import { DirectionalLight } from "../lights/index.js";

import { CascadedShadowMap } from "./CascadedShadowMap.js";

class SunBeam extends DirectionalLight {
    constructor(zauaa, zauab, zauac, zauad, zauae) {
        super(zauaa, zauab);
        this.type = "SunBeam";
        this.elevation = zauac === undefined ? 50 : zauac;
        this.azimuth = zauad === undefined ? 135 : zauad;
        this.sunDistance = zauae === undefined ? 100 : zauae;
        this.cascadeRig = null;
        this.aim(this.elevation, this.azimuth);
    }
    aim(zauaa, zauab) {
        this.elevation = zauaa === undefined ? this.elevation : zauaa;
        this.azimuth = zauab === undefined ? this.azimuth : zauab;
        var zauac = this.elevation * Math.PI / 180, zauad = this.azimuth * Math.PI / 180;
        this.position.set(Math.cos(zauac) * Math.cos(zauad), Math.sin(zauac), Math.cos(zauac) * Math.sin(zauad)).multiplyScalar(this.sunDistance);
        if (this.target) {
            this.target.position.set(0, 0, 0);
            this.target.updateMatrixWorld && this.target.updateMatrixWorld();
        }
        this.updateMatrixWorld && this.updateMatrixWorld();
        return this;
    }
    enableCascades(zauaa, zauab) {
        this.shadow.enabled = true;
        this.shadow.cascades = zauaa || 3;
        this.cascadeRig = new CascadedShadowMap(this, zauaa || 3, zauab === undefined ? 120 : zauab);
        return this.cascadeRig;
    }
}

export { SunBeam };
