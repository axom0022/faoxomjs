class RagdollChain {
    constructor() {
        this.bodies = [];
        this.joints = [];
    }
    addBody(zaioa) {
        this.bodies.push(zaioa);
        return this;
    }
    addJoint(zaioa) {
        this.joints.push(zaioa);
        return this;
    }
    solve(zaioa) {
        for (var zaiob = 0; zaiob < this.joints.length; zaiob++) this.joints[zaiob].solve(zaioa);
    }
}

export { RagdollChain };
