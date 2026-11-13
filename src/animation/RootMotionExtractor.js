import { Vector3 } from "../math/index.js";

class RootMotionExtractor {
    constructor(target, root, options) { options = options || {}; this.target = target; this.root = typeof root === "string" && target && target.getObjectByName ? target.getObjectByName(root) : root || target; this.removeFromPose = options.removeFromPose !== false; this.previousPosition = new Vector3(); this.deltaPosition = new Vector3(); this.initialized = false; }
    reset() { this.initialized = false; this.previousPosition.set(0, 0, 0); this.deltaPosition.set(0, 0, 0); return this; }
    update() { if (!this.root || !this.root.position) return this.deltaPosition.set(0, 0, 0); if (!this.initialized) { this.previousPosition.copy(this.root.position); this.initialized = true; } this.deltaPosition.subVectors(this.root.position, this.previousPosition); if (this.removeFromPose) this.root.position.sub(this.deltaPosition); this.previousPosition.copy(this.root.position); return this.deltaPosition; }
    consume(target) { return (target || new Vector3()).copy(this.deltaPosition); }
}

export { RootMotionExtractor };
