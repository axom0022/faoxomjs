import { Object3D } from "../core/index.js";

import { Vector3 } from "../math/index.js";

class PositionalAudio extends Object3D {
    constructor(zabla) {
        super();
        this.type = "PositionalAudio";
        this.listener = zabla;
        this.context = zabla ? zabla.context : null;
        this.panner = this.context && this.context.createPanner ? this.context.createPanner() : null;
        if (this.panner) {
            this.panner.panningModel = "HRTF";
            this.panner.distanceModel = "inverse";
            this.panner.refDistance = 1;
            this.panner.maxDistance = 1e3;
            this.panner.rolloffFactor = 1;
            this.panner.coneInnerAngle = 360;
            this.panner.coneOuterAngle = 0;
            this.panner.coneOuterGain = 0;
            if (zabla && zabla.gain) this.panner.connect(zabla.gain);
        }
    }
    setRefDistance(zabla) {
        if (this.panner) this.panner.refDistance = zabla;
        return this;
    }
    setMaxDistance(zabla) {
        if (this.panner) this.panner.maxDistance = zabla;
        return this;
    }
    setRolloffFactor(zabla) {
        if (this.panner) this.panner.rolloffFactor = zabla;
        return this;
    }
    updateMatrixWorld(zabla) {
        super.updateMatrixWorld(zabla);
        if (!this.panner) return;
        var zablb = this.getWorldPosition(new Vector3);
        var zablc = this.getWorldDirection(new Vector3);
        if (this.panner.positionX) {
            this.panner.positionX.value = zablb.x;
            this.panner.positionY.value = zablb.y;
            this.panner.positionZ.value = zablb.z;
            this.panner.orientationX.value = zablc.x;
            this.panner.orientationY.value = zablc.y;
            this.panner.orientationZ.value = zablc.z;
        } else if (this.panner.setPosition) {
            this.panner.setPosition(zablb.x, zablb.y, zablb.z);
            this.panner.setOrientation(zablc.x, zablc.y, zablc.z);
        }
    }
}

export { PositionalAudio };
