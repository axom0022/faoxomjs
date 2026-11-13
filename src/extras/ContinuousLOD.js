import { Object3D } from "../core/index.js";
import { Vector3 } from "../math/index.js";

class ContinuousLOD extends Object3D {
    constructor() {
        super();
        this.type = "ContinuousLOD";
        this.levels = [];
        this.activeLevel = 0;
    }
    addLevel(object, screenSpaceError) {
        this.levels.push({ object: object, error: screenSpaceError || 0 });
        this.levels.sort(function(a, b) { return a.error - b.error; });
        this.add(object);
        return this;
    }
    update(camera, viewportHeight) {
        var h = viewportHeight || 720;
        var dist = this.getWorldPosition(new Vector3()).distanceTo(camera.getWorldPosition(new Vector3()));
        var fov = (camera.fov || 50) * Math.PI / 180;
        var sse = (1.0 * h) / (2.0 * Math.max(0.1, dist) * Math.tan(fov / 2.0));
        var chosen = 0;
        for (var i = this.levels.length - 1; i >= 0; i--) {
            if (sse >= this.levels[i].error) { chosen = i; break; }
        }
        this.activeLevel = chosen;
        for (var l = 0; l < this.levels.length; l++) {
            this.levels[l].object.visible = (l === chosen);
        }
    }
}

export { ContinuousLOD };
