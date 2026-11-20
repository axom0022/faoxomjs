import { faoxomvalue } from "../math/index.js";

class TextureStreamer {
    constructor(zavfa, zavfb, zavfc) {
        this.loader = zavfa;
        this.renderer = zavfb;
        zavfc = zavfc || {};
        this.maxResident = Math.max(1, Math.floor(faoxomvalue(zavfc.maxResident, 64)));
        this.resident = {};
        this.queue = [];
        this.inflight = 0;
    }
    request(zavfa, zavfb, zavfc) {
        var zavfd = {
            url: zavfa,
            priority: faoxomvalue(zavfb, 0),
            callback: zavfc
        };
        if (this.resident[zavfa]) {
            if (zavfc) zavfc(this.resident[zavfa]);
            return Promise.resolve(this.resident[zavfa]);
        }
        this.queue.push(zavfd);
        this.queue.sort(function(zavfa, zavfb) {
            return zavfb.priority - zavfa.priority;
        });
        return this.pump();
    }
    pump() {
        var zavfa = this;
        if (!this.queue.length || this.inflight) return Promise.resolve(null);
        var zavfb = this.queue.shift();
        this.inflight++;
        return this.loader.loadKTX2(zavfb.url, this.renderer).then(function(zavfc) {
            zavfa.resident[zavfb.url] = zavfc;
            var zavfd = Object.keys(zavfa.resident);
            while (zavfd.length > zavfa.maxResident) {
                delete zavfa.resident[zavfd.shift()];
            }
            if (zavfb.callback) zavfb.callback(zavfc);
            return zavfc;
        }).finally(function() {
            zavfa.inflight--;
            zavfa.pump();
        });
    }
    clear() {
        this.resident = {};
        this.queue = [];
        return this;
    }
}

export { TextureStreamer };
