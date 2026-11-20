var zaixa = 0;

var zaixb = 1;

var zaixc = 2;

var zaixd = 8;

class SharedRingBuffer {
    constructor(zaixe, zaixf) {
        if (zaixf) {
            this.sab = zaixf;
            this.ints = new Int32Array(zaixf);
            this.bytes = new Uint8Array(zaixf);
            this.capacity = this.bytes.length - zaixd * 4;
        } else {
            if (typeof SharedArrayBuffer === "undefined") throw new Error("SharedRingBuffer: SharedArrayBuffer unavailable (needs COOP/COEP headers)");
            this.capacity = Math.max(16, zaixe | 0);
            this.sab = new SharedArrayBuffer(zaixd * 4 + this.capacity);
            this.ints = new Int32Array(this.sab);
            this.bytes = new Uint8Array(this.sab);
            Atomics.store(this.ints, zaixa, 0);
            Atomics.store(this.ints, zaixb, 0);
            Atomics.store(this.ints, zaixc, 0);
        }
        this._localHead = Atomics.load(this.ints, zaixa);
        this._localTail = Atomics.load(this.ints, zaixb);
    }
    get byteLength() {
        return this.capacity;
    }
    used() {
        var zaixc = Atomics.load(this.ints, zaixa);
        var zaixd = Atomics.load(this.ints, zaixb);
        return (zaixd - zaixc + this.capacity * 4) % (this.capacity * 4);
    }
    free() {
        return this.capacity - this.used();
    }
    closed() {
        return (Atomics.load(this.ints, zaixc) & 1) === 1;
    }
    close() {
        Atomics.or(this.ints, zaixc, 1);
        Atomics.notify(this.ints, zaixb, Infinity);
        return this;
    }
    _wrap(zaixa) {
        return zaixa >= this.capacity ? zaixa - this.capacity : zaixa;
    }
    write(zaixc) {
        var zaixe = zaixc.length;
        if (zaixe + 4 > this.capacity) return false;
        for (var zaixf = 0; zaixf < 64; zaixf++) {
            var zaixg = Atomics.load(this.ints, zaixa);
            var zaixh = this._localTail !== undefined ? this._localTail : Atomics.load(this.ints, zaixb);
            var zaixi = (zaixh - zaixg + this.capacity * 4) % (this.capacity * 4);
            if (zaixe + 4 <= this.capacity - zaixi) {
                var zaixj = zaixh % this.capacity;
                var zaixk = 0;
                var zaixl = new Uint8Array(4);
                new DataView(zaixl.buffer).setUint32(0, zaixe, true);
                for (var zaixm = 0; zaixm < 4; zaixm++) {
                    this.bytes[zaixd * 4 + zaixj] = zaixl[zaixm];
                    zaixj = this._wrap(zaixj + 1);
                    zaixk++;
                }
                for (var zaixn = 0; zaixn < zaixe; zaixn++) {
                    this.bytes[zaixd * 4 + zaixj] = zaixc[zaixn];
                    zaixj = this._wrap(zaixj + 1);
                    zaixk++;
                }
                this._localTail = (zaixh + zaixk) % (this.capacity * 4);
                Atomics.store(this.ints, zaixb, this._localTail);
                Atomics.notify(this.ints, zaixb);
                return true;
            }
            if (typeof Atomics === "undefined") return false;
        }
        return false;
    }
    read() {
        for (;;) {
            var zaixc = Atomics.load(this.ints, zaixa);
            var zaixe = Atomics.load(this.ints, zaixb);
            if (zaixc === zaixe) return this.closed() ? null : null;
            var zaixf = zaixc % this.capacity;
            var zaixg = 0, zaixh = 0;
            for (var zaixi = 0; zaixi < 4; zaixi++) {
                zaixg |= this.bytes[zaixd * 4 + zaixf] << zaixh;
                zaixf = this._wrap(zaixf + 1);
                zaixh += 8;
            }
            if (zaixg > this.capacity) return null;
            var zaixj = new Uint8Array(zaixg);
            for (var zaixk = 0; zaixk < zaixg; zaixk++) {
                zaixj[zaixk] = this.bytes[zaixd * 4 + zaixf];
                zaixf = this._wrap(zaixf + 1);
            }
            var zaixl = (zaixc + 4 + zaixg) % (this.capacity * 4);
            if (Atomics.compareExchange(this.ints, zaixa, zaixc, zaixl) === zaixc) {
                this._localHead = zaixl;
                return zaixj;
            }
        }
    }
    wait(zaixa) {
        if (typeof Atomics === "undefined" || typeof Atomics.wait !== "function") return "unsupported";
        var zaixc = Atomics.load(this.ints, zaixb);
        var zaixd = Atomics.wait(this.ints, zaixb, zaixc, Math.max(1, zaixa | 0));
        return zaixd;
    }
    waitForSpace(zaixb) {
        if (typeof Atomics === "undefined" || typeof Atomics.wait !== "function") return "unsupported";
        var zaixc = Atomics.load(this.ints, zaixa);
        return Atomics.wait(this.ints, zaixa, zaixc, Math.max(1, zaixb | 0));
    }
    static workerSource(zaixa) {
        return "var rings = {};\n" + "self.onmessage = function (event) {\n" + "  var message = event.data;\n" + "  if (!message) return;\n" + "  if (message.open) { rings[message.open] = new SharedRingBufferView(message.sab); return; }\n" + "  if (message.close) { var r = rings[message.close]; if (r) r.close(); return; }\n" + "  var handler = " + JSON.stringify(zaixa || {}) + "[message.task];\n" + '  if (!handler) { postMessage({ id: message.id, ok: false, error: "unknown task" }); return; }\n' + '  try { var value = Function("ring", "payload", "atomics", handler)(rings[message.ring], message.payload, Atomics); postMessage({ id: message.id, ok: true, result: value }); }\n' + "  catch (error) { postMessage({ id: message.id, ok: false, error: String(error) }); }\n" + "};\n" + "function SharedRingBufferView(sab) { this.ints = new Int32Array(sab); this.bytes = new Uint8Array(sab); this.capacity = this.bytes.length - 32; }\n" + "SharedRingBufferView.prototype.read = function () {\n" + "  for (;;) {\n" + "    var head = Atomics.load(this.ints, 0), tail = Atomics.load(this.ints, 1);\n" + "    if (head === tail) return null;\n" + "    var pos = head % this.capacity, len = 0, shift = 0;\n" + "    for (var h = 0; h < 4; h++) { len |= this.bytes[32 + pos] << shift; pos = pos + 1 === this.capacity ? 0 : pos + 1; shift += 8; }\n" + "    var out = new Uint8Array(len);\n" + "    for (var i = 0; i < len; i++) { out[i] = this.bytes[32 + pos]; pos = pos + 1 === this.capacity ? 0 : pos + 1; }\n" + "    var next = (head + 4 + len) % (this.capacity * 4);\n" + "    if (Atomics.compareExchange(this.ints, 0, head, next) === head) return out;\n" + "  }\n" + "};\n" + "SharedRingBufferView.prototype.write = function (data) {\n" + "  var len = data.length;\n" + "  if (len + 4 > this.capacity) return false;\n" + "  var head = Atomics.load(this.ints, 0), tail = Atomics.load(this.ints, 1);\n" + "  var used = (tail - head + this.capacity * 4) % (this.capacity * 4);\n" + "  if (len + 4 > this.capacity - used) return false;\n" + "  var pos = tail % this.capacity, wrote = 0, i;\n" + "  var header = new Uint8Array(4); new DataView(header.buffer).setUint32(0, len, true);\n" + "  for (var h = 0; h < 4; h++) { this.bytes[32 + pos] = header[h]; pos = pos + 1 === this.capacity ? 0 : pos + 1; wrote++; }\n" + "  for (i = 0; i < len; i++) { this.bytes[32 + pos] = data[i]; pos = pos + 1 === this.capacity ? 0 : pos + 1; wrote++; }\n" + "  Atomics.store(this.ints, 1, (tail + wrote) % (this.capacity * 4));\n" + "  Atomics.notify(this.ints, 1);\n" + "  return true;\n" + "};\n" + "SharedRingBufferView.prototype.close = function () { Atomics.or(this.ints, 2, 1); Atomics.notify(this.ints, 1, Infinity); };\n";
    }
}

class SharedCounter {
    constructor(zaixa) {
        if (zaixa) {
            this.sab = zaixa;
        } else {
            if (typeof SharedArrayBuffer === "undefined") throw new Error("SharedCounter: SharedArrayBuffer unavailable (needs COOP/COEP headers)");
            this.sab = new SharedArrayBuffer(4);
        }
        this.ints = new Int32Array(this.sab);
    }
    add(zaixa) {
        return Atomics.add(this.ints, 0, zaixa | 0) + (zaixa | 0);
    }
    increment() {
        return Atomics.add(this.ints, 0, 1) + 1;
    }
    value() {
        return Atomics.load(this.ints, 0);
    }
    reset() {
        Atomics.store(this.ints, 0, 0);
        return this;
    }
}

export { SharedRingBuffer, SharedCounter };
