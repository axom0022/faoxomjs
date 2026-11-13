class AnimationClip { constructor(name, duration, tracks, events) { this.name = name || "clip"; this.tracks = tracks || []; this.events = events || []; this.duration = duration === undefined ? this.computeDuration() : duration; } computeDuration() { var d = 0; for (var i = 0; i < this.tracks.length; i++) if (this.tracks[i].times.length) d = Math.max(d, this.tracks[i].times[this.tracks[i].times.length - 1]); this.duration = d; return d; } }

export { AnimationClip };
