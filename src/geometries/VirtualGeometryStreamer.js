import { Vector3 } from "../math/index.js";

class VirtualGeometryStreamer {
    constructor(options) {
        options = options || {};
        this.maxMemoryBudgetMB = options.maxMemoryBudgetMB || 256;
        this.chunks = [];
        this.activeChunks = [];
    }
    registerChunk(chunk) { this.chunks.push(chunk); return this; }
    update(camera) {
        var camPos = camera.getWorldPosition(new Vector3());
        this.activeChunks = [];
        for (var i = 0; i < this.chunks.length; i++) {
            var c = this.chunks[i];
            var dist = camPos.distanceTo(c.center || new Vector3());
            c.visible = dist < (c.loadRadius || 100);
            if (c.visible) this.activeChunks.push(c);
        }
    }
}

export { VirtualGeometryStreamer };
