// SharedRingBuffer - single producer / single consumer byte ring over a
// SharedArrayBuffer, synchronized with Atomics only. The design avoids the
// two classic worker hazards:
//   races: every head/tail read and write goes through Atomics; data slots
//     are only touched between a successful reserve and a matching commit,
//     and each cell is owned by exactly one side at a time.
//   deadlocks: the main thread never blocks (browsers forbid Atomics.wait
//     there anyway); workers wait with a bounded timeout and fall back to a
//     poll, so a stalled peer can never freeze the pool permanently.

var SPSC_HEAD = 0;   // consumer cursor (dword index 0)
var SPSC_TAIL = 1;   // producer cursor (dword index 1)
var SPSC_FLAGS = 2;  // bit 0: closed
var HEADER_DWORDS = 8;

class SharedRingBuffer {
    constructor(byteCapacity, shared) {
        if (shared) {
            this.sab = shared;
            this.ints = new Int32Array(shared);
            this.bytes = new Uint8Array(shared);
            this.capacity = this.bytes.length - HEADER_DWORDS * 4;
        } else {
            if (typeof SharedArrayBuffer === "undefined") throw new Error("SharedRingBuffer: SharedArrayBuffer unavailable (needs COOP/COEP headers)");
            this.capacity = Math.max(16, byteCapacity | 0);
            this.sab = new SharedArrayBuffer(HEADER_DWORDS * 4 + this.capacity);
            this.ints = new Int32Array(this.sab);
            this.bytes = new Uint8Array(this.sab);
            Atomics.store(this.ints, SPSC_HEAD, 0);
            Atomics.store(this.ints, SPSC_TAIL, 0);
            Atomics.store(this.ints, SPSC_FLAGS, 0);
        }
        this._localHead = Atomics.load(this.ints, SPSC_HEAD);
        this._localTail = Atomics.load(this.ints, SPSC_TAIL);
    }

    get byteLength() { return this.capacity; }

    used() {
        var head = Atomics.load(this.ints, SPSC_HEAD);
        var tail = Atomics.load(this.ints, SPSC_TAIL);
        return (tail - head + this.capacity * 4) % (this.capacity * 4);
    }

    free() { return this.capacity - this.used(); }

    closed() { return (Atomics.load(this.ints, SPSC_FLAGS) & 1) === 1; }

    close() { Atomics.or(this.ints, SPSC_FLAGS, 1); Atomics.notify(this.ints, SPSC_TAIL, Infinity); return this; }

    _wrap(pos) { return pos >= this.capacity ? pos - this.capacity : pos; }

    // Producer side. Writes a length prefixed record; returns false when the
    // ring is full (caller retries, drops, or spills; it never blocks).
    write(source) {
        var len = source.length;
        if (len + 4 > this.capacity) return false;
        for (var attempt = 0; attempt < 64; attempt++) {
            var head = Atomics.load(this.ints, SPSC_HEAD);
            var tail = this._localTail !== undefined ? this._localTail : Atomics.load(this.ints, SPSC_TAIL);
            var used = (tail - head + this.capacity * 4) % (this.capacity * 4);
            if (len + 4 <= this.capacity - used) {
                var pos = (tail % this.capacity);
                var wrote = 0;
                // length header may straddle the wrap
                var headerBytes = new Uint8Array(4);
                new DataView(headerBytes.buffer).setUint32(0, len, true);
                for (var h = 0; h < 4; h++) {
                    this.bytes[HEADER_DWORDS * 4 + pos] = headerBytes[h];
                    pos = this._wrap(pos + 1);
                    wrote++;
                }
                for (var i = 0; i < len; i++) {
                    this.bytes[HEADER_DWORDS * 4 + pos] = source[i];
                    pos = this._wrap(pos + 1);
                    wrote++;
                }
                this._localTail = (tail + wrote) % (this.capacity * 4);
                Atomics.store(this.ints, SPSC_TAIL, this._localTail);
                Atomics.notify(this.ints, SPSC_TAIL);
                return true;
            }
            // full: yield and retry a few times, then report full
            if (typeof Atomics === "undefined") return false;
        }
        return false;
    }

    // Consumer side. Non blocking: returns null when empty.
    read() {
        for (;;) {
            var head = Atomics.load(this.ints, SPSC_HEAD);
            var tail = Atomics.load(this.ints, SPSC_TAIL);
            if (head === tail) return this.closed() ? null : null;
            var pos = head % this.capacity;
            var len = 0, shift = 0;
            for (var h = 0; h < 4; h++) {
                len |= this.bytes[HEADER_DWORDS * 4 + pos] << shift;
                pos = this._wrap(pos + 1);
                shift += 8;
            }
            if (len > this.capacity) return null; // corrupt: bail out
            var out = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                out[i] = this.bytes[HEADER_DWORDS * 4 + pos];
                pos = this._wrap(pos + 1);
            }
            var next = (head + 4 + len) % (this.capacity * 4);
            // only publish the head once the record is fully copied out
            if (Atomics.compareExchange(this.ints, SPSC_HEAD, head, next) === head) {
                this._localHead = next;
                return out;
            }
            // another reader moved the head (should not happen in SPSC; retry)
        }
    }

    // Worker helper: block until data or timeout. Main thread must not call.
    wait(timeoutMs) {
        if (typeof Atomics === "undefined" || typeof Atomics.wait !== "function") return "unsupported";
        var tail = Atomics.load(this.ints, SPSC_TAIL);
        var status = Atomics.wait(this.ints, SPSC_TAIL, tail, Math.max(1, timeoutMs | 0));
        return status;
    }

    // Worker helper: wait until the consumer made room. Bounded, never fatal.
    waitForSpace(timeoutMs) {
        if (typeof Atomics === "undefined" || typeof Atomics.wait !== "function") return "unsupported";
        var head = Atomics.load(this.ints, SPSC_HEAD);
        return Atomics.wait(this.ints, SPSC_HEAD, head, Math.max(1, timeoutMs | 0));
    }

    static workerSource(handlers) {
        // Inline worker glue: safe because every handler only touches its own
        // ring and Atomics. Timeouts bound every wait so a lost peer degrades
        // to polling instead of deadlocking.
        return 'var rings = {};\n' +
            'self.onmessage = function (event) {\n' +
            '  var message = event.data;\n' +
            '  if (!message) return;\n' +
            '  if (message.open) { rings[message.open] = new SharedRingBufferView(message.sab); return; }\n' +
            '  if (message.close) { var r = rings[message.close]; if (r) r.close(); return; }\n' +
            '  var handler = ' + JSON.stringify(handlers || {}) + '[message.task];\n' +
            '  if (!handler) { postMessage({ id: message.id, ok: false, error: "unknown task" }); return; }\n' +
            '  try { var value = Function("ring", "payload", "atomics", handler)(rings[message.ring], message.payload, Atomics); postMessage({ id: message.id, ok: true, result: value }); }\n' +
            '  catch (error) { postMessage({ id: message.id, ok: false, error: String(error) }); }\n' +
            '};\n' +
            'function SharedRingBufferView(sab) { this.ints = new Int32Array(sab); this.bytes = new Uint8Array(sab); this.capacity = this.bytes.length - 32; }\n' +
            'SharedRingBufferView.prototype.read = function () {\n' +
            '  for (;;) {\n' +
            '    var head = Atomics.load(this.ints, 0), tail = Atomics.load(this.ints, 1);\n' +
            '    if (head === tail) return null;\n' +
            '    var pos = head % this.capacity, len = 0, shift = 0;\n' +
            '    for (var h = 0; h < 4; h++) { len |= this.bytes[32 + pos] << shift; pos = pos + 1 === this.capacity ? 0 : pos + 1; shift += 8; }\n' +
            '    var out = new Uint8Array(len);\n' +
            '    for (var i = 0; i < len; i++) { out[i] = this.bytes[32 + pos]; pos = pos + 1 === this.capacity ? 0 : pos + 1; }\n' +
            '    var next = (head + 4 + len) % (this.capacity * 4);\n' +
            '    if (Atomics.compareExchange(this.ints, 0, head, next) === head) return out;\n' +
            '  }\n' +
            '};\n' +
            'SharedRingBufferView.prototype.write = function (data) {\n' +
            '  var len = data.length;\n' +
            '  if (len + 4 > this.capacity) return false;\n' +
            '  var head = Atomics.load(this.ints, 0), tail = Atomics.load(this.ints, 1);\n' +
            '  var used = (tail - head + this.capacity * 4) % (this.capacity * 4);\n' +
            '  if (len + 4 > this.capacity - used) return false;\n' +
            '  var pos = tail % this.capacity, wrote = 0, i;\n' +
            '  var header = new Uint8Array(4); new DataView(header.buffer).setUint32(0, len, true);\n' +
            '  for (var h = 0; h < 4; h++) { this.bytes[32 + pos] = header[h]; pos = pos + 1 === this.capacity ? 0 : pos + 1; wrote++; }\n' +
            '  for (i = 0; i < len; i++) { this.bytes[32 + pos] = data[i]; pos = pos + 1 === this.capacity ? 0 : pos + 1; wrote++; }\n' +
            '  Atomics.store(this.ints, 1, (tail + wrote) % (this.capacity * 4));\n' +
            '  Atomics.notify(this.ints, 1);\n' +
            '  return true;\n' +
            '};\n' +
            'SharedRingBufferView.prototype.close = function () { Atomics.or(this.ints, 2, 1); Atomics.notify(this.ints, 1, Infinity); };\n';
    }
}

// Synchronized counter over a SAB: the canonical race free accumulator for
// parallel reductions. All updates go through Atomics.add.
class SharedCounter {
    constructor(shared) {
        if (shared) {
            this.sab = shared;
        } else {
            if (typeof SharedArrayBuffer === "undefined") throw new Error("SharedCounter: SharedArrayBuffer unavailable (needs COOP/COEP headers)");
            this.sab = new SharedArrayBuffer(4);
        }
        this.ints = new Int32Array(this.sab);
    }

    add(delta) { return Atomics.add(this.ints, 0, delta | 0) + (delta | 0); }

    increment() { return Atomics.add(this.ints, 0, 1) + 1; }

    value() { return Atomics.load(this.ints, 0); }

    reset() { Atomics.store(this.ints, 0, 0); return this; }
}

export { SharedRingBuffer, SharedCounter };
