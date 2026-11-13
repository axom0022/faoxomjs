class BlendTree {
    constructor(mixer) { this.mixer = mixer; this.actions = {}; }
    add(name, clip) { this.actions[name] = this.mixer.clipAction(clip); return this; }
    setWeight(name, weight) { if (this.actions[name]) this.actions[name].setWeight(weight).play(); return this; }
    update(delta) { this.mixer.update(delta); return this; }
}

export { BlendTree };
