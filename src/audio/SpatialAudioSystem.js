import { Object3D, Raycaster } from "../core/index.js";
import { Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

function seededRandom(seed) {
    var s = seed >>> 0;
    return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        var t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function setParam(param, value, time, smoothing) {
    if (!param) return;
    if (time > 0 && smoothing && param.setTargetAtTime) param.setTargetAtTime(value, time, 0.03);
    else param.value = value;
}

class SpatialAudioSystem {
    constructor(context, options) {
        options = options || {};
        if (!context || !context.createPanner) {
            if (typeof AudioContext !== "undefined") context = new AudioContext();
            else throw new Error("SpatialAudioSystem requires a BaseAudioContext");
        }
        this.context = context;
        this.disposed = false;
        this.stats = { updates: 0, occludedSources: 0, activeZones: 0, sources: 0, zones: 0 };

        this.output = options.output && options.output.connect ? options.output : context.destination;
        this.master = context.createGain();
        this.master.gain.value = faoxomvalue(options.masterVolume, 1);
        this.master.connect(this.output);

        this.wetBus = context.createGain();
        this.wetBus.gain.value = 1;

        this.distanceModel = faoxomvalue(options.distanceModel, "inverse");
        this.refDistance = faoxomvalue(options.refDistance, 1);
        this.rolloffFactor = faoxomvalue(options.rolloffFactor, 1);
        this.maxDistance = faoxomvalue(options.maxDistance, 10000);

        this.occlusionFrequencyMin = faoxomvalue(options.occlusion && options.occlusion.minFrequency, 500);
        this.occlusionFrequencyMax = faoxomvalue(options.occlusion && options.occlusion.maxFrequency, 20000);
        this.occlusionGain = faoxomvalue(options.occlusion && options.occlusion.gain, 0.4);
        this.smoothing = options.smoothing !== false;

        this.listenerObject = null;
        this.listenerPosition = new Vector3();
        this.colliders = [];
        this.sources = {};
        this.zones = [];
        this._raycaster = new Raycaster(new Vector3(0, 0, 0), new Vector3(0, 0, 1));
        this._order = [];
    }

    setListener(object) {
        this.listenerObject = object && (object.isObject3D || object.matrixWorld) ? object : null;
        return this;
    }

    setListenerPosition(position) {
        if (position && position.x !== undefined) this.listenerPosition.set(position.x, faoxomvalue(position.y, 0), faoxomvalue(position.z, 0));
        return this;
    }

    setColliders(objects) {
        this.colliders = (objects || []).filter(function (object) { return object && object.matrixWorld; });
        return this;
    }

    addSource(id, options) {
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        options = options || {};
        if (!id || typeof id !== "string") throw new Error("addSource requires a string id");
        if (this.sources[id]) throw new Error("source '" + id + "' already exists");
        var context = this.context;
        var source = {
            id: id,
            volume: faoxomvalue(options.volume, 1),
            loop: options.loop === true,
            wet: faoxomclamp(faoxomvalue(options.wet, 1), 0, 1),
            occlusion: options.occlusion !== false,
            buffer: options.buffer || null,
            externalNode: options.node || null,
            playing: false,
            node: null,
            position: options.position && options.position.x !== undefined ? new Vector3(options.position.x, faoxomvalue(options.position.y, 0), faoxomvalue(options.position.z, 0)) : new Vector3(),
            object: options.object && options.object.matrixWorld ? options.object : null,
            orientation: options.orientation && options.orientation.x !== undefined ? new Vector3(options.orientation.x, options.orientation.y, options.orientation.z).normalize() : new Vector3(0, 0, -1),
            occluded: false
        };
        source.gainNode = context.createGain();
        source.gainNode.gain.value = source.volume;
        source.occlusionGainNode = context.createGain();
        source.occlusionGainNode.gain.value = 1;
        source.filterNode = context.createBiquadFilter();
        source.filterNode.type = "lowpass";
        source.filterNode.frequency.value = this.occlusionFrequencyMax;
        source.filterNode.Q.value = 0.0001;
        source.panner = context.createPanner();
        source.panner.panningModel = faoxomvalue(options.panningModel, "HRTF");
        source.panner.distanceModel = faoxomvalue(options.distanceModel, this.distanceModel);
        source.panner.refDistance = faoxomvalue(options.refDistance, this.refDistance);
        source.panner.rolloffFactor = faoxomvalue(options.rolloffFactor, this.rolloffFactor);
        source.panner.maxDistance = faoxomvalue(options.maxDistance, this.maxDistance);
        source.panner.coneInnerAngle = faoxomvalue(options.cone && options.cone.inner, 360);
        source.panner.coneOuterAngle = faoxomvalue(options.cone && options.cone.outer, 360);
        source.panner.coneOuterGain = faoxomclamp(faoxomvalue(options.cone && options.cone.outerGain, 0), 0, 1);
        source.wetSend = context.createGain();
        source.wetSend.gain.value = source.wet;

        source.gainNode.connect(source.occlusionGainNode);
        source.occlusionGainNode.connect(source.filterNode);
        source.filterNode.connect(source.panner);
        source.panner.connect(this.master);
        source.panner.connect(source.wetSend);
        source.wetSend.connect(this.wetBus);

        this.sources[id] = source;
        this._order.push(id);
        this.stats.sources = this._order.length;
        return this;
    }

    play(id, when) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        this.stop(id);
        if (source.buffer && this.context.createBufferSource) {
            var node = this.context.createBufferSource();
            node.buffer = source.buffer;
            node.loop = source.loop;
            node.connect(source.gainNode);
            node.start(faoxomvalue(when, 0));
            source.node = node;
            source.playing = true;
        } else if (source.externalNode) {
            source.externalNode.connect(source.gainNode);
            source.playing = true;
        }
        return this;
    }

    stop(id) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        if (source.node) {
            try { source.node.stop(); } catch (e) { }
            try { source.node.disconnect(); } catch (e) { }
            source.node = null;
        }
        if (source.externalNode) {
            try { source.externalNode.disconnect(source.gainNode); } catch (e) { }
        }
        source.playing = false;
        return this;
    }

    setSourceVolume(id, volume) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        source.volume = faoxomclamp(faoxomvalue(volume, 1), 0, 4);
        setParam(source.gainNode.gain, source.volume, this.context.currentTime, this.smoothing);
        return this;
    }

    setSourceWet(id, wet) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        source.wet = faoxomclamp(faoxomvalue(wet, 0), 0, 1);
        setParam(source.wetSend.gain, source.wet, this.context.currentTime, this.smoothing);
        return this;
    }

    setSourcePosition(id, position) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        if (position && position.x !== undefined) {
            source.object = null;
            source.position.set(position.x, faoxomvalue(position.y, 0), faoxomvalue(position.z, 0));
        }
        return this;
    }

    setSourceOrientation(id, orientation) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        if (orientation && orientation.x !== undefined) source.orientation.set(orientation.x, faoxomvalue(orientation.y, 0), faoxomvalue(orientation.z, -1)).normalize();
        return this;
    }

    getSource(id) {
        var source = this.sources[id];
        if (!source) return null;
        return { panner: source.panner, gain: source.gainNode, filter: source.filterNode, occlusionGain: source.occlusionGainNode, wetSend: source.wetSend, playing: source.playing, occluded: source.occluded };
    }

    removeSource(id) {
        var source = this.sources[id];
        if (!source) throw new Error("source '" + id + "' does not exist");
        this.stop(id);
        try { source.gainNode.disconnect(); } catch (e) { }
        try { source.occlusionGainNode.disconnect(); } catch (e) { }
        try { source.filterNode.disconnect(); } catch (e) { }
        try { source.panner.disconnect(); } catch (e) { }
        try { source.wetSend.disconnect(); } catch (e) { }
        delete this.sources[id];
        var index = this._order.indexOf(id);
        if (index >= 0) this._order.splice(index, 1);
        this.stats.sources = this._order.length;
        return this;
    }

    addZone(zone) {
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        zone = zone || {};
        var context = this.context;
        var radius = Math.max(0.01, faoxomvalue(zone.radius, 5));
        var falloff = Math.max(0, faoxomvalue(zone.falloff, radius));
        var decay = faoxomclamp(faoxomvalue(zone.decay, 1.2), 0.05, 8);
        var level = faoxomclamp(faoxomvalue(zone.level, 0.6), 0, 2);
        var seed = faoxomvalue(zone.seed, 1);
        var rate = context.sampleRate || 44100;
        var length = Math.max(64, Math.floor(decay * rate));
        var impulse = context.createBuffer(2, length, rate);
        var random = seededRandom(seed);
        for (var channel = 0; channel < 2; channel++) {
            var data = impulse.getChannelData(channel);
            for (var i = 0; i < length; i++) {
                var envelope = Math.exp(-3.5 * i / length);
                data[i] = (random() * 2 - 1) * envelope;
            }
        }
        var convolver = context.createConvolver ? context.createConvolver() : null;
        if (convolver) {
            convolver.normalize = true;
            convolver.buffer = impulse;
        }
        var gain = context.createGain();
        gain.gain.value = 0;
        var entry = {
            center: zone.center && zone.center.x !== undefined ? new Vector3(zone.center.x, faoxomvalue(zone.center.y, 0), faoxomvalue(zone.center.z, 0)) : new Vector3(),
            radius: radius,
            falloff: falloff,
            level: level,
            decay: decay,
            seed: seed,
            impulse: impulse,
            convolver: convolver,
            gain: gain,
            influence: 0
        };
        if (convolver) {
            this.wetBus.connect(gain);
            gain.connect(convolver);
            convolver.connect(this.master);
        }
        this.zones.push(entry);
        this.stats.zones = this.zones.length;
        return this;
    }

    getZone(index) {
        var zone = this.zones[index];
        if (!zone) return null;
        return { center: zone.center, radius: zone.radius, falloff: zone.falloff, level: zone.level, decay: zone.decay, influence: zone.influence, impulseLength: zone.impulse.length };
    }

    removeZone(index) {
        if (index < 0 || index >= this.zones.length) throw new Error("zone index out of range");
        var zone = this.zones.splice(index, 1)[0];
        try { this.wetBus.disconnect(zone.gain); } catch (e) { }
        try { zone.gain.disconnect(); } catch (e) { }
        if (zone.convolver) {
            try { zone.convolver.disconnect(); } catch (e) { }
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

    _sourceWorld(source, target) {
        if (source.object) {
            source.object.updateMatrixWorld(true);
            return target.setFromMatrixPosition(source.object.matrixWorld);
        }
        return target.copy(source.position);
    }

    update() {
        if (this.disposed) throw new Error("SpatialAudioSystem is disposed");
        var context = this.context;
        var time = context.currentTime;
        var listenerPosition = this._listenerWorld();

        if (context.listener) {
            var listener = context.listener;
            if (listener.positionX) {
                setParam(listener.positionX, listenerPosition.x, time, this.smoothing);
                setParam(listener.positionY, listenerPosition.y, time, this.smoothing);
                setParam(listener.positionZ, listenerPosition.z, time, this.smoothing);
                if (this.listenerObject) {
                    var forward = new Vector3(0, 0, -1).applyQuaternion(this.listenerObject.quaternion);
                    var up = new Vector3(0, 1, 0).applyQuaternion(this.listenerObject.quaternion);
                    setParam(listener.forwardX, forward.x, time, this.smoothing);
                    setParam(listener.forwardY, forward.y, time, this.smoothing);
                    setParam(listener.forwardZ, forward.z, time, this.smoothing);
                    setParam(listener.upX, up.x, time, this.smoothing);
                    setParam(listener.upY, up.y, time, this.smoothing);
                    setParam(listener.upZ, up.z, time, this.smoothing);
                }
            } else if (listener.setPosition) {
                listener.setPosition(listenerPosition.x, listenerPosition.y, listenerPosition.z);
            }
        }

        var occluded = 0;
        var sourcePosition = new Vector3();
        for (var s = 0; s < this._order.length; s++) {
            var source = this.sources[this._order[s]];
            this._sourceWorld(source, sourcePosition);
            setParam(source.panner.positionX, sourcePosition.x, time, this.smoothing);
            setParam(source.panner.positionY, sourcePosition.y, time, this.smoothing);
            setParam(source.panner.positionZ, sourcePosition.z, time, this.smoothing);
            if (source.panner.orientationX) {
                setParam(source.panner.orientationX, source.orientation.x, time, this.smoothing);
                setParam(source.panner.orientationY, source.orientation.y, time, this.smoothing);
                setParam(source.panner.orientationZ, source.orientation.z, time, this.smoothing);
            } else if (source.panner.setOrientation) source.panner.setOrientation(source.orientation.x, source.orientation.y, source.orientation.z);

            source.occluded = false;
            if (source.occlusion && this.colliders.length) {
                var delta = sourcePosition.clone().sub(listenerPosition);
                var distance = delta.length();
                if (distance > 1e-4) {
                    this._raycaster.ray.origin.copy(listenerPosition);
                    this._raycaster.ray.direction.copy(delta).divideScalar(distance);
                    this._raycaster.far = distance - 1e-3;
                    this._raycaster.near = 0;
                    var hits = this._raycaster.intersectObjects(this.colliders, false);
                    source.occluded = hits.length > 0;
                }
            }
            if (source.occluded) {
                occluded++;
                setParam(source.filterNode.frequency, this.occlusionFrequencyMin, time, this.smoothing);
                setParam(source.occlusionGainNode.gain, this.occlusionGain, time, this.smoothing);
            } else {
                setParam(source.filterNode.frequency, this.occlusionFrequencyMax, time, this.smoothing);
                setParam(source.occlusionGainNode.gain, 1, time, this.smoothing);
            }
        }
        this.stats.occludedSources = occluded;

        var active = 0;
        for (var z = 0; z < this.zones.length; z++) {
            var zone = this.zones[z];
            var zoneDistance = Math.sqrt(
                (listenerPosition.x - zone.center.x) * (listenerPosition.x - zone.center.x) +
                (listenerPosition.y - zone.center.y) * (listenerPosition.y - zone.center.y) +
                (listenerPosition.z - zone.center.z) * (listenerPosition.z - zone.center.z)
            );
            var influence;
            if (zoneDistance <= zone.radius) influence = 1;
            else if (zoneDistance >= zone.radius + zone.falloff) influence = 0;
            else influence = 1 - (zoneDistance - zone.radius) / zone.falloff;
            zone.influence = influence;
            if (influence > 0) active++;
            setParam(zone.gain.gain, zone.level * influence, time, this.smoothing);
        }
        this.stats.activeZones = active;
        this.stats.updates++;
        return this;
    }

    dispose() {
        if (this.disposed) return this;
        this.disposed = true;
        var ids = this._order.slice();
        for (var i = 0; i < ids.length; i++) this.removeSource(ids[i]);
        while (this.zones.length) this.removeZone(this.zones.length - 1);
        try { this.wetBus.disconnect(); } catch (e) { }
        try { this.master.disconnect(); } catch (e) { }
        this.colliders = [];
        this.listenerObject = null;
        return this;
    }
}

export { SpatialAudioSystem };
