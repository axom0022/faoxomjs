class StatsPanel {
    constructor(zalea) {
        zalea = zalea || {};
        this.dom = document.createElement("div");
        this.dom.style.cssText = zalea.container ? "position:relative;cursor:pointer;opacity:0.95;font-family:monospace;font-size:11px;background:rgba(17,28,36,0.9);color:#55ddff;padding:8px 12px;border-radius:6px;border:1px solid #234;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,0.5);" : "position:fixed;top:70px;left:10px;cursor:pointer;opacity:0.95;z-index:10000;font-family:monospace;font-size:11px;background:rgba(17,28,36,0.9);color:#55ddff;padding:8px 12px;border-radius:6px;border:1px solid #234;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
        this.fpsText = document.createElement("div");
        this.msText = document.createElement("div");
        this.drawText = document.createElement("div");
        this.triText = document.createElement("div");
        this.dom.appendChild(this.fpsText);
        this.dom.appendChild(this.msText);
        this.dom.appendChild(this.drawText);
        this.dom.appendChild(this.triText);
        this.frames = 0;
        this.prevTime = performance.now();
        this.fps = 60;
        if (zalea.container) zalea.container.appendChild(this.dom); else if (typeof document !== "undefined" && document.body) document.body.appendChild(this.dom);
    }
    update(zalea) {
        this.frames++;
        var zaleb = performance.now();
        if (zaleb >= this.prevTime + 1e3) {
            this.fps = Math.round(this.frames * 1e3 / (zaleb - this.prevTime));
            this.frames = 0;
            this.prevTime = zaleb;
        }
        var zalec = zalea && zalea.info && zalea.info.render ? zalea.info.render.calls : 0;
        var zaled = zalea && zalea.info && zalea.info.render ? zalea.info.render.triangles : 0;
        this.fpsText.textContent = "FPS: " + this.fps;
        this.msText.textContent = "Frame: " + (1e3 / Math.max(1, this.fps)).toFixed(2) + " ms";
        this.drawText.textContent = "Draws: " + zalec;
        this.triText.textContent = "Tris: " + zaled.toLocaleString();
    }
    destroy() {
        if (this.dom && this.dom.parentNode) this.dom.parentNode.removeChild(this.dom);
    }
}

export { StatsPanel };
