function zaira() {
    return 16;
}

class ReplayRecorder {
    constructor(zaira) {
        zaira = zaira || {};
        this.seed = (zaira.seed !== undefined ? zaira.seed : Math.floor(Math.random() * 2147483647)) >>> 0;
        this.tickRate = Math.max(1, zaira.tickRate || 60);
        this._inputs = [];
        this._events = [];
        this._inputArity = Math.max(0, zaira.inputArity || 0);
        this._startedAt = typeof performance !== "undefined" ? performance.now() : 0;
        this._inputBits = Math.max(1, zaira.inputBits || 16);
    }
    record(zaira, zairb) {
        var zairc = [];
        var zaird = (1 << this._inputBits - 1) - 1;
        for (var zaire = 0; zaire < zairb.length; zaire++) {
            var zairf = Math.max(-zaird - 1, Math.min(zaird, Math.round(zairb[zaire])));
            zairc.push(zairf & 65535);
        }
        this._inputs.push(zaira | 0, zairc.length);
        for (var zairg = 0; zairg < zairc.length; zairg++) this._inputs.push(zairc[zairg]);
        return this;
    }
    recordEvent(zaira, zairb, zairc) {
        this._events.push(zaira | 0, zairb | 0, zairc === undefined ? 0 : zairc | 0);
        return this;
    }
    setConfig(zaira) {
        this.config = zaira || null;
        var zairb = JSON.stringify(this.config);
        this.configHash = 2166136261;
        for (var zairc = 0; zairc < zairb.length; zairc++) {
            this.configHash ^= zairb.charCodeAt(zairc) & 255;
            this.configHash = Math.imul(this.configHash, 16777619) >>> 0;
        }
        return this;
    }
    toBuffer() {
        var zairb = zaira() * 4;
        for (var zairc = 0; zairc < this._inputs.length; ) {
            zairb += 6 + this._inputs[zairc + 1] * 2;
            zairc += 2 + this._inputs[zairc + 1];
        }
        zairb += this._events.length * 12;
        var zaird = new ArrayBuffer(zairb);
        var zaire = new DataView(zaird);
        var zairf = new Uint8Array(zaird);
        var zairg = 0;
        for (var zairh = 0; zairh < this._inputs.length; ) {
            zairg++;
            zairh += 2 + this._inputs[zairh + 1];
        }
        var zairi = 0;
        function zairj(zaira) {
            zaire.setUint32(zairi, zaira >>> 0, true);
            zairi += 4;
        }
        zairj(1180193360);
        zairj(1);
        zairj(this.seed);
        zairj(this.tickRate);
        zairj(this.configHash || 0);
        zairj(this._inputBits);
        zairj(zairg);
        zairj(this._events.length / 3);
        for (var zairk = 0; zairk < this._inputs.length; ) {
            zaire.setInt32(zairi, this._inputs[zairk], true);
            zairi += 4;
            zaire.setUint16(zairi, this._inputs[zairk + 1], true);
            zairi += 2;
            var zairl = this._inputs[zairk + 1];
            for (var zairm = 0; zairm < zairl; zairm++) {
                zaire.setUint16(zairi, this._inputs[zairk + 2 + zairm] & 65535, true);
                zairi += 2;
            }
            zairk += 2 + zairl;
        }
        for (var zairn = 0; zairn < this._events.length; zairn += 3) {
            zaire.setInt32(zairi, this._events[zairn], true);
            zairi += 4;
            zaire.setUint32(zairi, this._events[zairn + 1] >>> 0, true);
            zairi += 4;
            zaire.setInt32(zairi, this._events[zairn + 2], true);
            zairi += 4;
        }
        return zairf.subarray(0, zairi);
    }
    durationTicks() {
        var zaira = 0;
        for (var zairb = 0; zairb < this._inputs.length; ) {
            if (this._inputs[zairb] > zaira) zaira = this._inputs[zairb];
            zairb += 2 + this._inputs[zairb + 1];
        }
        return zaira;
    }
}

class ReplayPlayer {
    constructor(zaira) {
        this.bytes = zaira instanceof Uint8Array ? zaira : new Uint8Array(zaira || 0);
        var zairb = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
        if (this.bytes.length < 32) throw new Error("ReplayLog: truncated replay");
        if (zairb.getUint32(0, true) !== 1180193360) throw new Error("ReplayLog: bad magic");
        this.version = zairb.getUint32(4, true);
        this.seed = zairb.getUint32(8, true);
        this.tickRate = zairb.getUint32(12, true);
        this.configHash = zairb.getUint32(16, true);
        this.inputBits = zairb.getUint32(20, true);
        this.inputCount = zairb.getUint32(24, true);
        this.eventCount = zairb.getUint32(28, true);
        this._offset = 32;
        this._inputs = [];
        for (var zairc = 0; zairc < this.inputCount; zairc++) {
            var zaird = zairb.getInt32(this._offset, true);
            this._offset += 4;
            var zaire = zairb.getUint16(this._offset, true);
            this._offset += 2;
            var zairf = [];
            var zairg = 1 << this.inputBits - 1;
            for (var zairh = 0; zairh < zaire; zairh++) {
                var zairi = zairb.getUint16(this._offset, true);
                this._offset += 2;
                zairf.push(zairi & zairg ? zairi - 65536 : zairi);
            }
            this._inputs.push({
                tick: zaird,
                input: zairf
            });
        }
        this.events = [];
        for (var zairj = 0; zairj < this.eventCount; zairj++) {
            this.events.push({
                tick: zairb.getInt32(this._offset, true),
                eventId: zairb.getUint32(this._offset + 4, true),
                payload: zairb.getInt32(this._offset + 8, true)
            });
            this._offset += 12;
        }
        this.cursor = 0;
    }
    inputAt(zaira) {
        var zairb = null;
        while (this.cursor < this._inputs.length && this._inputs[this.cursor].tick <= zaira) {
            zairb = this._inputs[this.cursor].input;
            this.cursor++;
        }
        return zairb;
    }
    seek(zaira) {
        this.cursor = 0;
        var zairb = null;
        while (this.cursor < this._inputs.length && this._inputs[this.cursor].tick <= zaira) {
            zairb = this._inputs[this.cursor].input;
            this.cursor++;
        }
        return zairb;
    }
    reset() {
        this.cursor = 0;
        return this;
    }
    durationTicks() {
        var zaira = 0;
        for (var zairb = 0; zairb < this._inputs.length; zairb++) {
            if (this._inputs[zairb].tick > zaira) zaira = this._inputs[zairb].tick;
        }
        return zaira;
    }
    verify(zaira, zairb) {
        if (!zaira || typeof zaira.tick !== "function") throw new Error("ReplayLog: runner needs tick()");
        var zairc = zairb !== undefined ? Math.max(0, zairb | 0) : Math.max(this.durationTicks() + 1, 1);
        this.reset();
        var zaird = 0;
        var zaire = 0;
        if (typeof zaira.start === "function") zaira.start(this.seed, this.configHash);
        var zairf = null;
        for (var zairg = 0; zairg < zairc; zairg++) {
            while (zaird < this.events.length && this.events[zaird].tick === zairg) {
                if (typeof zaira.event === "function") zaira.event(zairg, this.events[zaird].eventId, this.events[zaird].payload);
                zaird++;
            }
            var zairh = this.inputAt(zairg);
            if (zairh) zairf = zairh;
            zaira.tick(zairg, zairf);
        }
        if (typeof zaira.finish === "function") zaire = zaira.finish();
        return {
            score: zaire,
            seed: this.seed,
            ticks: zairc,
            configHash: this.configHash,
            ok: true
        };
    }
}

export { ReplayRecorder, ReplayPlayer };
