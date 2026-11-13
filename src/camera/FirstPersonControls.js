import { Euler, Vector3, faoxomclamp } from "../math/index.js";

class FirstPersonControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.movementSpeed = 10.0;
        this.lookSpeed = 0.005;
        this.keys = {};
        this.pitch = 0; this.yaw = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onKeyDown = function(e) { self.keys[e.code] = true; };
        var onKeyUp = function(e) { self.keys[e.code] = false; };
        var onMouseMove = function(e) {
            if (e.buttons === 1) {
                self.yaw -= e.movementX * self.lookSpeed;
                self.pitch = faoxomclamp(self.pitch - e.movementY * self.lookSpeed, -Math.PI * 0.48, Math.PI * 0.48);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        this.domElement.addEventListener("mousemove", onMouseMove);
        this._handlers = { onKeyDown: onKeyDown, onKeyUp: onKeyUp, onMouseMove: onMouseMove };
    }
    update(dt) {
        var delta = dt || 0.016;
        var speed = this.movementSpeed * delta;
        var forward = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        var right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        if (this.keys["KeyW"] || this.keys["ArrowUp"]) this.camera.position.addScaledVector(forward, speed);
        if (this.keys["KeyS"] || this.keys["ArrowDown"]) this.camera.position.addScaledVector(forward, -speed);
        if (this.keys["KeyA"] || this.keys["ArrowLeft"]) this.camera.position.addScaledVector(right, -speed);
        if (this.keys["KeyD"] || this.keys["ArrowRight"]) this.camera.position.addScaledVector(right, speed);
        var euler = new Euler(this.pitch, this.yaw, 0, "YXZ");
        this.camera.quaternion.setFromEuler(euler);
    }
    dispose() {
        if (this._handlers) {
            window.removeEventListener("keydown", this._handlers.onKeyDown);
            window.removeEventListener("keyup", this._handlers.onKeyUp);
            if (this.domElement) this.domElement.removeEventListener("mousemove", this._handlers.onMouseMove);
        }
    }
}

export { FirstPersonControls };
