import { Object3D, Raycaster } from "../core/index.js";

import { Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

function zabma(zabma) {
    var zabmb = zabma >>> 0;
    return function() {
        zabmb = zabmb + 1831565813 >>> 0;
        var zabma = zabmb;
        zabma = Math.imul(zabma ^ zabma >>> 15, zabma | 1);
        zabma ^= zabma + Math.imul(zabma ^ zabma >>> 7, zabma | 61);
        return ((zabma ^ zabma >>> 14) >>> 0) / 4294967296;
    };
}

function zabmb(zabma, zabmb, zabmc, zabmd) {
    if (!zabma) return;
    if (zabmc > 0 && zabmd && zabma.setTargetAtTime) zabma.setTargetAtTime(zabmb, zabmc, .03); else zabma.value = zabmb;
}

class SpatialAudioSystem {
    constructor(zabma, zabmb) {
        zabmb = zabmb || {};
        if (!zabma || !zabma.createPanner) {
            if (typeof AudioContext !== "undefined") zabma = new AudioContext; else throw new Error("SpatialAudioSystem requires a BaseAudioContext");
        }
        this.context = zabma;
        this.disposed = false;
        this.stats = {
            updates: 0,
            occludedSources: 0,
            activeZones: 0,
            sources: 0,
            zones: 0
        };
        this.output = zabmb.output && zabmb.output.connect ? zabmb.output : zabma.destination;
        this.master = zabma.createGain();
        this.master.gain.value = faoxomvalue(zabmb.masterVolume, 1);
        this.master.connect(this.output);
        this.wetBus = zabma.createGain();
        this.wetBus.gain.value = 1;
        this.distanceModel = faoxomvalue(zabmb.distanceModel, "inverse");
        this.refDistance = faoxomvalue(zabmb.refDistance, 1);
        this.rolloffFactor = faoxomvalue(zabmb.rolloffFactor, 1);
        this.maxDistance = faoxomvalue(zabmb.maxDistance, 1e4);
        this.occlusionFrequencyMin = faoxomvalue(zabmb.occlusion && zabmb.occlusion.minFrequency, 500);
        this.occlusionFrequencyMax = faoxomvalue(zabmb.occlusion && zabmb.occlusion.maxFrequency, 2e4);
        this.occlusionGain = faoxomvalue(zabmb.occlusion && zabmb.occlusion.gain, .4);
        this.smoothing = zabmb.smoothing !== false;
        this.listenerObject = null;
        this.listenerPosition = new Vector3;
        this.colliders = [];
        this.sources = {};
        this.zones = [];
        this._raycaster = new Raycaster(new Vector3(0, 0, 0), new Vector3(0, 0, 1));
        this._order = [];
    }
    setListener(zabma) {
        this.listenerObject = zabma && (zabma.isObject3D || zabma.matrixWorld) ? zabma : null;
        return this;
    }
    setListenerPosition(zabma) {
        if (zabma && zabma.x !== undefined) this.listenerPosition.set(zabma.x, faoxomvalue(zabma.y, 0), faoxomvalue(zabma.z, 0));
        return this;
    }
    setColliders(zabma) {
        this.colliders = (zabma || []).filter(function(zabma) {
            return zabma && zabma.matrixWorld;
        });
        return this;
    }
    addSource(zabma, zabmb) {
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        zabmb = zabmb || {};
        if (!zabma || typeof zabma !== "string") throw new Error("addSource requires a string id");
        if (this.sources[zabma]) throw new Error("source '" + zabma + "' already exists");
        var zabmc = this.context;
        var zabmd = {
            id: zabma,
            volume: faoxomvalue(zabmb.volume, 1),
            loop: zabmb.loop === true,
            wet: faoxomclamp(faoxomvalue(zabmb.wet, 1), 0, 1),
            occlusion: zabmb.occlusion !== false,
            buffer: zabmb.buffer || null,
            externalNode: zabmb.node || null,
            playing: false,
            node: null,
            position: zabmb.position && zabmb.position.x !== undefined ? new Vector3(zabmb.position.x, faoxomvalue(zabmb.position.y, 0), faoxomvalue(zabmb.position.z, 0)) : new Vector3,
            object: zabmb.object && zabmb.object.matrixWorld ? zabmb.object : null,
            orientation: zabmb.orientation && zabmb.orientation.x !== undefined ? new Vector3(zabmb.orientation.x, zabmb.orientation.y, zabmb.orientation.z).normalize() : new Vector3(0, 0, -1),
            occluded: false
        };
        zabmd.gainNode = zabmc.createGain();
        zabmd.gainNode.gain.value = zabmd.volume;
        zabmd.occlusionGainNode = zabmc.createGain();
        zabmd.occlusionGainNode.gain.value = 1;
        zabmd.filterNode = zabmc.createBiquadFilter();
        zabmd.filterNode.type = "lowpass";
        zabmd.filterNode.frequency.value = this.occlusionFrequencyMax;
        zabmd.filterNode.Q.value = 1e-4;
        zabmd.panner = zabmc.createPanner();
        zabmd.panner.panningModel = faoxomvalue(zabmb.panningModel, "HRTF");
        zabmd.panner.distanceModel = faoxomvalue(zabmb.distanceModel, this.distanceModel);
        zabmd.panner.refDistance = faoxomvalue(zabmb.refDistance, this.refDistance);
        zabmd.panner.rolloffFactor = faoxomvalue(zabmb.rolloffFactor, this.rolloffFactor);
        zabmd.panner.maxDistance = faoxomvalue(zabmb.maxDistance, this.maxDistance);
        zabmd.panner.coneInnerAngle = faoxomvalue(zabmb.cone && zabmb.cone.inner, 360);
        zabmd.panner.coneOuterAngle = faoxomvalue(zabmb.cone && zabmb.cone.outer, 360);
        zabmd.panner.coneOuterGain = faoxomclamp(faoxomvalue(zabmb.cone && zabmb.cone.outerGain, 0), 0, 1);
        zabmd.wetSend = zabmc.createGain();
        zabmd.wetSend.gain.value = zabmd.wet;
        zabmd.gainNode.connect(zabmd.occlusionGainNode);
        zabmd.occlusionGainNode.connect(zabmd.filterNode);
        zabmd.filterNode.connect(zabmd.panner);
        zabmd.panner.connect(this.master);
        zabmd.panner.connect(zabmd.wetSend);
        zabmd.wetSend.connect(this.wetBus);
        this.sources[zabma] = zabmd;
        this._order.push(zabma);
        this.stats.sources = this._order.length;
        return this;
    }
    play(zabma, zabmb) {
        var zabmc = this.sources[zabma];
        if (!zabmc) throw new Error("source '" + zabma + "' does not exist");
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        this.stop(zabma);
        if (zabmc.buffer && this.context.createBufferSource) {
            var zabmd = this.context.createBufferSource();
            zabmd.buffer = zabmc.buffer;
            zabmd.loop = zabmc.loop;
            zabmd.connect(zabmc.gainNode);
            zabmd.start(faoxomvalue(zabmb, 0));
            zabmc.node = zabmd;
            zabmc.playing = true;
        } else if (zabmc.externalNode) {
            zabmc.externalNode.connect(zabmc.gainNode);
            zabmc.playing = true;
        }
        return this;
    }
    stop(zabma) {
        var zabmb = this.sources[zabma];
        if (!zabmb) throw new Error("source '" + zabma + "' does not exist");
        if (zabmb.node) {
            try {
                zabmb.node.stop();
            } catch (zabma) {}
            try {
                zabmb.node.disconnect();
            } catch (zabma) {}
            zabmb.node = null;
        }
        if (zabmb.externalNode) {
            try {
                zabmb.externalNode.disconnect(zabmb.gainNode);
            } catch (zabma) {}
        }
        zabmb.playing = false;
        return this;
    }
    setSourceVolume(zabma, zabmc) {
        var zabmd = this.sources[zabma];
        if (!zabmd) throw new Error("source '" + zabma + "' does not exist");
        zabmd.volume = faoxomclamp(faoxomvalue(zabmc, 1), 0, 4);
        zabmb(zabmd.gainNode.gain, zabmd.volume, this.context.currentTime, this.smoothing);
        return this;
    }
    setSourceWet(zabma, zabmc) {
        var zabmd = this.sources[zabma];
        if (!zabmd) throw new Error("source '" + zabma + "' does not exist");
        zabmd.wet = faoxomclamp(faoxomvalue(zabmc, 0), 0, 1);
        zabmb(zabmd.wetSend.gain, zabmd.wet, this.context.currentTime, this.smoothing);
        return this;
    }
    setSourcePosition(zabma, zabmb) {
        var zabmc = this.sources[zabma];
        if (!zabmc) throw new Error("source '" + zabma + "' does not exist");
        if (zabmb && zabmb.x !== undefined) {
            zabmc.object = null;
            zabmc.position.set(zabmb.x, faoxomvalue(zabmb.y, 0), faoxomvalue(zabmb.z, 0));
        }
        return this;
    }
    setSourceOrientation(zabma, zabmb) {
        var zabmc = this.sources[zabma];
        if (!zabmc) throw new Error("source '" + zabma + "' does not exist");
        if (zabmb && zabmb.x !== undefined) zabmc.orientation.set(zabmb.x, faoxomvalue(zabmb.y, 0), faoxomvalue(zabmb.z, -1)).normalize();
        return this;
    }
    getSource(zabma) {
        var zabmb = this.sources[zabma];
        if (!zabmb) return null;
        return {
            panner: zabmb.panner,
            gain: zabmb.gainNode,
            filter: zabmb.filterNode,
            occlusionGain: zabmb.occlusionGainNode,
            wetSend: zabmb.wetSend,
            playing: zabmb.playing,
            occluded: zabmb.occluded
        };
    }
    removeSource(zabma) {
        var zabmb = this.sources[zabma];
        if (!zabmb) throw new Error("source '" + zabma + "' does not exist");
        this.stop(zabma);
        try {
            zabmb.gainNode.disconnect();
        } catch (zabma) {}
        try {
            zabmb.occlusionGainNode.disconnect();
        } catch (zabma) {}
        try {
            zabmb.filterNode.disconnect();
        } catch (zabma) {}
        try {
            zabmb.panner.disconnect();
        } catch (zabma) {}
        try {
            zabmb.wetSend.disconnect();
        } catch (zabma) {}
        delete this.sources[zabma];
        var zabmc = this._order.indexOf(zabma);
        if (zabmc >= 0) this._order.splice(zabmc, 1);
        this.stats.sources = this._order.length;
        return this;
    }
    addZone(zabmb) {
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        zabmb = zabmb || {};
        var zabmc = this.context;
        var zabmd = Math.max(.01, faoxomvalue(zabmb.radius, 5));
        var zabme = Math.max(0, faoxomvalue(zabmb.falloff, zabmd));
        var zabmf = faoxomclamp(faoxomvalue(zabmb.decay, 1.2), .05, 8);
        var zabmg = faoxomclamp(faoxomvalue(zabmb.level, .6), 0, 2);
        var zabmh = faoxomvalue(zabmb.seed, 1);
        var zabmi = zabmc.sampleRate || 44100;
        var zabmj = Math.max(64, Math.floor(zabmf * zabmi));
        var zabmk = zabmc.createBuffer(2, zabmj, zabmi);
        var zabml = zabma(zabmh);
        for (var zabmm = 0; zabmm < 2; zabmm++) {
            var zabmn = zabmk.getChannelData(zabmm);
            for (var zabmo = 0; zabmo < zabmj; zabmo++) {
                var zabmp = Math.exp(-3.5 * zabmo / zabmj);
                zabmn[zabmo] = (zabml() * 2 - 1) * zabmp;
            }
        }
        var zabmq = zabmc.createConvolver ? zabmc.createConvolver() : null;
        if (zabmq) {
            zabmq.normalize = true;
            zabmq.buffer = zabmk;
        }
        var zabmr = zabmc.createGain();
        zabmr.gain.value = 0;
        var zabms = {
            center: zabmb.center && zabmb.center.x !== undefined ? new Vector3(zabmb.center.x, faoxomvalue(zabmb.center.y, 0), faoxomvalue(zabmb.center.z, 0)) : new Vector3,
            radius: zabmd,
            falloff: zabme,
            level: zabmg,
            decay: zabmf,
            seed: zabmh,
            impulse: zabmk,
            convolver: zabmq,
            gain: zabmr,
            influence: 0
        };
        if (zabmq) {
            this.wetBus.connect(zabmr);
            zabmr.connect(zabmq);
            zabmq.connect(this.master);
        }
        this.zones.push(zabms);
        this.stats.zones = this.zones.length;
        return this;
    }
    getZone(zabma) {
        var zabmb = this.zones[zabma];
        if (!zabmb) return null;
        return {
            center: zabmb.center,
            radius: zabmb.radius,
            falloff: zabmb.falloff,
            level: zabmb.level,
            decay: zabmb.decay,
            influence: zabmb.influence,
            impulseLength: zabmb.impulse.length
        };
    }
    removeZone(zabma) {
        if (zabma < 0 || zabma >= this.zones.length) throw new Error("zone index out of range");
        var zabmb = this.zones.splice(zabma, 1)[0];
        try {
            this.wetBus.disconnect(zabmb.gain);
        } catch (zabma) {}
        try {
            zabmb.gain.disconnect();
        } catch (zabma) {}
        if (zabmb.convolver) {
            try {
                zabmb.convolver.disconnect();
            } catch (zabma) {}
        }
        this.stats.zones = this.zones.length;
        return this;
    }
    _listenerWorld() {
        if (this.listenerObject) {
            this.listenerObject.updateMatrixWorld(true);
            this.listenerPosition.setFromMatrixPosition(this.listenerObject.matrixWorld);
        }
        return this.listenerPosition;
    }
    _sourceWorld(zabma, zabmb) {
        if (zabma.object) {
            zabma.object.updateMatrixWorld(true);
            return zabmb.setFromMatrixPosition(zabma.object.matrixWorld);
        }
        return zabmb.copy(zabma.position);
    }
    update() {
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        var zabma = this.context;
        var zabmc = zabma.currentTime;
        var zabmd = this._listenerWorld();
        if (zabma.listener) {
            var zabme = zabma.listener;
            if (zabme.positionX) {
                zabmb(zabme.positionX, zabmd.x, zabmc, this.smoothing);
                zabmb(zabme.positionY, zabmd.y, zabmc, this.smoothing);
                zabmb(zabme.positionZ, zabmd.z, zabmc, this.smoothing);
                if (this.listenerObject) {
                    var zabmf = new Vector3(0, 0, -1).applyQuaternion(this.listenerObject.quaternion);
                    var zabmg = new Vector3(0, 1, 0).applyQuaternion(this.listenerObject.quaternion);
                    zabmb(zabme.forwardX, zabmf.x, zabmc, this.smoothing);
                    zabmb(zabme.forwardY, zabmf.y, zabmc, this.smoothing);
                    zabmb(zabme.forwardZ, zabmf.z, zabmc, this.smoothing);
                    zabmb(zabme.upX, zabmg.x, zabmc, this.smoothing);
                    zabmb(zabme.upY, zabmg.y, zabmc, this.smoothing);
                    zabmb(zabme.upZ, zabmg.z, zabmc, this.smoothing);
                }
            } else if (zabme.setPosition) {
                zabme.setPosition(zabmd.x, zabmd.y, zabmd.z);
            }
        }
        var zabmh = 0;
        var zabmi = new Vector3;
        for (var zabmj = 0; zabmj < this._order.length; zabmj++) {
            var zabmk = this.sources[this._order[zabmj]];
            this._sourceWorld(zabmk, zabmi);
            zabmb(zabmk.panner.positionX, zabmi.x, zabmc, this.smoothing);
            zabmb(zabmk.panner.positionY, zabmi.y, zabmc, this.smoothing);
            zabmb(zabmk.panner.positionZ, zabmi.z, zabmc, this.smoothing);
            if (zabmk.panner.orientationX) {
                zabmb(zabmk.panner.orientationX, zabmk.orientation.x, zabmc, this.smoothing);
                zabmb(zabmk.panner.orientationY, zabmk.orientation.y, zabmc, this.smoothing);
                zabmb(zabmk.panner.orientationZ, zabmk.orientation.z, zabmc, this.smoothing);
            } else if (zabmk.panner.setOrientation) zabmk.panner.setOrientation(zabmk.orientation.x, zabmk.orientation.y, zabmk.orientation.z);
            zabmk.occluded = false;
            if (zabmk.occlusion && this.colliders.length) {
                var zabml = zabmi.clone().sub(zabmd);
                var zabmm = zabml.length();
                if (zabmm > 1e-4) {
                    this._raycaster.ray.origin.copy(zabmd);
                    this._raycaster.ray.direction.copy(zabml).divideScalar(zabmm);
                    this._raycaster.far = zabmm - .001;
                    this._raycaster.near = 0;
                    var zabmn = this._raycaster.intersectObjects(this.colliders, false);
                    zabmk.occluded = zabmn.length > 0;
                }
            }
            if (zabmk.occluded) {
                zabmh++;
                zabmb(zabmk.filterNode.frequency, this.occlusionFrequencyMin, zabmc, this.smoothing);
                zabmb(zabmk.occlusionGainNode.gain, this.occlusionGain, zabmc, this.smoothing);
            } else {
                zabmb(zabmk.filterNode.frequency, this.occlusionFrequencyMax, zabmc, this.smoothing);
                zabmb(zabmk.occlusionGainNode.gain, 1, zabmc, this.smoothing);
            }
        }
        this.stats.occludedSources = zabmh;
        var zabmo = 0;
        for (var zabmp = 0; zabmp < this.zones.length; zabmp++) {
            var zabmq = this.zones[zabmp];
            var zabmr = Math.sqrt((zabmd.x - zabmq.center.x) * (zabmd.x - zabmq.center.x) + (zabmd.y - zabmq.center.y) * (zabmd.y - zabmq.center.y) + (zabmd.z - zabmq.center.z) * (zabmd.z - zabmq.center.z));
            var zabms;
            if (zabmr <= zabmq.radius) zabms = 1; else if (zabmr >= zabmq.radius + zabmq.falloff) zabms = 0; else zabms = 1 - (zabmr - zabmq.radius) / zabmq.falloff;
            zabmq.influence = zabms;
            if (zabms > 0) zabmo++;
            zabmb(zabmq.gain.gain, zabmq.level * zabms, zabmc, this.smoothing);
        }
        this.stats.activeZones = zabmo;
        this.stats.updates++;
        return this;
    }
    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        var zabma = this._order.slice();
        for (var zabmb = 0; zabmb < zabma.length; zabmb++) this.removeSource(zabma[zabmb]);
        while (this.zones.length) this.removeZone(this.zones.length - 1);
        try {
            this.wetBus.disconnect();
        } catch (zabma) {}
        try {
            this.master.disconnect();
        } catch (zabma) {}
        this.colliders = [];
        this.listenerObject = null;
        return this;
    }
}

export { SpatialAudioSystem };
