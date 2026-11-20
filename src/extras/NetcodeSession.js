// NetcodeSession - deterministic lockstep multiplayer core. Peers exchange
// raw inputs instead of positions, every client advances the same fixed
// timestep simulation, and periodic state hashes expose divergence. With 3+
// peers a majority vote kicks the session whose hashes disagree.

import { FixedSimulation } from "./FixedSimulation.js";

function fnv1a32(u8, seed) {
    var hash = (seed || 0x811c9dc5) >>> 0;
    for (var i = 0; i < u8.length; i++) {
        hash ^= u8[i];
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

class NetcodeSession {
    constructor(options) {
        options = options || {};
        this.localId = options.localId !== undefined ? options.localId : 0;
        this.tickRate = Math.max(10, options.tickRate || 60);
        this.hashInterval = Math.max(1, options.hashInterval || 30);
        this.inputDelay = Math.max(0, options.inputDelay || 2);
        this.maxRollback = Math.max(0, options.maxRollback || 0);
        this.peers = {}; // id -> { lastTick, hashes: {tick -> hash}, missed }
        this._inputs = {}; // tick -> { peerId -> inputFloatArray }
        this._localInputs = {};
        this._confirmedTick = 0;
        this.currentTick = 0;
        this.desyncDetected = false;
        this.kicked = null;
        this.onSendInputs = typeof options.onSendInputs === "function" ? options.onSendInputs : null;
        this.onSendHash = typeof options.onSendHash === "function" ? options.onSendHash : null;
        this.onKick = typeof options.onKick === "function" ? options.onKick : null;
        this.onDesync = typeof options.onDesync === "function" ? options.onDesync : null;
        this._hashes = {};
        this._sim = options.simulation || null;
    }

    // Feed one local input for the given tick. Returns the envelope the
    // transport should broadcast to peers.
    submitLocalInput(tick, input) {
        var payload = {
            type: "input",
            peer: this.localId,
            tick: tick,
            input: Array.isArray(input) || input instanceof Float32Array ? Array.from(input) : [Number(input) || 0]
        };
        this.receiveMessage(payload);
        if (this.onSendInputs) this.onSendInputs(payload);
        return payload;
    }

    // Transport calls this for every message that arrives from a peer.
    receiveMessage(message) {
        if (!message || typeof message !== "object") return;
        if (message.type === "input") {
            var tick = message.tick | 0;
            var peer = message.peer;
            if (!this._inputs[tick]) this._inputs[tick] = {};
            this._inputs[tick][peer] = message.input;
            if (!this.peers[peer]) this.peers[peer] = { lastTick: -1, hashes: {}, missed: 0 };
            this.peers[peer].lastTick = Math.max(this.peers[peer].lastTick, tick);
        } else if (message.type === "hash") {
            var peerId = message.peer;
            if (!this.peers[peerId]) this.peers[peerId] = { lastTick: -1, hashes: {}, missed: 0 };
            this.peers[peerId].hashes[message.tick | 0] = message.hash >>> 0;
            this._compareHashes(message.tick | 0);
        } else if (message.type === "kick") {
            if (message.target === this.localId) {
                this.kicked = { by: message.peer, reason: message.reason || "hash mismatch" };
                if (this.onKick) this.onKick(this.kicked);
            }
        }
    }

    addPeer(id) {
        if (!this.peers[id]) this.peers[id] = { lastTick: -1, hashes: {}, missed: 0 };
        return this;
    }

    removePeer(id) { delete this.peers[id]; return this; }

    peerIds() {
        var ids = [this.localId];
        for (var id in this.peers) ids.push(Number(id));
        return ids;
    }

    // A tick is ready once every known peer (including us) has an input.
    tickReady(tick) {
        var bucket = this._inputs[tick];
        if (!bucket || bucket[this.localId] === undefined) return false;
        for (var id in this.peers) {
            if (bucket[id] === undefined) return false;
        }
        return true;
    }

    // Inputs for a tick, in stable peer order, ready to hand a deterministic sim.
    inputsForTick(tick) {
        var bucket = this._inputs[tick] || {};
        var ids = this.peerIds().sort(function (a, b) { return a - b; });
        var merged = [];
        for (var i = 0; i < ids.length; i++) {
            var input = bucket[ids[i]] || [];
            for (var j = 0; j < input.length; j++) merged.push(Number(input[j]) || 0);
        }
        return merged;
    }

    advanceTick() {
        delete this._inputs[this.currentTick - this.maxRollback - 8];
        this.currentTick++;
        if (this.currentTick % this.hashInterval === 0) return true; // caller should hash
        return false;
    }

    // Hash a state snapshot. Accepts Float32Array (the physics buffer) or any
    // object with a .buffer to read raw bytes deterministically.
    hashState(state, tick) {
        var bytes;
        if (state instanceof Float32Array) bytes = new Uint8Array(state.buffer, state.byteOffset, state.byteLength);
        else if (state && state.buffer instanceof ArrayBuffer) bytes = new Uint8Array(state.buffer, state.byteOffset || 0, state.byteLength);
        else {
            var encoded = JSON.stringify(state, function (key, value) {
                return value instanceof Float32Array ? Array.from(value) : value;
            });
            if (typeof TextEncoder !== "undefined") bytes = new TextEncoder().encode(encoded);
            else {
                bytes = new Uint8Array(encoded.length);
                for (var c = 0; c < encoded.length; c++) bytes[c] = encoded.charCodeAt(c) & 0xff;
            }
        }
        var hash = fnv1a32(bytes, 0x811c9dc5 ^ (tick | 0));
        this._hashes[tick] = hash;
        this._compareHashes(tick);
        var payload = { type: "hash", peer: this.localId, tick: tick, hash: hash };
        if (this.onSendHash) this.onSendHash(payload);
        return hash;
    }

    _compareHashes(tick) {
        var mine = this._hashes[tick];
        if (mine === undefined) return;
        var agree = 1, disagree = {};
        for (var id in this.peers) {
            var theirs = this.peers[id].hashes[tick];
            if (theirs === undefined) continue;
            if (theirs === mine) agree++;
            else disagree[id] = theirs;
        }
        var total = agree + Object.keys(disagree).length;
        if (Object.keys(disagree).length && !this.desyncDetected) {
            this.desyncDetected = true;
            if (this.onDesync) this.onDesync(tick, mine, disagree);
        }
        // Majority vote: with 3+ sessions, honest peers outnumber the cheater.
        if (total >= 3 && Object.keys(disagree).length > 0 && agree >= Math.ceil(total / 2) && agree > Object.keys(disagree).length) {
            for (var bad in disagree) {
                if (this.onKick) this.onKick({ peer: this.localId, target: Number(bad), tick: tick, reason: "state hash mismatch" });
                if (this.onSendInputs) this.onSendInputs({ type: "kick", peer: this.localId, target: Number(bad), reason: "state hash mismatch" });
                this.removePeer(Number(bad));
            }
        } else if (total < 3 && Object.keys(disagree).length > 0 && agree === 1) {
            // two peer sessions with no majority: flag and let the app decide
            this.kicked = { by: null, reason: "unresolvable hash mismatch (need 3+ peers for majority vote)" };
            if (this.onKick) this.onKick(this.kicked);
        }
    }

    // Convenience: wrap a FixedSimulation so stepping and hashing are one call.
    // stateProvider returns the deterministic snapshot to hash each interval.
    attach(simulation, stateProvider) {
        this._sim = simulation || null;
        this._stateProvider = null;
        if (stateProvider) this._stateProvider = stateProvider;
        else if (simulation && typeof simulation.state === "function") this._stateProvider = function () { return simulation.state(); };
        return this;
    }

    stepIfReady() {
        if (!this.tickReady(this.currentTick)) return false;
        var tick = this.currentTick;
        if (this._sim) {
            this._sim.pushInput(tick, this.inputsForTick(tick));
            this._sim.stepOnce();
        }
        var shouldHash = this.advanceTick();
        if (shouldHash && this._stateProvider) this.hashState(this._stateProvider(), tick);
        return true;
    }
}

export { NetcodeSession };
