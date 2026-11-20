// ProtectedValue - tamper resistant numeric state for anti-cheat. The real
// value is stored XORed with a key that rotates every frame; a decoy
// "honeypot" field holds the plaintext value and is checksummed so memory
// scanners that write to it are detected. BlindedInt32 keeps integers behind
// an affine transform so damage can be applied without ever decrypting.

var PROTECTED_FRAME_KEY = 0;

function faoxomrot32(x, k) {
    return (x << k) | (x >>> (32 - k));
}

function faoxommix32(a, b, c) {
    a = (a ^ (c >>> 16)) >>> 0;
    b = (b ^ faoxomrot32(c, 19)) >>> 0;
    c = (Math.imul(c, 0x45d9f3b) >>> 0);
    c = (c ^ (c >>> 15)) >>> 0;
    return ((Math.imul(a ^ c, 0x9e3779b1) >>> 0) ^ b) >>> 0;
}

class ProtectedValue {
    constructor(value, options) {
        options = options || {};
        this._masked = 0;
        this._key = (Math.random() * 0xffffffff) >>> 0;
        this._checksum = 0;
        this.tamperCount = 0;
        this.onTamper = typeof options.onTamper === "function" ? options.onTamper : null;
        this.honeypot = 0;
        this.set(typeof value === "number" ? value : 0);
        ProtectedValue._instances.push(this);
    }

    static rotateFrameKey(seed) {
        var oldFrameKey = PROTECTED_FRAME_KEY;
        var nextFrameKey = faoxommix32(oldFrameKey, (seed || Date.now()) >>> 0, 0x27220a95);
        for (var i = 0; i < ProtectedValue._instances.length; i++) {
            var item = ProtectedValue._instances[i];
            var oldKey = (item._key ^ oldFrameKey) >>> 0;
            if (faoxommix32(item._masked, oldKey, 0x85ebca6b) !== item._checksum) continue;
            var bits = (item._masked ^ oldKey) >>> 0;
            var newKey = (item._key ^ nextFrameKey) >>> 0;
            item._masked = (bits ^ newKey) >>> 0;
            item._checksum = faoxommix32(item._masked, newKey, 0x85ebca6b);
        }
        PROTECTED_FRAME_KEY = nextFrameKey;
        return PROTECTED_FRAME_KEY;
    }

    _workingKey() {
        return (this._key ^ PROTECTED_FRAME_KEY) >>> 0;
    }

    set(value) {
        this._key = (Math.random() * 0xffffffff) >>> 0;
        var f32 = new Float32Array(1);
        f32[0] = value;
        var bits = new Uint32Array(f32.buffer)[0];
        var key = this._workingKey();
        this._masked = (bits ^ key) >>> 0;
        this._checksum = faoxommix32(this._masked, key, 0x85ebca6b);
        this.honeypot = value;
        return this;
    }

    get() {
        var key = this._workingKey();
        if (faoxommix32(this._masked, key, 0x85ebca6b) !== this._checksum) {
            this.tamperCount++;
            if (this.onTamper) { try { this.onTamper(this, "masked"); } catch (e) { /* user callback */ } }
            return this.honeypot;
        }
        var f32 = new Float32Array(1);
        new Uint32Array(f32.buffer)[0] = (this._masked ^ key) >>> 0;
        return f32[0];
    }

    add(delta) { this.set(this.get() + delta); return this; }

    // Compares the decoy against the true value and reports drift as tampering.
    checkHoneypot() {
        var real = this.get();
        if (this.honeypot !== real) {
            this.tamperCount++;
            if (this.onTamper) { try { this.onTamper(this, "honeypot"); } catch (e) { /* user callback */ } }
            return false;
        }
        return true;
    }

    valueOf() { return this.get(); }
}

ProtectedValue._instances = [];

// stored = (real * multiplier + offset) mod 2^32. Arithmetic runs directly on
// the encoded form; the true integer only materializes on reveal().
class BlindedInt32 {
    constructor(value, options) {
        options = options || {};
        this._m = (((Math.random() * 0xffff) + 0x8001) | 0) | 1; // odd multiplier
        this._o = (Math.random() * 0xffffffff) >>> 0;
        this._stored = 0;
        this._inv = 0;
        this.tamperCount = 0;
        this.onTamper = typeof options.onTamper === "function" ? options.onTamper : null;
        this.honeypot = 0;
        this._set(typeof value === "number" ? Math.round(value) : 0);
    }

    _set(real) {
        this._stored = (Math.imul(real, this._m) + this._o) >>> 0;
        this.honeypot = real;
        return this;
    }

    _modInverse() {
        if (this._inv) return this._inv;
        var inv = 1;
        for (var i = 0; i < 5; i++) inv = Math.imul(inv, 2 - Math.imul(this._m, inv));
        this._inv = inv >>> 0 || 1;
        return this._inv;
    }

    _decode(stored) {
        return Math.imul((stored - this._o) >>> 0, this._modInverse()) | 0;
    }

    reveal() { return this._decode(this._stored); }

    // subtract runs on the encoded form: (real - d) * m + o = stored - d * m
    sub(delta, silent) {
        this._stored = (this._stored - Math.imul(Math.round(delta), this._m)) >>> 0;
        if (!silent) this.honeypot -= Math.round(delta);
        return this._decode(this._stored);
    }

    add(delta, silent) { return this.sub(-delta, silent); }

    checkHoneypot() {
        var real = this.reveal();
        if (this.honeypot !== real) {
            this.tamperCount++;
            if (this.onTamper) { try { this.onTamper(this, "honeypot"); } catch (e) { /* user callback */ } }
            return false;
        }
        return true;
    }

    valueOf() { return this.reveal(); }
}

export { ProtectedValue, BlindedInt32 };
