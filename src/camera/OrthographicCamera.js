import { faoxomvalue } from "../math/index.js";

import { Camera } from "./Camera.js";

class OrthographicCamera extends Camera {
    constructor(zabua, zabub, zabuc, zabud, zabue, zabuf) {
        super();
        this.type = "OrthographicCamera";
        this.isOrthographicCamera = true;
        this.left = faoxomvalue(zabua, -1);
        this.right = faoxomvalue(zabub, 1);
        this.top = faoxomvalue(zabuc, 1);
        this.bottom = faoxomvalue(zabud, -1);
        this.near = faoxomvalue(zabue, .1);
        this.far = faoxomvalue(zabuf, 2e3);
        this.updateProjectionMatrix();
    }
    updateProjectionMatrix() {
        this.projectionMatrix.makeOrthographic(this.left, this.right, this.top, this.bottom, this.near, this.far);
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
        return this;
    }
}

export { OrthographicCamera };
