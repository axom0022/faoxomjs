class MotionMatcher {
    constructor(mixer) { this.mixer = mixer; this.entries = []; }
    add(clip, features) { this.entries.push({ clip: clip, features: features || [] }); return this; }
    choose(query) { var best = null; var score = Infinity; for (var i = 0; i < this.entries.length; i++) { var a = this.entries[i].features; var b = query || []; var sum = 0; for (var j = 0; j < Math.max(a.length, b.length); j++) sum += Math.pow((a[j] || 0) - (b[j] || 0), 2); if (sum < score) { score = sum; best = this.entries[i]; } } return best ? this.mixer.clipAction(best.clip).play() : null; }
}

export { MotionMatcher };
