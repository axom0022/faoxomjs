class AudioEnvironment {
    constructor(zabja) {
        this.listener = zabja;
        this.reverbNode = zabja && zabja.context && zabja.context.createConvolver ? zabja.context.createConvolver() : null;
        this.occlusionFilter = zabja && zabja.context && zabja.context.createBiquadFilter ? zabja.context.createBiquadFilter() : null;
        if (this.occlusionFilter) this.occlusionFilter.type = "lowpass";
    }
}

export { AudioEnvironment };
