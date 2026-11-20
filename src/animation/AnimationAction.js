import { faoxomclamp } from "../math/index.js";

class AnimationAction {
    constructor(zaasa, zaasb) {
        this.mixer = zaasa;
        this.clip = zaasb;
        this.time = 0;
        this.weight = 1;
        this.targetWeight = 1;
        this.fadeTime = 0;
        this.fadeDuration = 0;
        this.speed = 1;
        this.loop = true;
        this.playing = false;
        this.onStart = null;
        this.onLoop = null;
        this.onComplete = null;
        this.onEvent = null;
        this.eventIndex = 0;
    }
    play() {
        var zaasa = this.playing;
        this.playing = true;
        if (!zaasa) {
            this.eventIndex = 0;
            if (this.onStart) this.onStart(this);
        }
        return this;
    }
    stop() {
        this.playing = false;
        this.time = 0;
        return this;
    }
    reset() {
        this.time = 0;
        this.eventIndex = 0;
        return this;
    }
    setLoop(zaasa) {
        this.loop = zaasa;
        return this;
    }
    setWeight(zaasa) {
        this.weight = zaasa;
        this.targetWeight = zaasa;
        return this;
    }
    fadeTo(zaasa, zaasb) {
        this.targetWeight = faoxomclamp(zaasa, 0, 1);
        this.fadeTime = 0;
        this.fadeDuration = Math.max(0, zaasb || 0);
        if (!this.fadeDuration) this.weight = this.targetWeight;
        return this;
    }
    crossFadeFrom(zaasa, zaasb) {
        zaasa.fadeTo(0, zaasb);
        this.weight = 0;
        this.play().fadeTo(1, zaasb);
        return this;
    }
    update(zaasa) {
        if (!this.playing) return;
        var zaasb = this.time;
        this.time += zaasa * this.speed;
        var zaasc = false;
        if (this.clip.duration > 0 && this.time >= this.clip.duration) {
            if (this.loop) {
                this.time = this.time % this.clip.duration;
                zaasc = true;
                if (this.onLoop) this.onLoop(this);
            } else {
                this.time = this.clip.duration;
                this.playing = false;
                if (this.onComplete) this.onComplete(this);
            }
        }
        var zaasd = this.clip.events || [];
        for (var zaase = this.eventIndex; zaase < zaasd.length; zaase++) {
            var zaasf = zaasd[zaase];
            if ((zaasc && zaasf.time >= zaasb || !zaasc && zaasf.time >= zaasb && zaasf.time <= this.time) && this.onEvent) this.onEvent(zaasf, this);
            if (zaasf.time > this.time && !zaasc) break;
            this.eventIndex = zaase + 1;
        }
        if (zaasc) this.eventIndex = 0;
        if (this.fadeDuration > 0) {
            this.fadeTime += zaasa;
            var zaasg = faoxomclamp(this.fadeTime / this.fadeDuration, 0, 1);
            this.weight += (this.targetWeight - this.weight) * zaasg;
            if (zaasg >= 1) this.fadeDuration = 0;
        }
    }
}

export { AnimationAction };
