import { DirectionalLight } from "../lights/index.js";
import { CascadedShadowMap } from "./CascadedShadowMap.js";

class SunBeam extends DirectionalLight {
    constructor(color, intensity, elevation, azimuth, distance) {
        super(color, intensity);
        this.type = "SunBeam";
        this.elevation = elevation === undefined ? 50 : elevation;
        this.azimuth = azimuth === undefined ? 135 : azimuth;
        this.sunDistance = distance === undefined ? 100 : distance;
        this.cascadeRig = null;
        this.aim(this.elevation, this.azimuth);
    }
    aim(elevation, azimuth) {
        this.elevation = elevation === undefined ? this.elevation : elevation;
        this.azimuth = azimuth === undefined ? this.azimuth : azimuth;
        var el = this.elevation * Math.PI / 180, az = this.azimuth * Math.PI / 180;
        this.position.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(this.sunDistance);
        if (this.target) { this.target.position.set(0, 0, 0); this.target.updateMatrixWorld && this.target.updateMatrixWorld(); }
        this.updateMatrixWorld && this.updateMatrixWorld();
        return this;
    }
    enableCascades(cascades, maxDistance) {
        this.shadow.enabled = true;
        this.shadow.cascades = cascades || 3;
        this.cascadeRig = new CascadedShadowMap(this, cascades || 3, maxDistance === undefined ? 120 : maxDistance);
        return this.cascadeRig;
    }
}

export { SunBeam };
