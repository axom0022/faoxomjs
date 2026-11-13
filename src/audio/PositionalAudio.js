import { Object3D } from "../core/index.js";
import { Vector3 } from "../math/index.js";

class PositionalAudio extends Object3D {
    constructor(listener) {
        super();
        this.type = "PositionalAudio";
        this.listener = listener;
        this.context = listener ? listener.context : null;
        this.panner = this.context && this.context.createPanner ? this.context.createPanner() : null;
        if (this.panner) {
            this.panner.panningModel = "HRTF";
            this.panner.distanceModel = "inverse";
            this.panner.refDistance = 1;
            this.panner.maxDistance = 1000;
            this.panner.rolloffFactor = 1;
            this.panner.coneInnerAngle = 360;
            this.panner.coneOuterAngle = 0;
            this.panner.coneOuterGain = 0;
            if (listener && listener.gain) this.panner.connect(listener.gain);
        }
    }
    setRefDistance(value) { if (this.panner) this.panner.refDistance = value; return this; }
    setMaxDistance(value) { if (this.panner) this.panner.maxDistance = value; return this; }
    setRolloffFactor(value) { if (this.panner) this.panner.rolloffFactor = value; return this; }
    updateMatrixWorld(force) {
        super.updateMatrixWorld(force);
        if (!this.panner) return;
        var pos = this.getWorldPosition(new Vector3());
        var dir = this.getWorldDirection(new Vector3());
        if (this.panner.positionX) {
            this.panner.positionX.value = pos.x;
            this.panner.positionY.value = pos.y;
            this.panner.positionZ.value = pos.z;
            this.panner.orientationX.value = dir.x;
            this.panner.orientationY.value = dir.y;
            this.panner.orientationZ.value = dir.z;
        } else if (this.panner.setPosition) {
            this.panner.setPosition(pos.x, pos.y, pos.z);
            this.panner.setOrientation(dir.x, dir.y, dir.z);
        }
    }
}

export { PositionalAudio };
