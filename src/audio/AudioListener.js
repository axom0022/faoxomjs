import { Object3D } from "../core/index.js";

import { Vector3 } from "../math/index.js";

class AudioListener extends Object3D {
    constructor(zabka) {
        super();
        this.type = "AudioListener";
        this.context = zabka || (typeof AudioContext !== "undefined" ? new AudioContext : null);
        this.gain = this.context && this.context.createGain ? this.context.createGain() : null;
        if (this.gain && this.context) this.gain.connect(this.context.destination);
    }
    updateMatrixWorld(zabka) {
        super.updateMatrixWorld(zabka);
        if (!this.context || !this.context.listener) return;
        var zabkb = this.context.listener;
        var zabkc = this.getWorldPosition(new Vector3);
        var zabkd = this.getWorldDirection(new Vector3);
        var zabke = this.up.clone().applyQuaternion(this.quaternion);
        if (zabkb.positionX) {
            zabkb.positionX.value = zabkc.x;
            zabkb.positionY.value = zabkc.y;
            zabkb.positionZ.value = zabkc.z;
            zabkb.forwardX.value = zabkd.x;
            zabkb.forwardY.value = zabkd.y;
            zabkb.forwardZ.value = zabkd.z;
            zabkb.upX.value = zabke.x;
            zabkb.upY.value = zabke.y;
            zabkb.upZ.value = zabke.z;
        } else if (zabkb.setPosition) {
            zabkb.setPosition(zabkc.x, zabkc.y, zabkc.z);
            zabkb.setOrientation(zabkd.x, zabkd.y, zabkd.z, zabke.x, zabke.y, zabke.z);
        }
    }
}

export { AudioListener };
