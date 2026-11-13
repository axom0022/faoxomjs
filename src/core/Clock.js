class Clock {
    constructor(autoStart) { this.autoStart = autoStart !== false; this.startTime = 0; this.oldTime = 0; this.elapsedTime = 0; this.running = false; }
    start() { this.startTime = this.oldTime = typeof performance !== "undefined" ? performance.now() : Date.now(); this.elapsedTime = 0; this.running = true; return this; }
    stop() { this.getDelta(); this.running = false; this.autoStart = false; return this; }
    getDelta() { var now = typeof performance !== "undefined" ? performance.now() : Date.now(); if (this.autoStart && !this.running) this.start(); var delta = this.running ? (now - this.oldTime) / 1000 : 0; this.oldTime = now; this.elapsedTime += delta; return delta; }
    getElapsedTime() { this.getDelta(); return this.elapsedTime; }
}

export { Clock };
