import { ClipVolume } from "./ClipVolume.js";

class ClipVolumeArray {
    constructor(volumes) { this.volumes = volumes ? volumes.slice() : []; }
    push(volume) { this.volumes.push(volume); return this; }
    clear() { this.volumes.length = 0; return this; }
    get count() { return this.volumes.length; }
    adoptCameras(cameras) {
        this.clear();
        for (var i = 0; i < (cameras || []).length; i++) this.volumes.push(new ClipVolume().adoptCamera(cameras[i]));
        return this;
    }
    intersectsBox(box) {
        for (var i = 0; i < this.volumes.length; i++) if (this.volumes[i].intersectsBox(box)) return true;
        return false;
    }
    intersectsSphere(sphere) {
        for (var i = 0; i < this.volumes.length; i++) if (this.volumes[i].intersectsSphere(sphere)) return true;
        return false;
    }
    holdsPoint(point) {
        for (var i = 0; i < this.volumes.length; i++) if (this.volumes[i].holdsPoint(point)) return true;
        return false;
    }
}

export { ClipVolumeArray };
