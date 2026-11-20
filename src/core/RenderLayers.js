class RenderLayers {
    constructor() {
        this.mask = 1;
    }
    channelOnly(zadga) {
        this.mask = 1 << zadga;
        return this;
    }
    turnOn(zadga) {
        this.mask |= 1 << zadga;
        return this;
    }
    turnOff(zadga) {
        this.mask &= ~(1 << zadga);
        return this;
    }
    switch(zadga) {
        this.mask ^= 1 << zadga;
        return this;
    }
    holds(zadga) {
        return (this.mask & 1 << zadga) !== 0;
    }
    shares(zadga) {
        return (this.mask & (zadga ? zadga.mask : 1)) !== 0;
    }
    allOn() {
        this.mask = 4294967295;
        return this;
    }
    reset() {
        this.mask = 1;
        return this;
    }
}

export { RenderLayers };
