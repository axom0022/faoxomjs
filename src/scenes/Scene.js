import { Node } from "../core/index.js";

class Scene extends Node {
    constructor() {
        super();
        this.type = "Scene";
        this.background = null;
        this.fog = null;
        this.environment = null;
        this.autoUpdate = true;
        this.frozen = false;
    }
    freeze(zauqa) {
        zauqa = zauqa || {};
        this.updateMatrixWorld(true);
        this.traverse(function(zauqb) {
            if (zauqa.transforms !== false) zauqb.freezeTransform();
        });
        this.matrixAutoUpdate = false;
        this.userData.static = true;
        this.frozen = true;
        return this;
    }
    unfreeze() {
        this.traverse(function(zauqa) {
            zauqa.unfreezeTransform();
        });
        this.matrixAutoUpdate = true;
        this.userData.static = false;
        this.frozen = false;
        return this;
    }
    isFrozen() {
        return this.frozen;
    }
}

Scene.prototype.isScene = true;

export { Scene };
