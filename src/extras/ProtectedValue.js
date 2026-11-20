var zaima = 0;

function zaimb(zaima, zaimb) {
    return zaima << zaimb | zaima >>> 32 - zaimb;
}

function zaimc(zaima, zaimc, zaimd) {
    zaima = (zaima ^ zaimd >>> 16) >>> 0;
    zaimc = (zaimc ^ zaimb(zaimd, 19)) >>> 0;
    zaimd = Math.imul(zaimd, 73244475) >>> 0;
    zaimd = (zaimd ^ zaimd >>> 15) >>> 0;
    return (Math.imul(zaima ^ zaimd, 2654435761) >>> 0 ^ zaimc) >>> 0;
}

class ProtectedValue {
    constructor(zaima, zaimb) {
        zaimb = zaimb || {};
        this._masked = 0;
        this._key = Math.random() * 4294967295 >>> 0;
        this._checksum = 0;
        this.tamperCount = 0;
        this.onTamper = typeof zaimb.onTamper === "function" ? zaimb.onTamper : null;
        this.honeypot = 0;
        this.set(typeof zaima === "number" ? zaima : 0);
        ProtectedValue._instances.push(this);
    }
    static rotateFrameKey(zaimb) {
        var zaimd = zaima;
        var zaime = zaimc(zaimd, (zaimb || Date.now()) >>> 0, 656542357);
        for (var zaimf = 0; zaimf < ProtectedValue._instances.length; zaimf++) {
            var zaimg = ProtectedValue._instances[zaimf];
            var zaimh = (zaimg._key ^ zaimd) >>> 0;
            if (zaimc(zaimg._masked, zaimh, 2246822507) !== zaimg._checksum) continue;
            var zaimi = (zaimg._masked ^ zaimh) >>> 0;
            var zaimj = (zaimg._key ^ zaime) >>> 0;
            zaimg._masked = (zaimi ^ zaimj) >>> 0;
            zaimg._checksum = zaimc(zaimg._masked, zaimj, 2246822507);
        }
        zaima = zaime;
        return zaima;
    }
    _workingKey() {
        return (this._key ^ zaima) >>> 0;
    }
    set(zaima) {
        this._key = Math.random() * 4294967295 >>> 0;
        var zaimb = new Float32Array(1);
        zaimb[0] = zaima;
        var zaimd = new Uint32Array(zaimb.buffer)[0];
        var zaime = this._workingKey();
        this._masked = (zaimd ^ zaime) >>> 0;
        this._checksum = zaimc(this._masked, zaime, 2246822507);
        this.honeypot = zaima;
        return this;
    }
    get() {
        var zaima = this._workingKey();
        if (zaimc(this._masked, zaima, 2246822507) !== this._checksum) {
            this.tamperCount++;
            if (this.onTamper) {
                try {
                    this.onTamper(this, "masked");
                } catch (zaima) {}
            }
            return this.honeypot;
        }
        var zaimb = new Float32Array(1);
        new Uint32Array(zaimb.buffer)[0] = (this._masked ^ zaima) >>> 0;
        return zaimb[0];
    }
    add(zaima) {
        this.set(this.get() + zaima);
        return this;
    }
    checkHoneypot() {
        var zaima = this.get();
        if (this.honeypot !== zaima) {
            this.tamperCount++;
            if (this.onTamper) {
                try {
                    this.onTamper(this, "honeypot");
                } catch (zaima) {}
            }
            return false;
        }
        return true;
    }
    valueOf() {
        return this.get();
    }
}

ProtectedValue._instances = [];

class BlindedInt32 {
    constructor(zaima, zaimb) {
        zaimb = zaimb || {};
        this._m = Math.random() * 65535 + 32769 | 0 | 1;
        this._o = Math.random() * 4294967295 >>> 0;
        this._stored = 0;
        this._inv = 0;
        this.tamperCount = 0;
        this.onTamper = typeof zaimb.onTamper === "function" ? zaimb.onTamper : null;
        this.honeypot = 0;
        this._set(typeof zaima === "number" ? Math.round(zaima) : 0);
    }
    _set(zaima) {
        this._stored = Math.imul(zaima, this._m) + this._o >>> 0;
        this.honeypot = zaima;
        return this;
    }
    _modInverse() {
        if (this._inv) return this._inv;
        var zaima = 1;
        for (var zaimb = 0; zaimb < 5; zaimb++) zaima = Math.imul(zaima, 2 - Math.imul(this._m, zaima));
        this._inv = zaima >>> 0 || 1;
        return this._inv;
    }
    _decode(zaima) {
        return Math.imul(zaima - this._o >>> 0, this._modInverse()) | 0;
    }
    reveal() {
        return this._decode(this._stored);
    }
    sub(zaima, zaimb) {
        this._stored = this._stored - Math.imul(Math.round(zaima), this._m) >>> 0;
        if (!zaimb) this.honeypot -= Math.round(zaima);
        return this._decode(this._stored);
    }
    add(zaima, zaimb) {
        return this.sub(-zaima, zaimb);
    }
    checkHoneypot() {
        var zaima = this.reveal();
        if (this.honeypot !== zaima) {
            this.tamperCount++;
            if (this.onTamper) {
                try {
                    this.onTamper(this, "honeypot");
                } catch (zaima) {}
            }
            return false;
        }
        return true;
    }
    valueOf() {
        return this.reveal();
    }
}

export { ProtectedValue, BlindedInt32 };
