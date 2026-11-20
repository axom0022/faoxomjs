import { Object3D } from "../core/index.js";

import { Vector3 } from "../math/index.js";

class ContinuousLOD extends Object3D {
    constructor() {
        super();
        this.type = "ContinuousLOD";
        this.levels = [];
        this.activeLevel = 0;
    }
    addLevel(zagta, zagtb) {
        this.levels.push({
            object: zagta,
            error: zagtb || 0
        });
        this.levels.sort(function(zagta, zagtb) {
            return zagta.error - zagtb.error;
        });
        this.add(zagta);
        return this;
    }
    update(zagta, zagtb) {
        var zagtc = zagtb || 720;
        var zagtd = this.getWorldPosition(new Vector3).distanceTo(zagta.getWorldPosition(new Vector3));
        var zagte = (zagta.fov || 50) * Math.PI / 180;
        var zagtf = 1 * zagtc / (2 * Math.max(.1, zagtd) * Math.tan(zagte / 2));
        var zagtg = 0;
        for (var zagth = this.levels.length - 1; zagth >= 0; zagth--) {
            if (zagtf >= this.levels[zagth].error) {
                zagtg = zagth;
                break;
            }
        }
        this.activeLevel = zagtg;
        for (var zagti = 0; zagti < this.levels.length; zagti++) {
            this.levels[zagti].object.visible = zagti === zagtg;
        }
    }
}

export { ContinuousLOD };
