import { Vector3 } from "../math/index.js";

class FloatingOrigin {
    constructor(options) {
        options = options || {};
        this.threshold = options.threshold === undefined ? 100000 : options.threshold;
        this.origin = { x: 0, y: 0, z: 0 };
        this.rebaseCount = 0;
        this.onRebase = options.onRebase || null;
    }
    shiftNode(node, shift) {
        if (!node) return this;
        node.position.x -= shift.x;
        node.position.y -= shift.y;
        node.position.z -= shift.z;
        return this;
    }
    rebase(scene, camera, shift, physicsWorld) {
        var dx = shift.x || 0, dy = shift.y || 0, dz = shift.z || 0;
        var delta = { x: dx, y: dy, z: dz };
        if (scene) {
            var children = scene.children.slice();
            for (var i = 0; i < children.length; i++) this.shiftNode(children[i], delta);
        }
        if (camera) this.shiftNode(camera, delta);
        if (physicsWorld && physicsWorld.bodies) {
            for (var b = 0; b < physicsWorld.bodies.length; b++) {
                var body = physicsWorld.bodies[b];
                if (body && body.position) {
                    body.position.x -= dx;
                    body.position.y -= dy;
                    body.position.z -= dz;
                }
            }
        }
        this.origin.x += dx;
        this.origin.y += dy;
        this.origin.z += dz;
        this.rebaseCount++;
        if (typeof this.onRebase === "function") this.onRebase(delta, this);
        return this;
    }
    cameraWorldPosition(camera, target) {
        camera.updateMatrixWorld(true);
        var elements = camera.matrixWorld.elements;
        return (target || new Vector3()).set(elements[12], elements[13], elements[14]);
    }
    update(scene, camera, physicsWorld) {
        if (!camera) return false;
        camera.updateMatrixWorld(true);
        var elements = camera.matrixWorld.elements;
        var wx = elements[12], wy = elements[13], wz = elements[14];
        if (Math.abs(wx) <= this.threshold && Math.abs(wy) <= this.threshold && Math.abs(wz) <= this.threshold) return false;
        this.rebase(scene, camera, { x: wx, y: wy, z: wz }, physicsWorld);
        return true;
    }
    worldPosition(object, target) {
        if (!object) return (target || new Vector3()).set(0, 0, 0);
        object.updateMatrixWorld(true);
        var elements = object.matrixWorld.elements;
        return (target || new Vector3()).set(this.origin.x + elements[12], this.origin.y + elements[13], this.origin.z + elements[14]);
    }
}

export { FloatingOrigin };
