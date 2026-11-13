class RagdollChain {
    constructor() {
        this.bodies = [];
        this.joints = [];
    }
    addBody(body) { this.bodies.push(body); return this; }
    addJoint(joint) { this.joints.push(joint); return this; }
    solve(dt) {
        for (var i = 0; i < this.joints.length; i++) this.joints[i].solve(dt);
    }
}

export { RagdollChain };
