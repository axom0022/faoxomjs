import { FixedSimulation } from "./FixedSimulation.js";

function zaida(zaida, zaidb) {
    var zaidc = (zaidb || 2166136261) >>> 0;
    for (var zaidd = 0; zaidd < zaida.length; zaidd++) {
        zaidc ^= zaida[zaidd];
        zaidc = Math.imul(zaidc, 16777619) >>> 0;
    }
    return zaidc >>> 0;
}

class NetcodeSession {
    constructor(zaida) {
        zaida = zaida || {};
        this.localId = zaida.localId !== undefined ? zaida.localId : 0;
        this.tickRate = Math.max(10, zaida.tickRate || 60);
        this.hashInterval = Math.max(1, zaida.hashInterval || 30);
        this.inputDelay = Math.max(0, zaida.inputDelay || 2);
        this.maxRollback = Math.max(0, zaida.maxRollback || 0);
        this.peers = {};
        this._inputs = {};
        this._localInputs = {};
        this._confirmedTick = 0;
        this.currentTick = 0;
        this.desyncDetected = false;
        this.kicked = null;
        this.onSendInputs = typeof zaida.onSendInputs === "function" ? zaida.onSendInputs : null;
        this.onSendHash = typeof zaida.onSendHash === "function" ? zaida.onSendHash : null;
        this.onKick = typeof zaida.onKick === "function" ? zaida.onKick : null;
        this.onDesync = typeof zaida.onDesync === "function" ? zaida.onDesync : null;
        this._hashes = {};
        this._sim = zaida.simulation || null;
    }
    submitLocalInput(zaida, zaidb) {
        var zaidc = {
            type: "input",
            peer: this.localId,
            tick: zaida,
            input: Array.isArray(zaidb) || zaidb instanceof Float32Array ? Array.from(zaidb) : [ Number(zaidb) || 0 ]
        };
        this.receiveMessage(zaidc);
        if (this.onSendInputs) this.onSendInputs(zaidc);
        return zaidc;
    }
    receiveMessage(zaida) {
        if (!zaida || typeof zaida !== "object") return;
        if (zaida.type === "input") {
            var zaidb = zaida.tick | 0;
            var zaidc = zaida.peer;
            if (!this._inputs[zaidb]) this._inputs[zaidb] = {};
            this._inputs[zaidb][zaidc] = zaida.input;
            if (!this.peers[zaidc]) this.peers[zaidc] = {
                lastTick: -1,
                hashes: {},
                missed: 0
            };
            this.peers[zaidc].lastTick = Math.max(this.peers[zaidc].lastTick, zaidb);
        } else if (zaida.type === "hash") {
            var zaidd = zaida.peer;
            if (!this.peers[zaidd]) this.peers[zaidd] = {
                lastTick: -1,
                hashes: {},
                missed: 0
            };
            this.peers[zaidd].hashes[zaida.tick | 0] = zaida.hash >>> 0;
            this._compareHashes(zaida.tick | 0);
        } else if (zaida.type === "kick") {
            if (zaida.target === this.localId) {
                this.kicked = {
                    by: zaida.peer,
                    reason: zaida.reason || "hash mismatch"
                };
                if (this.onKick) this.onKick(this.kicked);
            }
        }
    }
    addPeer(zaida) {
        if (!this.peers[zaida]) this.peers[zaida] = {
            lastTick: -1,
            hashes: {},
            missed: 0
        };
        return this;
    }
    removePeer(zaida) {
        delete this.peers[zaida];
        return this;
    }
    peerIds() {
        var zaida = [ this.localId ];
        for (var zaidb in this.peers) zaida.push(Number(zaidb));
        return zaida;
    }
    tickReady(zaida) {
        var zaidb = this._inputs[zaida];
        if (!zaidb || zaidb[this.localId] === undefined) return false;
        for (var zaidc in this.peers) {
            if (zaidb[zaidc] === undefined) return false;
        }
        return true;
    }
    inputsForTick(zaida) {
        var zaidb = this._inputs[zaida] || {};
        var zaidc = this.peerIds().sort(function(zaida, zaidb) {
            return zaida - zaidb;
        });
        var zaidd = [];
        for (var zaide = 0; zaide < zaidc.length; zaide++) {
            var zaidf = zaidb[zaidc[zaide]] || [];
            for (var zaidg = 0; zaidg < zaidf.length; zaidg++) zaidd.push(Number(zaidf[zaidg]) || 0);
        }
        return zaidd;
    }
    advanceTick() {
        delete this._inputs[this.currentTick - this.maxRollback - 8];
        this.currentTick++;
        if (this.currentTick % this.hashInterval === 0) return true;
        return false;
    }
    hashState(zaidb, zaidc) {
        var zaidd;
        if (zaidb instanceof Float32Array) zaidd = new Uint8Array(zaidb.buffer, zaidb.byteOffset, zaidb.byteLength); else if (zaidb && zaidb.buffer instanceof ArrayBuffer) zaidd = new Uint8Array(zaidb.buffer, zaidb.byteOffset || 0, zaidb.byteLength); else {
            var zaide = JSON.stringify(zaidb, function(zaida, zaidb) {
                return zaidb instanceof Float32Array ? Array.from(zaidb) : zaidb;
            });
            if (typeof TextEncoder !== "undefined") zaidd = (new TextEncoder).encode(zaide); else {
                zaidd = new Uint8Array(zaide.length);
                for (var zaidf = 0; zaidf < zaide.length; zaidf++) zaidd[zaidf] = zaide.charCodeAt(zaidf) & 255;
            }
        }
        var zaidg = zaida(zaidd, 2166136261 ^ (zaidc | 0));
        this._hashes[zaidc] = zaidg;
        this._compareHashes(zaidc);
        var zaidh = {
            type: "hash",
            peer: this.localId,
            tick: zaidc,
            hash: zaidg
        };
        if (this.onSendHash) this.onSendHash(zaidh);
        return zaidg;
    }
    _compareHashes(zaida) {
        var zaidb = this._hashes[zaida];
        if (zaidb === undefined) return;
        var zaidc = 1, zaidd = {};
        for (var zaide in this.peers) {
            var zaidf = this.peers[zaide].hashes[zaida];
            if (zaidf === undefined) continue;
            if (zaidf === zaidb) zaidc++; else zaidd[zaide] = zaidf;
        }
        var zaidg = zaidc + Object.keys(zaidd).length;
        if (Object.keys(zaidd).length && !this.desyncDetected) {
            this.desyncDetected = true;
            if (this.onDesync) this.onDesync(zaida, zaidb, zaidd);
        }
        if (zaidg >= 3 && Object.keys(zaidd).length > 0 && zaidc >= Math.ceil(zaidg / 2) && zaidc > Object.keys(zaidd).length) {
            for (var zaidh in zaidd) {
                if (this.onKick) this.onKick({
                    peer: this.localId,
                    target: Number(zaidh),
                    tick: zaida,
                    reason: "state hash mismatch"
                });
                if (this.onSendInputs) this.onSendInputs({
                    type: "kick",
                    peer: this.localId,
                    target: Number(zaidh),
                    reason: "state hash mismatch"
                });
                this.removePeer(Number(zaidh));
            }
        } else if (zaidg < 3 && Object.keys(zaidd).length > 0 && zaidc === 1) {
            this.kicked = {
                by: null,
                reason: "unresolvable hash mismatch (need 3+ peers for majority vote)"
            };
            if (this.onKick) this.onKick(this.kicked);
        }
    }
    attach(zaida, zaidb) {
        this._sim = zaida || null;
        this._stateProvider = null;
        if (zaidb) this._stateProvider = zaidb; else if (zaida && typeof zaida.state === "function") this._stateProvider = function() {
            return zaida.state();
        };
        return this;
    }
    stepIfReady() {
        if (!this.tickReady(this.currentTick)) return false;
        var zaida = this.currentTick;
        if (this._sim) {
            this._sim.pushInput(zaida, this.inputsForTick(zaida));
            this._sim.stepOnce();
        }
        var zaidb = this.advanceTick();
        if (zaidb && this._stateProvider) this.hashState(this._stateProvider(), zaida);
        return true;
    }
}

export { NetcodeSession };
