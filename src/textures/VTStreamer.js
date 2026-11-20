import { faoxomvalue } from "../math/index.js";

class VTStreamer {
    constructor(zavha, zavhb) {
        zavhb = zavhb || {};
        this.vt = zavha;
        this.provider = zavhb.provider || null;
        this.budget = Math.max(1, Math.floor(faoxomvalue(zavhb.budget, zavha ? zavha.tileCount : 16)));
        this.maxInflight = Math.max(1, Math.floor(faoxomvalue(zavhb.maxInflight, 4)));
        this.pinLowMips = Math.max(0, Math.floor(faoxomvalue(zavhb.pinLowMips, 1)));
        this.queue = [];
        this.queued = {};
        this.inflightKeys = {};
        this.inflight = 0;
        this.dirty = false;
        this.stats = {
            resident: 0,
            pending: 0,
            inflight: 0,
            uploaded: 0,
            evicted: 0,
            feedbackPages: 0
        };
        this.pinned = false;
    }
    requestPage(zavha, zavhb, zavhc, zavhd, zavhe) {
        var zavhf = this.vt;
        zavha = Math.min(zavha, zavhf.maxMip);
        var zavhg = zavhf.tableSide(zavha);
        if (zavhc < 0 || zavhd < 0 || zavhc >= zavhg || zavhd >= zavhg || zavhb < 0 || zavhb >= zavhf.layers) return false;
        var zavhh = zavhf.pageKey(zavha, zavhb, zavhc, zavhd);
        if (zavhf.pages.has(zavhh) || this.queued[zavhh] || this.inflightKeys[zavhh]) return false;
        var zavhi = {
            key: zavhh,
            mip: zavha,
            layer: zavhb,
            px: zavhc,
            py: zavhd,
            priority: faoxomvalue(zavhe, 0) + zavha
        };
        this.queued[zavhh] = zavhi;
        this.queue.push(zavhi);
        return true;
    }
    processFeedback(zavha) {
        var zavhb = this.vt;
        if (!zavha || !zavha.length) return 0;
        var zavhc = 0;
        var zavhd = Math.ceil(zavhb.totalPages / 32);
        for (var zavhe = 0; zavhe < zavhd && zavhe < zavha.length; zavhe++) {
            var zavhf = zavha[zavhe] >>> 0;
            if (!zavhf) continue;
            for (var zavhg = 0; zavhg < 32; zavhg++) {
                if ((zavhf & 1 << zavhg) === 0) continue;
                var zavhh = zavhe * 32 + zavhg;
                if (zavhh >= zavhb.totalPages) continue;
                var zavhi = zavhb.pageFromId(zavhh);
                zavhb.touch(zavhi.mip, zavhi.layer, zavhi.px, zavhi.py);
                if (this.requestPage(zavhi.mip, zavhi.layer, zavhi.px, zavhi.py, 100 - zavhi.mip)) zavhc++;
            }
        }
        this.stats.feedbackPages = zavhc;
        return zavhc;
    }
    pinCoarseMips() {
        var zavha = this.vt;
        for (var zavhb = 0; zavhb < zavha.layers; zavhb++) for (var zavhc = zavha.maxMip; zavhc > zavha.maxMip - this.pinLowMips && zavhc >= 0; zavhc--) {
            var zavhd = zavha.tableSide(zavhc);
            for (var zavhe = 0; zavhe < zavhd; zavhe++) for (var zavhf = 0; zavhf < zavhd; zavhf++) {
                this.requestPage(zavhc, zavhb, zavhf, zavhe, 1e3);
                var zavhg = zavha.pageKey(zavhc, zavhb, zavhf, zavhe);
                var zavhh = zavha.pages.get(zavhg);
                if (zavhh) zavhh.pinned = true;
            }
        }
        this.pinned = true;
        return this;
    }
    async update() {
        var zavha = this, zavhb = this.vt;
        this.queue.sort(function(zavha, zavhb) {
            return zavhb.priority - zavha.priority;
        });
        var zavhc = [];
        while (this.inflight < this.maxInflight && this.queue.length) {
            var zavhd = this.queue.shift();
            delete this.queued[zavhd.key];
            if (zavhb.pages.has(zavhd.key) || this.inflightKeys[zavhd.key]) continue;
            this.inflightKeys[zavhd.key] = true;
            var zavhe = zavhb.allocateTile();
            if (zavhe === null) {
                var zavhf = zavhb.evictLRU(1);
                if (zavhf === 0) {
                    this.queue.unshift(zavhd);
                    this.queued[zavhd.key] = zavhd;
                    break;
                }
                zavhe = zavhb.allocateTile();
                if (zavhe === null) {
                    this.queue.unshift(zavhd);
                    this.queued[zavhd.key] = zavhd;
                    break;
                }
            }
            this.inflight++;
            zavhc.push(this.loadPage(zavhd, zavhe));
        }
        if (zavhc.length) await Promise.all(zavhc);
        while (zavhb.pages.size > this.budget) {
            var zavhg = zavhb.evictLRU(zavhb.pages.size - this.budget);
            this.stats.evicted += zavhg;
            this.dirty = true;
            if (zavhg === 0) break;
        }
        if (this.dirty) zavhb.flushTable();
        this.dirty = false;
        this.stats.resident = zavhb.pages.size;
        this.stats.pending = this.queue.length;
        this.stats.inflight = this.inflight;
        return this;
    }
    async loadPage(zavha, zavhb) {
        var zavhc = this, zavhd = this.vt;
        try {
            if (!zavhc.provider) throw new Error("VTStreamer has no page provider");
            var zavhe = await zavhc.provider({
                mip: zavha.mip,
                layer: zavha.layer,
                px: zavha.px,
                py: zavha.py,
                size: zavhd.pageSize
            });
            if (!zavhd.pages.has(zavha.key)) {
                zavhd.uploadTile(zavhb, zavhe);
                zavhd.setPage(zavha.mip, zavha.layer, zavha.px, zavha.py, zavhb);
                if (zavha.priority >= 1e3) zavhd.pinPage(zavha.mip, zavha.layer, zavha.px, zavha.py, true);
                zavhc.stats.uploaded++;
                zavhc.dirty = true;
            } else {
                if (zavhd.freeTiles.indexOf(zavhb) === -1) zavhd.freeTiles.push(zavhb);
            }
        } catch (zavha) {
            if (zavhd.freeTiles.indexOf(zavhb) === -1) zavhd.freeTiles.push(zavhb);
            zavhc.lastError = zavha;
        } finally {
            delete zavhc.inflightKeys[zavha.key];
            zavhc.inflight--;
        }
    }
    clear() {
        this.queue = [];
        this.queued = {};
        return this;
    }
}

export { VTStreamer };
