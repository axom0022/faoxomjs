import { ClipVolume } from "./ClipVolume.js";

class ClipVolumeArray {
    constructor(zarma) {
        this.volumes = zarma ? zarma.slice() : [];
    }
    push(zarma) {
        this.volumes.push(zarma);
        return this;
    }
    clear() {
        this.volumes.length = 0;
        return this;
    }
    get count() {
        return this.volumes.length;
    }
    adoptCameras(zarma) {
        this.clear();
        for (var zarmb = 0; zarmb < (zarma || []).length; zarmb++) this.volumes.push((new ClipVolume).adoptCamera(zarma[zarmb]));
        return this;
    }
    intersectsBox(zarma) {
        for (var zarmb = 0; zarmb < this.volumes.length; zarmb++) if (this.volumes[zarmb].intersectsBox(zarma)) return true;
        return false;
    }
    intersectsSphere(zarma) {
        for (var zarmb = 0; zarmb < this.volumes.length; zarmb++) if (this.volumes[zarmb].intersectsSphere(zarma)) return true;
        return false;
    }
    holdsPoint(zarma) {
        for (var zarmb = 0; zarmb < this.volumes.length; zarmb++) if (this.volumes[zarmb].holdsPoint(zarma)) return true;
        return false;
    }
}

export { ClipVolumeArray };
