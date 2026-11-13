import { faoxomvalue } from "../math/index.js";
import { Camera } from "./Camera.js";

class OrthographicCamera extends Camera {
    constructor(left, right, top, bottom, near, far) { super(); this.type = "OrthographicCamera"; this.isOrthographicCamera = true; this.left = faoxomvalue(left, -1); this.right = faoxomvalue(right, 1); this.top = faoxomvalue(top, 1); this.bottom = faoxomvalue(bottom, -1); this.near = faoxomvalue(near, 0.1); this.far = faoxomvalue(far, 2000); this.updateProjectionMatrix(); }
    updateProjectionMatrix() { this.projectionMatrix.makeOrthographic(this.left, this.right, this.top, this.bottom, this.near, this.far); this.projectionMatrixInverse.copy(this.projectionMatrix).invert(); return this; }
}

export { OrthographicCamera };
