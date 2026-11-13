import { Object3D } from "../core/index.js";
import { Vector3 } from "../math/index.js";

class AudioListener extends Object3D {
    constructor(audioContext) {
        super();
        this.type = "AudioListener";
        this.context = audioContext || (typeof AudioContext !== "undefined" ? new AudioContext() : null);
        this.gain = this.context && this.context.createGain ? this.context.createGain() : null;
        if (this.gain && this.context) this.gain.connect(this.context.destination);
    }
    updateMatrixWorld(force) {
        super.updateMatrixWorld(force);
        if (!this.context || !this.context.listener) return;
        var listener = this.context.listener;
        var pos = this.getWorldPosition(new Vector3());
        var dir = this.getWorldDirection(new Vector3());
        var up = this.up.clone().applyQuaternion(this.quaternion);
        if (listener.positionX) {
            listener.positionX.value = pos.x;
            listener.positionY.value = pos.y;
            listener.positionZ.value = pos.z;
            listener.forwardX.value = dir.x;
            listener.forwardY.value = dir.y;
            listener.forwardZ.value = dir.z;
            listener.upX.value = up.x;
            listener.upY.value = up.y;
            listener.upZ.value = up.z;
        } else if (listener.setPosition) {
            listener.setPosition(pos.x, pos.y, pos.z);
            listener.setOrientation(dir.x, dir.y, dir.z, up.x, up.y, up.z);
        }
    }
}

export { AudioListener };
