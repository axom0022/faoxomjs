import { Euler, faoxomclamp } from "../math/index.js";

class PointerLockControls {
    constructor(zabwa, zabwb) {
        this.camera = zabwa;
        this.domElement = zabwb || (typeof document !== "undefined" ? document.body : null);
        this.isLocked = false;
        this.pitch = 0;
        this.yaw = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var zabwa = this;
        var zabwb = function(zabwb) {
            if (!zabwa.isLocked) return;
            zabwa.yaw -= (zabwb.movementX || 0) * .002;
            zabwa.pitch = faoxomclamp(zabwa.pitch - (zabwb.movementY || 0) * .002, -Math.PI * .48, Math.PI * .48);
            var zabwc = new Euler(zabwa.pitch, zabwa.yaw, 0, "YXZ");
            zabwa.camera.quaternion.setFromEuler(zabwc);
        };
        var zabwc = function() {
            zabwa.isLocked = document.pointerLockElement === zabwa.domElement;
        };
        document.addEventListener("pointerlockchange", zabwc);
        document.addEventListener("mousemove", zabwb);
        this._handlers = {
            onLockChange: zabwc,
            onMouseMove: zabwb
        };
    }
    lock() {
        if (this.domElement && this.domElement.requestPointerLock) this.domElement.requestPointerLock();
    }
    unlock() {
        if (document.exitPointerLock) document.exitPointerLock();
    }
    dispose() {
        if (this._handlers) {
            document.removeEventListener("pointerlockchange", this._handlers.onLockChange);
            document.removeEventListener("mousemove", this._handlers.onMouseMove);
        }
    }
}

export { PointerLockControls };
