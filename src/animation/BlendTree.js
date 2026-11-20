class BlendTree {
    constructor(zabca) {
        this.mixer = zabca;
        this.actions = {};
    }
    add(zabca, zabcb) {
        this.actions[zabca] = this.mixer.clipAction(zabcb);
        return this;
    }
    setWeight(zabca, zabcb) {
        if (this.actions[zabca]) this.actions[zabca].setWeight(zabcb).play();
        return this;
    }
    update(zabca) {
        this.mixer.update(zabca);
        return this;
    }
}

export { BlendTree };
