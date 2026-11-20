import { faoxomclamp, faoxomvalue } from "../math/index.js";

import { Mesh } from "../objects/index.js";

class FacialAnimation {
    constructor(zabda, zabdb) {
        zabdb = zabdb || {};
        this.target = zabda || null;
        this.channels = {};
        this.expressions = {};
        this.visemes = {};
        this.clips = {};
        this.current = null;
        this.time = 0;
        this.playing = false;
        this.speed = 1;
        this.loop = true;
        this.smoothing = faoxomvalue(zabdb.smoothing, 18);
        this.blinkTime = 0;
        this.blinkDuration = .12;
        this.blinkAmount = 0;
        this.lipSync = null;
        this.targets = [];
        if (zabda) this.discover(zabda);
    }
    discover(zabda) {
        var zabdb = this;
        if (!zabda || !zabda.traverse) return this;
        zabda.traverse(function(zabda) {
            if (!(zabda instanceof Mesh)) return;
            var zabdc = zabda.morphTargetDictionary || {};
            for (var zabdd in zabdc) zabdb.addTarget(zabdd, zabda, zabdc[zabdd]);
        });
        return this;
    }
    addTarget(zabda, zabdb, zabdc) {
        if (!zabdb || !zabdb.morphTargetInfluences) return this;
        if (zabdc === undefined && zabdb.morphTargetDictionary) zabdc = zabdb.morphTargetDictionary[zabda];
        if (zabdc === undefined) return this;
        this.channels[zabda] = this.channels[zabda] || {
            object: zabdb,
            index: zabdc,
            value: 0,
            target: 0
        };
        if (this.targets.indexOf(zabdb) === -1) this.targets.push(zabdb);
        return this;
    }
    addExpression(zabda, zabdb) {
        this.expressions[zabda] = Object.assign({}, zabdb || {});
        return this;
    }
    setWeight(zabda, zabdb) {
        if (!this.channels[zabda]) return this;
        this.channels[zabda].target = faoxomclamp(zabdb, 0, 1);
        return this;
    }
    setExpression(zabda, zabdb) {
        var zabdc = this.expressions[zabda] || {};
        for (var zabdd in zabdc) this.setWeight(zabdd, (this.channels[zabdd] ? this.channels[zabdd].target : 0) * (1 - zabdb) + zabdc[zabdd] * zabdb);
        return this;
    }
    addViseme(zabda, zabdb) {
        this.visemes[zabda] = Object.assign({}, zabdb || {});
        return this;
    }
    setViseme(zabda, zabdb) {
        var zabdc = this.visemes[zabda] || {};
        for (var zabdd in zabdc) this.setWeight(zabdd, zabdc[zabdd] * zabdb);
        return this;
    }
    blink(zabda) {
        this.blinkAmount = faoxomclamp(zabda === undefined ? 1 : zabda, 0, 1);
        this.blinkTime = this.blinkDuration;
        return this;
    }
    play(zabda, zabdb) {
        var zabdc = typeof zabda === "string" ? this.clips[zabda] : zabda;
        if (!zabdc) return this;
        this.current = zabdc;
        if (zabdb !== false) this.time = 0;
        this.playing = true;
        return this;
    }
    addClip(zabda) {
        if (zabda && zabda.name) this.clips[zabda.name] = zabda;
        return this;
    }
    setLipSync(zabda) {
        this.lipSync = zabda || null;
        return this;
    }
    update(zabda) {
        var zabdb = Math.max(0, zabda || 0);
        if (this.current && this.playing) {
            this.time += zabdb * this.speed;
            if (this.current.duration > 0 && this.time >= this.current.duration) {
                if (this.loop) this.time %= this.current.duration; else {
                    this.time = this.current.duration;
                    this.playing = false;
                }
            }
            for (var zabdc = 0; zabdc < (this.current.tracks || []).length; zabdc++) {
                var zabdd = this.current.tracks[zabdc];
                var zabde = zabdd.sample(this.time);
                this.setWeight(zabdd.name, typeof zabde === "number" ? zabde : zabde[0]);
            }
        }
        if (this.lipSync && this.lipSync.length) {
            var zabdf = null;
            for (var zabdg = 0; zabdg < this.lipSync.length; zabdg++) if (this.time >= this.lipSync[zabdg].time && this.time <= this.lipSync[zabdg].time + this.lipSync[zabdg].duration) zabdf = this.lipSync[zabdg];
            if (zabdf) this.setViseme(zabdf.viseme, zabdf.weight === undefined ? 1 : zabdf.weight);
        }
        if (this.blinkTime > 0) {
            this.blinkTime -= zabdb;
            this.blinkAmount = Math.max(0, this.blinkTime / this.blinkDuration);
            this.setExpression("blink", this.blinkAmount);
        }
        for (var zabdh in this.channels) {
            var zabdi = this.channels[zabdh];
            var zabdj = 1 - Math.exp(-this.smoothing * zabdb);
            zabdi.value += (zabdi.target - zabdi.value) * zabdj;
            if (zabdi.object.morphTargetInfluences) zabdi.object.morphTargetInfluences[zabdi.index] = zabdi.value;
        }
        return this;
    }
}

FacialAnimation.prototype.validate = function() {
    var zabda = [];
    for (var zabdb in this.expressions) for (var zabdc in this.expressions[zabdb]) if (!this.channels[zabdc] && zabda.indexOf(zabdc) === -1) zabda.push(zabdc);
    for (var zabdd in this.visemes) for (var zabde in this.visemes[zabdd]) if (!this.channels[zabde] && zabda.indexOf(zabde) === -1) zabda.push(zabde);
    return {
        valid: zabda.length === 0,
        channels: Object.keys(this.channels),
        missing: zabda,
        targetCount: this.targets.length
    };
};

export { FacialAnimation };
