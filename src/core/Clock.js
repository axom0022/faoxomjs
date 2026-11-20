class Clock {
    constructor(zacga) {
        this.autoStart = zacga !== false;
        this.startTime = 0;
        this.oldTime = 0;
        this.elapsedTime = 0;
        this.running = false;
    }
    start() {
        this.startTime = this.oldTime = typeof performance !== "undefined" ? performance.now() : Date.now();
        this.elapsedTime = 0;
        this.running = true;
        return this;
    }
    stop() {
        this.getDelta();
        this.running = false;
        this.autoStart = false;
        return this;
    }
    getDelta() {
        var zacga = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (this.autoStart && !this.running) this.start();
        var zacgb = this.running ? (zacga - this.oldTime) / 1e3 : 0;
        this.oldTime = zacga;
        this.elapsedTime += zacgb;
        return zacgb;
    }
    getElapsedTime() {
        this.getDelta();
        return this.elapsedTime;
    }
}

export { Clock };
