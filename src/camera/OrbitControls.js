import { Vector2, Vector3, faoxomclamp } from "../math/index.js";

class OrbitControls {
    constructor(zabta, zabtb) {
        this.camera = zabta;
        this.domElement = zabtb || (typeof document !== "undefined" ? document.body : null);
        this.target = new Vector3(0, 0, 0);
        this.enabled = true;
        this.enableDamping = true;
        this.dampingFactor = .08;
        this.enableZoom = true;
        this.zoomSpeed = 1;
        this.enableRotate = true;
        this.rotateSpeed = 1;
        this.invertX = false;
        this.invertY = false;
        this.invertZoom = false;
        this.enablePan = true;
        this.panSpeed = 1;
        this.autoRotate = false;
        this.autoRotateSpeed = 2;
        this.minDistance = .2;
        this.maxDistance = 1e3;
        this.minPolarAngle = .01;
        this.maxPolarAngle = Math.PI - .01;
        var zabtc = (new Vector3).subVectors(this.camera.position, this.target);
        var zabtd = Math.max(.1, zabtc.length());
        this.spherical = {
            radius: zabtd,
            theta: Math.atan2(zabtc.x, zabtc.z),
            phi: Math.acos(faoxomclamp(zabtc.y / zabtd, -1, 1))
        };
        this.targetSpherical = {
            radius: this.spherical.radius,
            theta: this.spherical.theta,
            phi: this.spherical.phi
        };
        this.isPointerDown = false;
        this.pointerStart = new Vector2;
        this.pointerButton = 0;
        this.initEvents();
    }
    initEvents() {
        if (!this.domElement) return;
        var zabta = this;
        var zabtb = function(zabtb) {
            if (!zabta.enabled) return;
            zabta.isPointerDown = true;
            zabta.pointerButton = zabtb.button;
            zabta.pointerStart.set(zabtb.clientX, zabtb.clientY);
            if (zabta.domElement.setPointerCapture && zabtb.pointerId !== undefined) {
                try {
                    zabta.domElement.setPointerCapture(zabtb.pointerId);
                } catch (zabta) {}
            }
        };
        var zabtc = function(zabtb) {
            if (!zabta.enabled || !zabta.isPointerDown) return;
            var zabtc = zabtb.clientX - zabta.pointerStart.x;
            var zabtd = zabtb.clientY - zabta.pointerStart.y;
            zabta.pointerStart.set(zabtb.clientX, zabtb.clientY);
            if (zabta.pointerButton === 0 && zabta.enableRotate) {
                var zabte = zabta.invertX ? -1 : 1;
                var zabtf = zabta.invertY ? -1 : 1;
                zabta.targetSpherical.theta += zabtc * .005 * zabta.rotateSpeed * zabte;
                zabta.targetSpherical.phi = faoxomclamp(zabta.targetSpherical.phi + zabtd * .005 * zabta.rotateSpeed * zabtf, zabta.minPolarAngle, zabta.maxPolarAngle);
            } else if ((zabta.pointerButton === 2 || zabta.pointerButton === 1) && zabta.enablePan) {
                var zabtg = zabta.spherical.radius * .001 * zabta.panSpeed;
                var zabeth = new Vector3(1, 0, 0).applyQuaternion(zabta.camera.quaternion);
                var zabti = new Vector3(0, 1, 0).applyQuaternion(zabta.camera.quaternion);
                zabta.target.addScaledVector(zabeth, zabtc * zabtg * (zabta.invertX ? -1 : 1));
                zabta.target.addScaledVector(zabti, -zabtd * zabtg * (zabta.invertY ? -1 : 1));
            }
        };
        var zabtd = function(zabtb) {
            zabta.isPointerDown = false;
            if (zabta.domElement && zabta.domElement.releasePointerCapture && zabtb && zabtb.pointerId !== undefined) {
                try {
                    zabta.domElement.releasePointerCapture(zabtb.pointerId);
                } catch (zabta) {}
            }
        };
        var zabte = function(zabtb) {
            if (!zabta.enabled || !zabta.enableZoom) return;
            zabtb.preventDefault();
            var zabtc = faoxomclamp(zabtb.deltaY, -100, 100);
            var zabtd = zabta.invertZoom ? -1 : 1;
            var zabte = Math.pow(.998, -zabtc * zabta.zoomSpeed * zabtd);
            zabta.targetSpherical.radius = faoxomclamp(zabta.targetSpherical.radius * zabte, zabta.minDistance, zabta.maxDistance);
        };
        var zabtf = function(zabta) {
            zabta.preventDefault();
        };
        this.domElement.addEventListener("pointerdown", zabtb);
        this.domElement.addEventListener("pointermove", zabtc);
        window.addEventListener("pointerup", zabtd);
        window.addEventListener("pointercancel", zabtd);
        this.domElement.addEventListener("wheel", zabte, {
            passive: false
        });
        this.domElement.addEventListener("contextmenu", zabtf);
        this._handlers = {
            onPointerDown: zabtb,
            onPointerMove: zabtc,
            onPointerUp: zabtd,
            onWheel: zabte,
            onContext: zabtf
        };
    }
    update(zabta) {
        if (!this.enabled) return;
        if (this.autoRotate) this.targetSpherical.theta += this.autoRotateSpeed * (zabta || .016) * Math.PI / 60;
        var zabtb = this.enableDamping ? this.dampingFactor : 1;
        this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * zabtb;
        this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * zabtb;
        this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * zabtb;
        var zabtc = Math.sin(this.spherical.phi) * this.spherical.radius;
        this.camera.position.x = this.target.x + zabtc * Math.sin(this.spherical.theta);
        this.camera.position.y = this.target.y + Math.cos(this.spherical.phi) * this.spherical.radius;
        this.camera.position.z = this.target.z + zabtc * Math.cos(this.spherical.theta);
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
