import { faoxomvalue } from "../math/index.js";

class VTStreamer {
    constructor(virtualTexture, options) {
        options = options || {};
        this.vt = virtualTexture;
        this.provider = options.provider || null;
        this.budget = Math.max(1, Math.floor(faoxomvalue(options.budget, virtualTexture ? virtualTexture.tileCount : 16)));
        this.maxInflight = Math.max(1, Math.floor(faoxomvalue(options.maxInflight, 4)));
        this.pinLowMips = Math.max(0, Math.floor(faoxomvalue(options.pinLowMips, 1)));
        this.queue = [];
        this.queued = {};
        this.inflightKeys = {};
        this.inflight = 0;
        this.dirty = false;
        this.stats = { resident: 0, pending: 0, inflight: 0, uploaded: 0, evicted: 0, feedbackPages: 0 };
        this.pinned = false;
    }
    requestPage(mip, layer, px, py, priority) {
        var vt = this.vt;
        mip = Math.min(mip, vt.maxMip);
        var side = vt.tableSide(mip);
        if (px < 0 || py < 0 || px >= side || py >= side || layer < 0 || layer >= vt.layers) return false;
        var key = vt.pageKey(mip, layer, px, py);
        if (vt.pages.has(key) || this.queued[key] || this.inflightKeys[key]) return false;
        var request = { key: key, mip: mip, layer: layer, px: px, py: py, priority: faoxomvalue(priority, 0) + mip };
        this.queued[key] = request;
        this.queue.push(request);
        return true;
    }
    processFeedback(feedbackWords) {
        var vt = this.vt;
        if (!feedbackWords || !feedbackWords.length) return 0;
        var touched = 0;
        var wordCount = Math.ceil(vt.totalPages / 32);
        for (var word = 0; word < wordCount && word < feedbackWords.length; word++) {
            var bits = feedbackWords[word] >>> 0;
            if (!bits) continue;
            for (var bit = 0; bit < 32; bit++) {
                if ((bits & (1 << bit)) === 0) continue;
                var id = word * 32 + bit;
                if (id >= vt.totalPages) continue;
                var page = vt.pageFromId(id);
                vt.touch(page.mip, page.layer, page.px, page.py);
                if (this.requestPage(page.mip, page.layer, page.px, page.py, 100 - page.mip)) touched++;
            }
        }
        this.stats.feedbackPages = touched;
        return touched;
    }
    pinCoarseMips() {
        var vt = this.vt;
        for (var layer = 0; layer < vt.layers; layer++) for (var m = vt.maxMip; m > vt.maxMip - this.pinLowMips && m >= 0; m--) {
            var side = vt.tableSide(m);
            for (var py = 0; py < side; py++) for (var px = 0; px < side; px++) {
                this.requestPage(m, layer, px, py, 1000);
                var key = vt.pageKey(m, layer, px, py);
                var entry = vt.pages.get(key);
                if (entry) entry.pinned = true;
            }
        }
        this.pinned = true;
        return this;
    }
    async update() {
        var self = this, vt = this.vt;
        this.queue.sort(function(a, b) { return b.priority - a.priority; });
        var started = [];
        while (this.inflight < this.maxInflight && this.queue.length) {
            var request = this.queue.shift();
            delete this.queued[request.key];
            if (vt.pages.has(request.key) || this.inflightKeys[request.key]) continue;
            this.inflightKeys[request.key] = true;
            var tile = vt.allocateTile();
            if (tile === null) {
                var evicted = vt.evictLRU(1);
                if (evicted === 0) { this.queue.unshift(request); this.queued[request.key] = request; break; }
                tile = vt.allocateTile();
                if (tile === null) { this.queue.unshift(request); this.queued[request.key] = request; break; }
            }
            this.inflight++;
            started.push(this.loadPage(request, tile));
        }
        if (started.length) await Promise.all(started);
        while (vt.pages.size > this.budget) {
            var evictedCount = vt.evictLRU(vt.pages.size - this.budget);
            this.stats.evicted += evictedCount;
            this.dirty = true;
            if (evictedCount === 0) break;
        }
        if (this.dirty) vt.flushTable();
        this.dirty = false;
        this.stats.resident = vt.pages.size;
        this.stats.pending = this.queue.length;
        this.stats.inflight = this.inflight;
        return this;
    }
    async loadPage(request, tile) {
        var self = this, vt = this.vt;
        try {
            if (!self.provider) throw new Error("VTStreamer has no page provider");
            var content = await self.provider({ mip: request.mip, layer: request.layer, px: request.px, py: request.py, size: vt.pageSize });
            if (!vt.pages.has(request.key)) {
                vt.uploadTile(tile, content);
                vt.setPage(request.mip, request.layer, request.px, request.py, tile);
                if (request.priority >= 1000) vt.pinPage(request.mip, request.layer, request.px, request.py, true);
                self.stats.uploaded++;
                self.dirty = true;
            } else {
                if (vt.freeTiles.indexOf(tile) === -1) vt.freeTiles.push(tile);
            }
        } catch (error) {
            if (vt.freeTiles.indexOf(tile) === -1) vt.freeTiles.push(tile);
            self.lastError = error;
        } finally {
            delete self.inflightKeys[request.key];
            self.inflight--;
        }
    }
    clear() {
        this.queue = [];
        this.queued = {};
        return this;
    }
}

export { VTStreamer };
