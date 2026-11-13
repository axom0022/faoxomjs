import { faoxomvalue } from "../math/index.js";

class TextureStreamer {
    constructor(loader, renderer, options) { this.loader = loader; this.renderer = renderer; options = options || {}; this.maxResident = Math.max(1, Math.floor(faoxomvalue(options.maxResident, 64))); this.resident = {}; this.queue = []; this.inflight = 0; }
    request(url, priority, callback) { var item = { url: url, priority: faoxomvalue(priority, 0), callback: callback }; if (this.resident[url]) { if (callback) callback(this.resident[url]); return Promise.resolve(this.resident[url]); } this.queue.push(item); this.queue.sort(function(a, b) { return b.priority - a.priority; }); return this.pump(); }
    pump() { var self = this; if (!this.queue.length || this.inflight) return Promise.resolve(null); var item = this.queue.shift(); this.inflight++; return this.loader.loadKTX2(item.url, this.renderer).then(function(texture) { self.resident[item.url] = texture; var keys = Object.keys(self.resident); while (keys.length > self.maxResident) { delete self.resident[keys.shift()]; } if (item.callback) item.callback(texture); return texture; }).finally(function() { self.inflight--; self.pump(); }); }
    clear() { this.resident = {}; this.queue = []; return this; }
}

export { TextureStreamer };
