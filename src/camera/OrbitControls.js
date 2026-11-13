import { Vector2, Vector3, faoxomclamp } from "../math/index.js";

class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.target = new Vector3(0, 0, 0);
        this.enabled = true;
        this.enableDamping = true;
        this.dampingFactor = 0.08;
        this.enableZoom = true;
        this.zoomSpeed = 1.0;
        this.enableRotate = true;
        this.rotateSpeed = 1.0;
        this.enablePan = true;
        this.panSpeed = 1.0;
        this.autoRotate = false;
        this.autoRotateSpeed = 2.0;
        this.minDistance = 0.2;
        this.maxDistance = 1000;
        this.minPolarAngle = 0.01;
        this.maxPolarAngle = Math.PI - 0.01;
        
        var offset = new Vector3().subVectors(this.camera.position, this.target);
        var r = Math.max(0.1, offset.length());
        this.spherical = {
            radius: r,
            theta: Math.atan2(offset.x, offset.z),
            phi: Math.acos(faoxomclamp(offset.y / r, -1, 1))
        };
        this.targetSpherical = { radius: this.spherical.radius, theta: this.spherical.theta, phi: this.spherical.phi };
        this.isPointerDown = false;
        this.pointerStart = new Vector2();
        this.pointerButton = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onPointerDown = function(e) {
            if (!self.enabled) return;
            self.isPointerDown = true;
            self.pointerButton = e.button;
            self.pointerStart.set(e.clientX, e.clientY);
            if (self.domElement.setPointerCapture && e.pointerId !== undefined) {
                try { self.domElement.setPointerCapture(e.pointerId); } catch(err) {}
            }
        };
        var onPointerMove = function(e) {
            if (!self.enabled || !self.isPointerDown) return;
            var dx = e.clientX - self.pointerStart.x;
            var dy = e.clientY - self.pointerStart.y;
            self.pointerStart.set(e.clientX, e.clientY);
            if (self.pointerButton === 0 && self.enableRotate) {
                self.targetSpherical.theta -= (dx * 0.005) * self.rotateSpeed;
                self.targetSpherical.phi = faoxomclamp(self.targetSpherical.phi + (dy * 0.005) * self.rotateSpeed, self.minPolarAngle, self.maxPolarAngle);
            } else if ((self.pointerButton === 2 || self.pointerButton === 1) && self.enablePan) {
                var factor = self.spherical.radius * 0.001 * self.panSpeed;
                var right = new Vector3(1, 0, 0).applyQuaternion(self.camera.quaternion);
                var up = new Vector3(0, 1, 0).applyQuaternion(self.camera.quaternion);
                self.target.addScaledVector(right, -dx * factor);
                self.target.addScaledVector(up, dy * factor);
            }
        };
        var onPointerUp = function(e) {
            self.isPointerDown = false;
            if (self.domElement && self.domElement.releasePointerCapture && e && e.pointerId !== undefined) {
                try { self.domElement.releasePointerCapture(e.pointerId); } catch(err) {}
            }
        };
        var onWheel = function(e) {
            if (!self.enabled || !self.enableZoom) return;
            e.preventDefault();
            var delta = faoxomclamp(e.deltaY, -100, 100);
            var scale = Math.pow(0.998, delta * self.zoomSpeed);
            self.targetSpherical.radius = faoxomclamp(self.targetSpherical.radius * scale, self.minDistance, self.maxDistance);
        };
        var onContext = function(e) { e.preventDefault(); };

        this.domElement.addEventListener("pointerdown", onPointerDown);
        this.domElement.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        this.domElement.addEventListener("wheel", onWheel, { passive: false });
        this.domElement.addEventListener("contextmenu", onContext);
        this._handlers = { onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onWheel: onWheel, onContext: onContext };
    }
    update(dt) {
        if (!this.enabled) return;
        if (this.autoRotate) this.targetSpherical.theta += (this.autoRotateSpeed * (dt || 0.016) * Math.PI) / 60;
        var damp = this.enableDamping ? this.dampingFactor : 1;
        this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * damp;
        this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * damp;
        this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * damp;
        var sinPhiRadius = Math.sin(this.spherical.phi) * this.spherical.radius;
        this.camera.position.x = this.target.x + sinPhiRadius * Math.sin(this.spherical.theta);
        this.camera.position.y = this.target.y + Math.cos(this.spherical.phi) * this.spherical.radius;
        this.camera.position.z = this.target.z + sinPhiRadius * Math.cos(this.spherical.theta);
        this.camera.lookAt(this.target);
    }
    dispose() {
        if (this._handlers) {
            if (this.domElement) {
                this.domElement.removeEventListener("pointerdown", this._handlers.onPointerDown);
                this.domElement.removeEventListener("pointermove", this._handlers.onPointerMove);
                this.domElement.removeEventListener("wheel", this._handlers.onWheel);
                this.domElement.removeEventListener("contextmenu", this._handlers.onContext);
            }
            window.removeEventListener("pointerup", this._handlers.onPointerUp);
            window.removeEventListener("pointercancel", this._handlers.onPointerUp);
        }
    }
}

export { OrbitControls };
