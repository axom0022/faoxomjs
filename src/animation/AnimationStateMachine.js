class AnimationStateMachine {
    constructor(zabaa) {
        this.mixer = zabaa;
        this.states = {};
        this.current = null;
    }
    addState(zabaa, zabab, zabac) {
        this.states[zabaa] = {
            name: zabaa,
            clip: zabab,
            transitions: zabac && zabac.transitions ? zabac.transitions : {},
            action: null
        };
        return this;
    }
    setState(zabaa, zabab) {
        var zabac = this.states[zabaa];
        if (!zabac || this.current === zabac) return this;
        var zabad = this.current;
        zabac.action = this.mixer.clipAction(zabac.clip);
        zabac.action.play();
        if (zabad && zabad.action) zabac.action.crossFadeFrom(zabad.action, zabab || .2);
        this.current = zabac;
        return this;
    }
    transition(zabaa, zabab) {
        return this.setState(zabaa, zabab);
    }
    update(zabaa) {
        this.mixer.update(zabaa);
        return this;
    }
}

export { AnimationStateMachine };
