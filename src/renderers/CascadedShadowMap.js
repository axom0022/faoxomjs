import { OrthographicCamera } from "../camera/index.js";

class CascadedShadowMap {
    constructor(directionalLight, cascades, maxDistance) {
        this.light = directionalLight;
        this.cascades = cascades || 3;
        this.maxDistance = maxDistance || 100;
        this.breaks = [0.1, 0.3, 1.0];
        this.cameras = [];
        for (var i = 0; i < this.cascades; i++) {
            var cam = new OrthographicCamera(-20, 20, 20, -20, 0.1, this.maxDistance);
            this.cameras.push(cam);
        }
    }
    update(camera) {
        for (var i = 0; i < this.cascades; i++) {
            var dist = this.maxDistance * this.breaks[i];
            this.cameras[i].position.copy(camera.position).addScaledVector(this.light.position, 1);
            this.cameras[i].lookAt(camera.position);
            this.cameras[i].updateMatrixWorld(true);
        }
    }
}

export { CascadedShadowMap };
