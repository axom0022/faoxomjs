class MotionMatcher {
    constructor(zabea) {
        this.mixer = zabea;
        this.entries = [];
    }
    add(zabea, zabeb) {
        this.entries.push({
            clip: zabea,
            features: zabeb || []
        });
        return this;
    }
    choose(zabea) {
        var zabeb = null;
        var zabec = Infinity;
        for (var zabed = 0; zabed < this.entries.length; zabed++) {
            var zabee = this.entries[zabed].features;
            var zabef = zabea || [];
            var zabeg = 0;
            for (var zabeh = 0; zabeh < Math.max(zabee.length, zabef.length); zabeh++) zabeg += Math.pow((zabee[zabeh] || 0) - (zabef[zabeh] || 0), 2);
            if (zabeg < zabec) {
                zabec = zabeg;
                zabeb = this.entries[zabed];
            }
        }
        return zabeb ? this.mixer.clipAction(zabeb.clip).play() : null;
    }
}

export { MotionMatcher };
