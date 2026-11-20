class AnimationClip {
    constructor(zaata, zaatb, zaatc, zaatd) {
        this.name = zaata || "clip";
        this.tracks = zaatc || [];
        this.events = zaatd || [];
        this.duration = zaatb === undefined ? this.computeDuration() : zaatb;
    }
    computeDuration() {
        var zaata = 0;
        for (var zaatb = 0; zaatb < this.tracks.length; zaatb++) if (this.tracks[zaatb].times.length) zaata = Math.max(zaata, this.tracks[zaatb].times[this.tracks[zaatb].times.length - 1]);
        this.duration = zaata;
        return zaata;
    }
}

export { AnimationClip };
