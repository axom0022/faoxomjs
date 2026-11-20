import { OrthographicCamera } from "../camera/index.js";

class CascadedShadowMap {
    constructor(zasia, zasib, zasic) {
        this.light = zasia;
        this.cascades = zasib || 3;
        this.maxDistance = zasic || 100;
        this.breaks = [ .1, .3, 1 ];
        this.cameras = [];
        for (var zasid = 0; zasid < this.cascades; zasid++) {
            var zasie = new OrthographicCamera(-20, 20, 20, -20, .1, this.maxDistance);
            this.cameras.push(zasie);
        }
    }
    update(zasia) {
        for (var zasib = 0; zasib < this.cascades; zasib++) {
            var zasic = this.maxDistance * this.breaks[zasib];
            this.cameras[zasib].position.copy(zasia.position).addScaledVector(this.light.position, 1);
            this.cameras[zasib].lookAt(zasia.position);
            this.cameras[zasib].updateMatrixWorld(true);
        }
    }
}

export { CascadedShadowMap };
