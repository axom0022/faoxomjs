// AntiTamper - runtime integrity toolkit: prototype freezing, cross-clock
// speedhack detection, trusted input filtering, canary guard grids over
// engine memory, timing-entangled rolling keys and hardware-attested seeds.

function faoxomtampermix(a, b) {
    a = (a ^ 0x9e3779b9) >>> 0;
    a = Math.imul(a ^ (a >>> 16), 0x85ebca6b) >>> 0;
    a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35) >>> 0;
    return (a ^ (b || 0)) >>> 0;
}

var FROZEN_DEFAULTS = ["WebGL2RenderingContext", "WebGLRenderingContext", "GPUDevice", "WebGPUDevice"];

class CanaryGrid {
    // Guard grid over a backing buffer: values live at stride-aligned slots,
    // every other slot holds a checksum of its neighbors plus the frame tick.
    constructor(capacity, options) {
        options = options || {};
        this.stride = 8; // 1 data dword + 7 canary dwords
        var slots = Math.max(1, Math.ceil(capacity / 4));
        this.buffer = new ArrayBuffer(slots * this.stride * 4);
        this.view = new Uint32Array(this.buffer);
        this.tick = 0;
        this.tamperCount = 0;
        this.onTamper = typeof options.onTamper === "function" ? options.onTamper : null;
        this._seed = (Math.random() * 0xffffffff) >>> 0;
        for (var i = 0; i < slots; i++) this._stamp(i, 0);
    }

    _stamp(slot, value) {
        var base = slot * this.stride;
        this.view[base] = value;
        for (var c = 1; c < this.stride; c++) {
            this.view[base + c] = faoxomtampermix(this._seed ^ faoxomtampermix(slot, c), this.tick ^ value);
        }
    }

    set(slot, value) {
        value = value >>> 0;
        this._stamp(slot, value);
    }

    get(slot) {
        var base = slot * this.stride;
        var value = this.view[base];
        for (var c = 1; c < this.stride; c++) {
            if (this.view[base + c] !== faoxomtampermix(this._seed ^ faoxomtampermix(slot, c), this.tick ^ value)) {
                this.tamperCount++;
                if (this.onTamper) { try { this.onTamper(slot, "canary"); } catch (e) { /* user callback */ } }
                return this.view[base];
            }
        }
        return value;
    }

    verify() {
        var slots = this.view.length / this.stride;
        var clean = true;
        for (var i = 0; i < slots; i++) {
            var base = i * this.stride;
            var value = this.view[base];
            for (var c = 1; c < this.stride; c++) {
                if (this.view[base + c] !== faoxomtampermix(this._seed ^ faoxomtampermix(i, c), this.tick ^ value)) {
                    this.tamperCount++;
                    clean = false;
                    if (this.onTamper) { try { this.onTamper(i, "canary"); } catch (e) { /* user callback */ } }
                    break;
                }
            }
        }
        return clean;
    }

    advanceTick() {
        this.tick = (this.tick + 1) >>> 0;
        var slots = this.view.length / this.stride;
        for (var i = 0; i < slots; i++) this._stamp(i, this.view[i * this.stride]);
        return this;
    }
}

class SpeedhackDetector {
    // Compares three clocks against fixed simulation ticks. A tool that
    // accelerates rAF or hooks Date.now desynchronizes the ratios.
    constructor(options) {
        options = options || {};
        this.tolerance = options.tolerance || 0.12;
        this.window = Math.max(30, options.window || 120);
        this._samples = [];
        this._performanceNow = options.performanceNow || function () { return typeof performance !== "undefined" ? performance.now() : Date.now(); };
        this._dateNow = options.dateNow || function () { return Date.now(); };
        this._perfStart = this._performanceNow();
        this._dateStart = this._dateNow();
        this._tickStart = 0;
        this.ticks = 0;
        this.suspect = false;
        this.onSuspect = typeof options.onSuspect === "function" ? options.onSuspect : null;
    }

    tick() {
        this.ticks++;
        if (this.ticks % 5 !== 0) return this;
        var perfDelta = this._performanceNow() - this._perfStart;
        var dateDelta = this._dateNow() - this._dateStart;
        if (perfDelta > 500 && dateDelta > 500) {
            this._samples.push(dateDelta / perfDelta);
            if (this._samples.length > this.window) this._samples.shift();
            var avg = 0;
            for (var i = 0; i < this._samples.length; i++) avg += this._samples[i];
            avg /= this._samples.length || 1;
            if (Math.abs(avg - 1) > this.tolerance && this._samples.length >= 12) {
                this.suspect = true;
                if (this.onSuspect) { try { this.onSuspect(avg); } catch (e) { /* user callback */ } }
            } else if (Math.abs(avg - 1) <= this.tolerance * 0.5) {
                this.suspect = false;
            }
        }
        return this;
    }
}

class TrustedInput {
    // Wraps event listeners so synthetic events (auto clickers, userscript
    // dispatchEvent) never reach gameplay handlers.
    constructor(options) {
        options = options || {};
        this.strict = options.strict !== false;
        this.rejected = 0;
        this.onReject = typeof options.onReject === "function" ? options.onReject : null;
        this._targets = [];
    }

    attach(target, types, handler) {
        var self = this;
        var wrapped = function (event) {
            if (self.strict && event && event.isTrusted === false) {
                self.rejected++;
                if (self.onReject) { try { self.onReject(event); } catch (e) { /* user callback */ } }
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            handler(event);
        };
        var list = Array.isArray(types) ? types : String(types).split(/\s+/).filter(Boolean);
        for (var i = 0; i < list.length; i++) target.addEventListener(list[i], wrapped, { passive: false });
        this._targets.push({ target: target, types: list, wrapped: wrapped });
        return this;
    }

    detach() {
        for (var i = 0; i < this._targets.length; i++) {
            var entry = this._targets[i];
            for (var t = 0; t < entry.types.length; t++) entry.target.removeEventListener(entry.types[t], entry.wrapped);
        }
        this._targets = [];
        return this;
    }
}

class FrameKeyChain {
 // Rolling key chain: frame N+1 key derives from frame N state hash and the
 // measured frame duration. Pausing in a debugger for longer than the valid
 // window invalidates the chain and every later decode turns to garbage.
    constructor(options) {
        options = options || {};
        this.maxFrameMs = Math.max(8, options.maxFrameMs || 250);
        this.key = (Math.random() * 0xffffffff) >>> 0;
        this.valid = true;
        this._last = performance.now();
        this._hash = (Math.random() * 0xffffffff) >>> 0;
        this.onInvalidate = typeof options.onInvalidate === "function" ? options.onInvalidate : null;
    }

    advance(stateHash) {
        var now = performance.now();
        var delta = now - this._last;
        this._last = now;
        if (delta < 0 || delta > this.maxFrameMs) {
            this.valid = false;
            if (this.onInvalidate) { try { this.onInvalidate(delta); } catch (e) { /* user callback */ } }
        }
        this._hash = faoxomtampermix(this._hash, stateHash >>> 0);
        this.key = faoxomtampermix(this.key, this._hash ^ Math.min(delta, this.maxFrameMs));
        return this.key;
    }

    mask(value) {
        var f32 = new Float32Array(1);
        f32[0] = value;
        var bits = new Uint32Array(f32.buffer)[0] ^ (this.valid ? this.key : 0xdeadc0de);
        f32[0] = 0; // keep the true bits out of any lingering register
        new Uint32Array(f32.buffer)[0] = bits;
        return f32[0];
    }

    unmask(masked) {
        var f32 = new Float32Array(1);
        f32[0] = masked;
        var bits = new Uint32Array(f32.buffer)[0] ^ (this.valid ? this.key : 0xdeadc0de);
        new Uint32Array(f32.buffer)[0] = bits;
        return f32[0];
    }
}

var AntiTamper = {
    CanaryGrid: CanaryGrid,
    SpeedhackDetector: SpeedhackDetector,
    TrustedInput: TrustedInput,
    FrameKeyChain: FrameKeyChain,

    // Freezes rendering/timing prototypes so injected scripts cannot hook
    // draw calls or swap the clock. Irreversible for the page lifetime: only
    // call once gameplay starts.
    freezePrototypes: function (names) {
        var list = names && names.length ? names : FROZEN_DEFAULTS;
        var frozen = [];
        for (var i = 0; i < list.length; i++) {
            var ctor = typeof globalThis !== "undefined" ? globalThis[list[i]] : null;
            if (ctor && ctor.prototype && !Object.isFrozen(ctor.prototype)) {
                try { Object.freeze(ctor.prototype); frozen.push(list[i]); } catch (e) { /* not freezable */ }
            }
        }
        return frozen;
    },

    // Derives a 32 bit seed from a WebAuthn hardware signature when an
    // authenticator is available; falls back to crypto randomness.
    hardwareSeed: async function (challenge) {
        var bytes = new Uint8Array(32);
        if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(bytes);
        var fallback = 0;
        for (var i = 0; i < bytes.length; i += 4) fallback = faoxomtampermix(fallback, (bytes[i] | bytes[i + 1] << 8 | bytes[i + 2] << 16 | bytes[i + 3] << 24) >>> 0);
        if (typeof navigator === "undefined" || !navigator.credentials || !navigator.credentials.create) return { seed: fallback, hardware: false };
        try {
            var seedMaterial = new Uint8Array(32);
            if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(seedMaterial);
            var credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge || seedMaterial,
                    rp: { name: "faoxomjs" },
                    user: { id: bytes.slice(0, 16), name: "faoxom-session", displayName: "faoxom-session" },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                    authenticatorSelection: { userVerification: "preferred" },
                    timeout: 30000
                }
            });
            if (credential && credential.rawId) {
                var mixed = 0x12345678;
                for (var b = 0; b < credential.rawId.byteLength; b++) mixed = faoxomtampermix(mixed, credential.rawId[b]);
                return { seed: mixed >>> 0, hardware: true };
            }
        } catch (e) { /* no authenticator or dismissed */ }
        return { seed: fallback, hardware: false };
    }
};

export { AntiTamper, CanaryGrid, SpeedhackDetector, TrustedInput, FrameKeyChain };
