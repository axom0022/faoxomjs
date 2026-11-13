class Pass {
    constructor() {
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;
    }
    setSize(width, height) {}
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {}
    dispose() {}
}

export { Pass };
