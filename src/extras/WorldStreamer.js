import { Object3D } from "../core/index.js";

import { Vector3, faoxomvalue } from "../math/index.js";

class WorldStreamer extends Object3D {
    constructor(zajsa, zajsb) {
        super();
        zajsb = zajsb || {};
        this.type = "WorldStreamer";
        this.loader = zajsa;
        this.cellSize = Math.max(1, faoxomvalue(zajsb.cellSize, 64));
        this.viewDistance = Math.max(this.cellSize, faoxomvalue(zajsb.viewDistance, this.cellSize * 3));
        this.keepDistance = Math.max(this.viewDistance, faoxomvalue(zajsb.keepDistance, this.viewDistance + this.cellSize));
        this.maxConcurrent = Math.max(1, Math.floor(faoxomvalue(zajsb.maxConcurrent, 2)));
        this.maxLoadedCells = Math.max(0, Math.floor(faoxomvalue(zajsb.maxLoadedCells, 0)));
        this.maxMemoryBytes = Math.max(0, faoxomvalue(zajsb.maxMemoryBytes, 0));
        this.cells = {};
        this.queue = [];
        this.loading = 0;
        this.memoryBytes = 0;
        this.center = new Vector3;
        this.direction = new Vector3(0, 0, -1);
        this.onLoad = zajsb.onLoad || null;
        this.onUnload = zajsb.onUnload || null;
    }
    key(zajsa, zajsb) {
        return zajsa + ":" + zajsb;
    }
    addCell(zajsa, zajsb, zajsc, zajsd) {
        zajsd = zajsd || {};
        var zajse = this.key(zajsa, zajsb);
        var zajsf = this.cells[zajse] || {
            key: zajse,
            x: zajsa,
            z: zajsb,
            source: zajsc,
            state: "idle",
            object: null,
            promise: null,
            distance: Infinity
        };
        zajsf.source = zajsc;
        zajsf.options = zajsd;
        this.cells[zajse] = zajsf;
        return zajsf;
    }
    removeCell(zajsa, zajsb) {
        var zajsc = this.key(zajsa, zajsb);
        var zajsd = this.cells[zajsc];
        if (!zajsd) return this;
        this.unloadCell(zajsd);
        delete this.cells[zajsc];
        this.queue = this.queue.filter(function(zajsa) {
            return zajsa !== zajsd;
        });
        return this;
    }
    unloadCell(zajsa) {
        if (!zajsa || zajsa.state === "loading") return this;
        if (zajsa.object) {
            this.remove(zajsa.object);
            if (zajsa.object.dispose) zajsa.object.dispose();
            this.memoryBytes = Math.max(0, this.memoryBytes - (zajsa.memoryBytes || 0));
            if (this.onUnload) this.onUnload(zajsa, zajsa.object);
        }
        zajsa.object = null;
        zajsa.memoryBytes = 0;
        zajsa.state = "idle";
        zajsa.promise = null;
        return this;
    }
    estimateMemory(zajsa) {
        var zajsb = 0;
        if (!zajsa || !zajsa.traverse) return zajsb;
        zajsa.traverse(function(zajsa) {
            if (zajsa.geometry && zajsa.geometry.attributes) for (var zajsc in zajsa.geometry.attributes) if (zajsa.geometry.attributes[zajsc] && zajsa.geometry.attributes[zajsc].array) zajsb += zajsa.geometry.attributes[zajsc].array.byteLength || 0;
            if (zajsa.geometry && zajsa.geometry.index) zajsb += zajsa.geometry.index.byteLength || 0;
        });
        return zajsb;
    }
    evict() {
        var zajsa = [];
        for (var zajsb in this.cells) if (this.cells[zajsb].state === "loaded") zajsa.push(this.cells[zajsb]);
        zajsa.sort(function(zajsa, zajsb) {
            return zajsb.distance - zajsa.distance;
        });
        while (this.maxLoadedCells && zajsa.length > this.maxLoadedCells || this.maxMemoryBytes && this.memoryBytes > this.maxMemoryBytes) {
            var zajsc = zajsa.shift();
            if (!zajsc) break;
            this.unloadCell(zajsc);
        }
        return this;
    }
    loadCell(zajsa) {
        if (!zajsa || zajsa.state !== "idle") return;
        zajsa.state = "loading";
        this.loading++;
        var zajsb = zajsa.source;
        var zajsc;
        try {
            zajsc = typeof zajsb === "function" ? zajsb(zajsa) : this.loader.loadModel(zajsb);
        } catch (zajsa) {
            zajsc = Promise.reject(zajsa);
        }
        zajsa.promise = Promise.resolve(zajsc).then(function(zajsb) {
            if (zajsa.state !== "loading") return zajsb;
            zajsa.object = zajsb;
            if (zajsb) {
                zajsb.position.x += zajsa.x * this.cellSize;
                zajsb.position.z += zajsa.z * this.cellSize;
                this.add(zajsb);
                zajsa.memoryBytes = this.estimateMemory(zajsb);
                this.memoryBytes += zajsa.memoryBytes;
            }
            zajsa.state = "loaded";
            this.loading--;
            if (this.onLoad) this.onLoad(zajsa, zajsb);
            this.evict();
            this.pump();
            return zajsb;
        }.bind(this)).catch(function(zajsb) {
            zajsa.state = "error";
            zajsa.error = zajsb;
            this.loading--;
            return null;
        }.bind(this));
    }
    pump() {
        while (this.loading < this.maxConcurrent && this.queue.length) this.loadCell(this.queue.shift());
        return this;
    }
    update(zajsa, zajsb) {
        if (!zajsa) return this;
        this.center.copy(zajsa);
        if (zajsb) this.direction.copy(zajsb).normalize();
        var zajsc = Math.floor(zajsa.x / this.cellSize);
        var zajsd = Math.floor(zajsa.z / this.cellSize);
        var zajse = Math.ceil(this.viewDistance / this.cellSize);
        for (var zajsf in this.cells) {
            var zajsg = this.cells[zajsf];
            var zajsh = (zajsg.x - zajsc) * this.cellSize;
            var zajsi = (zajsg.z - zajsd) * this.cellSize;
            zajsg.distance = Math.sqrt(zajsh * zajsh + zajsi * zajsi);
            if (zajsg.distance > this.keepDistance && zajsg.state === "loaded") this.unloadCell(zajsg);
        }
        for (var zajsj = zajsc - zajse; zajsj <= zajsc + zajse; zajsj++) for (var zajsk = zajsd - zajse; zajsk <= zajsd + zajse; zajsk++) {
            var zajsl = this.cells[this.key(zajsj, zajsk)];
            if (zajsl) {
                zajsl.distance = Math.sqrt(Math.pow((zajsj - zajsc) * this.cellSize, 2) + Math.pow((zajsk - zajsd) * this.cellSize, 2));
                var zajsm = new Vector3((zajsj - zajsc) * this.cellSize, 0, (zajsk - zajsd) * this.cellSize);
                zajsl.priority = zajsl.distance - zajsm.normalize().dot(this.direction) * this.cellSize * .75;
                if (zajsl.distance <= this.viewDistance && zajsl.state === "idle" && this.queue.indexOf(zajsl) === -1) this.queue.push(zajsl);
            }
        }
        this.queue.sort(function(zajsa, zajsb) {
            return (zajsa.priority === undefined ? zajsa.distance : zajsa.priority) - (zajsb.priority === undefined ? zajsb.distance : zajsb.priority);
        });
        this.evict();
        return this.pump();
    }
    getStats() {
        var zajsa = 0;
        var zajsb = 0;
        var zajsc = this.queue.length;
        for (var zajsd in this.cells) {
            if (this.cells[zajsd].state === "loaded") zajsa++;
            if (this.cells[zajsd].state === "loading") zajsb++;
        }
        return {
            loaded: zajsa,
            loading: zajsb,
            queued: zajsc,
            total: Object.keys(this.cells).length,
            memoryBytes: this.memoryBytes,
            maxLoadedCells: this.maxLoadedCells,
            maxMemoryBytes: this.maxMemoryBytes
        };
    }
    dispose() {
        for (var zajsa in this.cells) this.unloadCell(this.cells[zajsa]);
        this.cells = {};
        this.queue = [];
        return this;
    }
}

export { WorldStreamer };
