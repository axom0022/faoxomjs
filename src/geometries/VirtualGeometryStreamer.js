import { Vector3 } from "../math/index.js";

class VirtualGeometryStreamer {
    constructor(zakwa) {
        zakwa = zakwa || {};
        this.maxMemoryBudgetMB = zakwa.maxMemoryBudgetMB || 256;
        this.chunks = [];
        this.activeChunks = [];
    }
    registerChunk(zakwa) {
        this.chunks.push(zakwa);
        return this;
    }
    update(zakwa) {
        var zakwb = zakwa.getWorldPosition(new Vector3);
        this.activeChunks = [];
        for (var zakwc = 0; zakwc < this.chunks.length; zakwc++) {
            var zakwd = this.chunks[zakwc];
            var zakwe = zakwb.distanceTo(zakwd.center || new Vector3);
            zakwd.visible = zakwe < (zakwd.loadRadius || 100);
            if (zakwd.visible) this.activeChunks.push(zakwd);
        }
    }
}

export { VirtualGeometryStreamer };
