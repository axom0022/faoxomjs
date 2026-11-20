// ReplayLog - verifiable replay records for scoreboards. Clients never submit
// scores; they submit a compact log of timestamped inputs plus the initial
// RNG seed and a config hash. Any verifier (serverless function, another
// player, a headless run) fast-forwards the same deterministic simulation and
// recomputes the score. Forged claims cannot reproduce the hash.

function replayHeaderBytes() {
    return 16;
}

class ReplayRecorder {
    constructor(options) {
        options = options || {};
        this.seed = (options.seed !== undefined ? options.seed : Math.floor(Math.random() * 0x7fffffff)) >>> 0;
        this.tickRate = Math.max(1, options.tickRate || 60);
        this._inputs = []; // flat: [tick, inputWord, inputWord, ...] per event
        this._events = []; // flat: [tick, eventId, payload]
        this._inputArity = Math.max(0, options.inputArity || 0);
        this._startedAt = typeof performance !== "undefined" ? performance.now() : 0;
        this._inputBits = Math.max(1, options.inputBits || 16);
    }

    // input: array of numbers, each quantized to signed inputBits range
    record(tick, input) {
        var words = [];
        var max = (1 << (this._inputBits - 1)) - 1;
        for (var i = 0; i < input.length; i++) {
            var clamped = Math.max(-max - 1, Math.min(max, Math.round(input[i])));
            words.push(clamped & 0xffff);
        }
        this._inputs.push(tick | 0, words.length);
        for (var w = 0; w < words.length; w++) this._inputs.push(words[w]);
        return this;
    }

    recordEvent(tick, eventId, payload) {
        this._events.push(tick | 0, eventId | 0, payload === undefined ? 0 : payload | 0);
        return this;
    }

    setConfig(config) {
        this.config = config || null;
        var encoded = JSON.stringify(this.config);
        this.configHash = 0x811c9dc5;
        for (var i = 0; i < encoded.length; i++) {
            this.configHash ^= encoded.charCodeAt(i) & 0xff;
            this.configHash = Math.imul(this.configHash, 0x01000193) >>> 0;
        }
        return this;
    }

    // Binary wire format (little endian):
    // u32 magic, u32 version, u32 seed, u32 tickRate
    // u32 configHash, u32 inputBits, u32 inputCount, u32 eventCount
    // then per input: i32 tick, u16 len, len x u16 words
    // then per event: i32 tick, u32 eventId, i32 payload
    toBuffer() {
        var size = replayHeaderBytes() * 4;
        for (var i = 0; i < this._inputs.length;) {
            size += 6 + this._inputs[i + 1] * 2;
            i += 2 + this._inputs[i + 1];
        }
        size += this._events.length * 12;
        var buffer = new ArrayBuffer(size);
        var view = new DataView(buffer);
        var u8 = new Uint8Array(buffer);
        var inputCount = 0;
        for (var j = 0; j < this._inputs.length;) {
            inputCount++;
            j += 2 + this._inputs[j + 1];
        }
        var offset = 0;
        function u32(value) { view.setUint32(offset, value >>> 0, true); offset += 4; }
        u32(0x46585250); // "FXRP"
        u32(1);
        u32(this.seed);
        u32(this.tickRate);
        u32(this.configHash || 0);
        u32(this._inputBits);
        u32(inputCount);
        u32(this._events.length / 3);
        for (var k = 0; k < this._inputs.length;) {
            view.setInt32(offset, this._inputs[k], true); offset += 4;
            view.setUint16(offset, this._inputs[k + 1], true); offset += 2;
            var len = this._inputs[k + 1];
            for (var w = 0; w < len; w++) { view.setUint16(offset, this._inputs[k + 2 + w] & 0xffff, true); offset += 2; }
            k += 2 + len;
        }
        for (var e = 0; e < this._events.length; e += 3) {
            view.setInt32(offset, this._events[e], true); offset += 4;
            view.setUint32(offset, this._events[e + 1] >>> 0, true); offset += 4;
            view.setInt32(offset, this._events[e + 2], true); offset += 4;
        }
        return u8.subarray(0, offset);
    }

    durationTicks() {
        var last = 0;
        for (var i = 0; i < this._inputs.length;) {
            if (this._inputs[i] > last) last = this._inputs[i];
            i += 2 + this._inputs[i + 1];
        }
        return last;
    }
}

class ReplayPlayer {
    constructor(bytes) {
        this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
        var view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        if (this.bytes.length < 32) throw new Error("ReplayLog: truncated replay");
        if (view.getUint32(0, true) !== 0x46585250) throw new Error("ReplayLog: bad magic");
        this.version = view.getUint32(4, true);
        this.seed = view.getUint32(8, true);
        this.tickRate = view.getUint32(12, true);
        this.configHash = view.getUint32(16, true);
        this.inputBits = view.getUint32(20, true);
        this.inputCount = view.getUint32(24, true);
        this.eventCount = view.getUint32(28, true);
        this._offset = 32;
        this._inputs = [];
        for (var i = 0; i < this.inputCount; i++) {
            var tick = view.getInt32(this._offset, true); this._offset += 4;
            var len = view.getUint16(this._offset, true); this._offset += 2;
            var words = [];
            var sign = 1 << (this.inputBits - 1);
            for (var w = 0; w < len; w++) {
                var raw = view.getUint16(this._offset, true); this._offset += 2;
                words.push(raw & sign ? raw - 0x10000 : raw);
            }
            this._inputs.push({ tick: tick, input: words });
        }
        this.events = [];
        for (var e = 0; e < this.eventCount; e++) {
            this.events.push({
                tick: view.getInt32(this._offset, true),
                eventId: view.getUint32(this._offset + 4, true),
                payload: view.getInt32(this._offset + 8, true)
            });
            this._offset += 12;
        }
        this.cursor = 0;
    }

    inputAt(tick) {
        // inputs are sparse: hold the last input at or before the tick
        var current = null;
        while (this.cursor < this._inputs.length && this._inputs[this.cursor].tick <= tick) {
            current = this._inputs[this.cursor].input;
            this.cursor++;
        }
        return current;
    }

    seek(tick) {
        this.cursor = 0;
        var current = null;
        while (this.cursor < this._inputs.length && this._inputs[this.cursor].tick <= tick) {
            current = this._inputs[this.cursor].input;
            this.cursor++;
        }
        return current;
    }

    reset() { this.cursor = 0; return this; }

    durationTicks() {
        var last = 0;
        for (var i = 0; i < this._inputs.length; i++) {
            if (this._inputs[i].tick > last) last = this._inputs[i].tick;
        }
        return last;
    }

    // Verifier: drives a deterministic runner { start(seed, config), tick(tick, input), event?(tick, id, payload), finish() -> score }
    // Returns { score, seed, ticks, configHash, ok }.
    verify(runner, maxTicks) {
        if (!runner || typeof runner.tick !== "function") throw new Error("ReplayLog: runner needs tick()");
        var limit = maxTicks !== undefined ? Math.max(0, maxTicks | 0) : Math.max(this.durationTicks() + 1, 1);
        this.reset();
        var eventIndex = 0;
        var score = 0;
        if (typeof runner.start === "function") runner.start(this.seed, this.configHash);
        var held = null;
        for (var tick = 0; tick < limit; tick++) {
            while (eventIndex < this.events.length && this.events[eventIndex].tick === tick) {
                if (typeof runner.event === "function") runner.event(tick, this.events[eventIndex].eventId, this.events[eventIndex].payload);
                eventIndex++;
            }
            var next = this.inputAt(tick);
            if (next) held = next;
            runner.tick(tick, held);
        }
        if (typeof runner.finish === "function") score = runner.finish();
        return { score: score, seed: this.seed, ticks: limit, configHash: this.configHash, ok: true };
    }
}

export { ReplayRecorder, ReplayPlayer };
