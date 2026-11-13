import { Object3D, Raycaster } from "../core/index.js";
import { ConeGeometry, CylinderGeometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Plane, Vector2, Vector3 } from "../math/index.js";
import { Group, Mesh } from "../objects/index.js";

class TransformControls extends Object3D {
    constructor(camera, domElement) {
        super();
        this.type = "TransformControls";
        this.camera = camera;
        this.domElement = domElement || (typeof document !== "undefined" ? document.body : null);
        this.target = null;
        this.mode = "translate";
        this.dragging = false;
        this.axis = null;
        this.pointer = new Vector2();
        this.prevPointer = new Vector2();
        this.plane = new Plane(new Vector3(0, 0, 1), 0);
        this.raycaster = new Raycaster();
        
        var makeArrow = function(dir, color) {
            var group = new Group();
            var shaft = new Mesh(new CylinderGeometry(0.04, 0.04, 1.2, 8), new BasicMaterial({ color: color }));
            shaft.position.y = 0.6;
            var tip = new Mesh(new ConeGeometry(0.12, 0.3, 12), new BasicMaterial({ color: color }));
            tip.position.y = 1.35;
            group.add(shaft, tip);
            if (dir === "x") group.rotation.z = -Math.PI * 0.5;
            else if (dir === "z") group.rotation.x = Math.PI * 0.5;
            group.name = "axis_" + dir;
            return group;
        };
        this.gizmo = new Group();
        this.gizmo.add(makeArrow("x", 0xff3b30));
        this.gizmo.add(makeArrow("y", 0x34c759));
        this.gizmo.add(makeArrow("z", 0x007aff));
        this.add(this.gizmo);
        this.initEvents();
    }
    attach(object) { this.target = object; this.visible = true; this.update(); return this; }
    detach() { this.target = null; this.visible = false; return this; }
    setMode(mode) { this.mode = mode; return this; }
    update() {
        if (!this.target) { this.visible = false; return; }
        this.position.copy(this.target.position);
        if (this.camera) {
            var dist = this.position.distanceTo(this.camera.position);
            var scale = Math.max(0.1, dist * 0.15);
            this.scale.set(scale, scale, scale);
        }
    }
    initEvents() {
        if (!this.domElement) return;
        var self = this;
        var onDown = function(e) {
            if (!self.target) return;
            var rect = self.domElement.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            self.pointer.set(x, y); self.prevPointer.set(x, y);
            self.raycaster.setFromCamera(self.pointer, self.camera);
            var intersects = self.raycaster.intersectObjects(self.gizmo.children, true);
            if (intersects.length > 0) {
                self.dragging = true;
                var parent = intersects[0].object.parent;
                self.axis = parent && parent.name ? parent.name.replace("axis_", "") : "y";
            }
        };
        var onMove = function(e) {
            if (!self.dragging || !self.target) return;
            var rect = self.domElement.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            var dx = (x - self.prevPointer.x) * 5;
            var dy = (y - self.prevPointer.y) * 5;
            if (self.mode === "translate") {
                if (self.axis === "x") self.target.position.x += dx;
                else if (self.axis === "y") self.target.position.y += dy;
                else if (self.axis === "z") self.target.position.z += dy;
            } else if (self.mode === "rotate") {
                if (self.axis === "x") self.target.rotation.x += dy;
                else if (self.axis === "y") self.target.rotation.y += dx;
                else if (self.axis === "z") self.target.rotation.z += dx;
            } else if (self.mode === "scale") {
                var factor = 1 + dy;
                if (self.axis === "x") self.target.scale.x *= factor;
                else if (self.axis === "y") self.target.scale.y *= factor;
                else if (self.axis === "z") self.target.scale.z *= factor;
            }
            self.prevPointer.set(x, y);
            self.update();
        };
        var onUp = function() { self.dragging = false; self.axis = null; };
        this.domElement.addEventListener("pointerdown", onDown);
        this.domElement.addEventListener("pointermove", onMove);
        this.domElement.addEventListener("pointerup", onUp);
        this._handlers = { onDown: onDown, onMove: onMove, onUp: onUp };
    }
    dispose() {
        if (this.domElement && this._handlers) {
            this.domElement.removeEventListener("pointerdown", this._handlers.onDown);
            this.domElement.removeEventListener("pointermove", this._handlers.onMove);
            this.domElement.removeEventListener("pointerup", this._handlers.onUp);
        }
    }
}

export { TransformControls };
