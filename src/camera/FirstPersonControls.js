import { Euler, Vector3, faoxomclamp } from "../math/index.js";

class FirstPersonControls {
    constructor(zabqa, zabqb) {
        this.camera = zabqa;
        this.domElement = zabqb || (typeof document !== "undefined" ? document.body : null);
        this.movementSpeed = 10;
        this.lookSpeed = .005;
        this.keys = {};
        this.pitch = 0;
        this.yaw = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var zabqa = this;
        var zabqb = function(zabqb) {
            zabqa.keys[zabqb.code] = true;
        };
        var zabqc = function(zabqb) {
            zabqa.keys[zabqb.code] = false;
        };
        var zabqd = function(zabqb) {
            if (zabqb.buttons === 1) {
                zabqa.yaw -= zabqb.movementX * zabqa.lookSpeed;
                zabqa.pitch = faoxomclamp(zabqa.pitch - zabqb.movementY * zabqa.lookSpeed, -Math.PI * .48, Math.PI * .48);
            }
        };
        window.addEventListener("keydown", zabqb);
        window.addEventListener("keyup", zabqc);
        this.domElement.addEventListener("mousemove", zabqd);
        this._handlers = {
            onKeyDown: zabqb,
            onKeyUp: zabqc,
            onMouseMove: zabqd
        };
    }
    update(zabqa) {
        var zabqb = zabqa || .016;
        var zabqc = this.movementSpeed * zabqb;
        var zabqd = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        var zabqe = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        if (this.keys["KeyW"] || this.keys["ArrowUp"]) this.camera.position.addScaledVector(zabqd, zabqc);
        if (this.keys["KeyS"] || this.keys["ArrowDown"]) this.camera.position.addScaledVector(zabqd, -zabqc);
        if (this.keys["KeyA"] || this.keys["ArrowLeft"]) this.camera.position.addScaledVector(zabqe, -zabqc);
        if (this.keys["KeyD"] || this.keys["ArrowRight"]) this.camera.position.addScaledVector(zabqe, zabqc);
        var zabqf = new Euler(this.pitch, this.yaw, 0, "YXZ");
        this.camera.quaternion.setFromEuler(zabqf);
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
