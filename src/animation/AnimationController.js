import { faoxomidnext, faoxomresolve } from "../core/index.js";

class AnimationController {
    constructor(zaava) {
        this.id = faoxomidnext();
        this.target = zaava;
        this.clips = {};
        this.current = null;
        this.time = 0;
        this.speed = 1;
        this.weight = 1;
        this.loop = true;
        this.playing = false;
        this.paused = false;
        this.onComplete = null;
        this.onStart = null;
    }
    addClip(zaava) {
        this.clips[zaava.name] = zaava;
        return this;
    }
    play(zaava, zaavb) {
        var zaavc = typeof zaava === "string" ? this.clips[zaava] : zaava;
        if (!zaavc) return this;
        this.current = zaavc;
        if (zaavb !== false) this.time = 0;
        this.playing = true;
        this.paused = false;
        if (this.onStart) this.onStart(zaavc, this);
        return this;
    }
    stop() {
        this.playing = false;
        this.paused = false;
        this.time = 0;
        return this;
    }
    pause() {
        this.paused = true;
        return this;
    }
    resume() {
        this.paused = false;
        this.playing = true;
        return this;
    }
    update(zaava) {
        if (!this.playing || this.paused || !this.current) return;
        this.time += zaava * this.speed;
        var zaavb = this.current;
        if (zaavb.duration > 0 && this.time >= zaavb.duration) {
            if (this.loop) this.time = this.time % zaavb.duration; else {
                this.time = zaavb.duration;
                this.playing = false;
                if (this.onComplete) this.onComplete(zaavb, this);
            }
        }
        for (var zaavc = 0; zaavc < zaavb.tracks.length; zaavc++) {
            var zaavd = zaavb.tracks[zaavc];
            var zaave = zaavd.sample(this.time);
            var zaavf = faoxomresolve(this.target, zaavd.name);
            if (!zaavf.object) continue;
            if (zaavf.key === "weights" && zaavf.object.userData && zaavf.object.userData.meshes) {
                var zaavg = zaavf.object.userData.meshes;
                for (var zaavh = 0; zaavh < zaavg.length; zaavh++) {
                    var zaavi = zaavg[zaavh].morphTargetInfluences;
                    if (!zaavi) continue;
                    for (var zaavj = 0; zaavj < zaave.length; zaavj++) zaavi[zaavj] = zaave[zaavj];
                }
                continue;
            }
            if (zaavf.key === "weights" && zaavf.object.morphTargetInfluences) {
                var zaavk = zaavf.object.morphTargetInfluences;
                for (var zaavl = 0; zaavl < zaavk.length && zaavl < zaave.length; zaavl++) zaavk[zaavl] = zaave[zaavl];
                continue;
            }
            var zaavm = zaavf.object[zaavf.key];
            if (this.weight < 1 && zaavm && zaavm.clone && zaave && zaavm.lerp) zaave = zaavm.clone().lerp(zaave, this.weight);
            if (zaavm && zaavm.copy && zaave && zaave !== zaavm) zaavm.copy(zaave); else zaavf.object[zaavf.key] = zaave;
        }
        if (this.target && this.target.skeleton && this.target.skeleton.update) this.target.skeleton.update();
        if (this.target && this.target.traverse) this.target.traverse(function(zaava) {
            if (zaava.skeleton && zaava.skeleton.update) zaava.skeleton.update();
        });
    }
}

export { AnimationController };
