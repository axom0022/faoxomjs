import { Euler, faoxomclamp } from "../math/index.js";

class PointerLockControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.isLocked = false;
        this.pitch = 0; this.yaw = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onMouseMove = function(e) {
            if (!self.isLocked) return;
            self.yaw -= (e.movementX || 0) * 0.002;
            self.pitch = faoxomclamp(self.pitch - (e.movementY || 0) * 0.002, -Math.PI * 0.48, Math.PI * 0.48);
            var euler = new Euler(self.pitch, self.yaw, 0, "YXZ");
            self.camera.quaternion.setFromEuler(euler);
        };
        var onLockChange = function() { self.isLocked = document.pointerLockElement === self.domElement; };
        document.addEventListener("pointerlockchange", onLockChange);
        document.addEventListener("mousemove", onMouseMove);
        this._handlers = { onLockChange: onLockChange, onMouseMove: onMouseMove };
    }
    lock() { if (this.domElement && this.domElement.requestPointerLock) this.domElement.requestPointerLock(); }
    unlock() { if (document.exitPointerLock) document.exitPointerLock(); }
    dispose() {
        if (this._handlers) {
            document.removeEventListener("pointerlockchange", this._handlers.onLockChange);
            document.removeEventListener("mousemove", this._handlers.onMouseMove);
        }
    }
}

export { PointerLockControls };
