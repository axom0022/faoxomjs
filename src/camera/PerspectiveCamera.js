import { faoxomvalue } from "../math/index.js";

import { Camera } from "./Camera.js";

class PerspectiveCamera extends Camera {
    constructor(zabva, zabvb, zabvc, zabvd) {
        super();
        this.type = "PerspectiveCamera";
        this.isPerspectiveCamera = true;
        this.fov = faoxomvalue(zabva, 50);
        this.aspect = faoxomvalue(zabvb, 1);
        this.near = faoxomvalue(zabvc, .1);
        this.far = faoxomvalue(zabvd, 2e3);
        this.updateProjectionMatrix();
    }
    updateProjectionMatrix() {
        this.projectionMatrix.makePerspective(this.fov, this.aspect, this.near, this.far);
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
        return this;
    }
}

export { PerspectiveCamera };
