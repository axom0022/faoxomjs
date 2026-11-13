class AnimationStateMachine {
    constructor(mixer) { this.mixer = mixer; this.states = {}; this.current = null; }
    addState(name, clip, options) { this.states[name] = { name: name, clip: clip, transitions: options && options.transitions ? options.transitions : {}, action: null }; return this; }
    setState(name, duration) { var next = this.states[name]; if (!next || this.current === next) return this; var previous = this.current; next.action = this.mixer.clipAction(next.clip); next.action.play(); if (previous && previous.action) next.action.crossFadeFrom(previous.action, duration || 0.2); this.current = next; return this; }
    transition(name, duration) { return this.setState(name, duration); }
    update(delta) { this.mixer.update(delta); return this; }
}

export { AnimationStateMachine };
