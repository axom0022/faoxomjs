import { faoxomvalue } from "../math/index.js";
import { Camera } from "./Camera.js";

class PerspectiveCamera extends Camera {
    constructor(fov, aspect, near, far) { super(); this.type = "PerspectiveCamera"; this.isPerspectiveCamera = true; this.fov = faoxomvalue(fov, 50); this.aspect = faoxomvalue(aspect, 1); this.near = faoxomvalue(near, 0.1); this.far = faoxomvalue(far, 2000); this.updateProjectionMatrix(); }
    updateProjectionMatrix() { this.projectionMatrix.makePerspective(this.fov, this.aspect, this.near, this.far); this.projectionMatrixInverse.copy(this.projectionMatrix).invert(); return this; }
}

export { PerspectiveCamera };
