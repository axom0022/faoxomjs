import { Node } from "../core/index.js";

class Scene extends Node { constructor() { super(); this.type = "Scene"; this.background = null; this.fog = null; this.environment = null; this.autoUpdate = true; this.frozen = false; }
    freeze(options) { options = options || {}; this.updateMatrixWorld(true); this.traverse(function(object) { if (options.transforms !== false) object.freezeTransform(); }); this.matrixAutoUpdate = false; this.userData.static = true; this.frozen = true; return this; }
    unfreeze() { this.traverse(function(object) { object.unfreezeTransform(); }); this.matrixAutoUpdate = true; this.userData.static = false; this.frozen = false; return this; }
    isFrozen() { return this.frozen; }
}
Scene.prototype.isScene = true;

export { Scene };
