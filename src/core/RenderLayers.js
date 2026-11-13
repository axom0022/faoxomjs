class RenderLayers {
    constructor() { this.mask = 1; }
    channelOnly(channel) { this.mask = 1 << channel; return this; }
    turnOn(channel) { this.mask |= 1 << channel; return this; }
    turnOff(channel) { this.mask &= ~(1 << channel); return this; }
    switch(channel) { this.mask ^= 1 << channel; return this; }
    holds(channel) { return (this.mask & (1 << channel)) !== 0; }
    shares(other) { return (this.mask & (other ? other.mask : 1)) !== 0; }
    allOn() { this.mask = 0xffffffff; return this; }
    reset() { this.mask = 1; return this; }
}

export { RenderLayers };
