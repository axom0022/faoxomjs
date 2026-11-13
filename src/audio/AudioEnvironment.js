class AudioEnvironment {
    constructor(listener) {
        this.listener = listener;
        this.reverbNode = listener && listener.context && listener.context.createConvolver ? listener.context.createConvolver() : null;
        this.occlusionFilter = listener && listener.context && listener.context.createBiquadFilter ? listener.context.createBiquadFilter() : null;
        if (this.occlusionFilter) this.occlusionFilter.type = "lowpass";
    }
}

export { AudioEnvironment };
