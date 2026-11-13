import { faoxomclamp } from "../math/index.js";

class AnimationAction {
    constructor(mixer, clip) { this.mixer = mixer; this.clip = clip; this.time = 0; this.weight = 1; this.targetWeight = 1; this.fadeTime = 0; this.fadeDuration = 0; this.speed = 1; this.loop = true; this.playing = false; this.onStart = null; this.onLoop = null; this.onComplete = null; this.onEvent = null; this.eventIndex = 0; }
    play() { var wasPlaying = this.playing; this.playing = true; if (!wasPlaying) { this.eventIndex = 0; if (this.onStart) this.onStart(this); } return this; }
    stop() { this.playing = false; this.time = 0; return this; }
    reset() { this.time = 0; this.eventIndex = 0; return this; }
    setLoop(loop) { this.loop = loop; return this; }
    setWeight(weight) { this.weight = weight; this.targetWeight = weight; return this; }
    fadeTo(weight, duration) { this.targetWeight = faoxomclamp(weight, 0, 1); this.fadeTime = 0; this.fadeDuration = Math.max(0, duration || 0); if (!this.fadeDuration) this.weight = this.targetWeight; return this; }
    crossFadeFrom(action, duration) { action.fadeTo(0, duration); this.weight = 0; this.play().fadeTo(1, duration); return this; }
    update(delta) { if (!this.playing) return; var previousTime = this.time; this.time += delta * this.speed; var wrapped = false; if (this.clip.duration > 0 && this.time >= this.clip.duration) { if (this.loop) { this.time = this.time % this.clip.duration; wrapped = true; if (this.onLoop) this.onLoop(this); } else { this.time = this.clip.duration; this.playing = false; if (this.onComplete) this.onComplete(this); } } var events = this.clip.events || []; for (var eventIndex = this.eventIndex; eventIndex < events.length; eventIndex++) { var event = events[eventIndex]; if ((wrapped && event.time >= previousTime || !wrapped && event.time >= previousTime && event.time <= this.time) && this.onEvent) this.onEvent(event, this); if (event.time > this.time && !wrapped) break; this.eventIndex = eventIndex + 1; } if (wrapped) this.eventIndex = 0; if (this.fadeDuration > 0) { this.fadeTime += delta; var t = faoxomclamp(this.fadeTime / this.fadeDuration, 0, 1); this.weight += (this.targetWeight - this.weight) * t; if (t >= 1) this.fadeDuration = 0; } }
}

export { AnimationAction };
