import { Object3D, Raycaster } from "../core/index.js";

import { ConeGeometry, CylinderGeometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Plane, Vector2, Vector3 } from "../math/index.js";

import { Group, Mesh } from "../objects/index.js";

class TransformControls extends Object3D {
    constructor(zabxa, zabxb) {
        super();
        this.type = "TransformControls";
        this.camera = zabxa;
        this.domElement = zabxb || (typeof document !== "undefined" ? document.body : null);
        this.target = null;
        this.mode = "translate";
        this.dragging = false;
        this.axis = null;
        this.pointer = new Vector2;
        this.prevPointer = new Vector2;
        this.plane = new Plane(new Vector3(0, 0, 1), 0);
        this.raycaster = new Raycaster;
        var zabxc = function(zabxa, zabxb) {
            var zabxc = new Group;
            var zabxd = new Mesh(new CylinderGeometry(.04, .04, 1.2, 8), new BasicMaterial({
                color: zabxb
            }));
            zabxd.position.y = .6;
            var zabxe = new Mesh(new ConeGeometry(.12, .3, 12), new BasicMaterial({
                color: zabxb
            }));
            zabxe.position.y = 1.35;
            zabxc.add(zabxd, zabxe);
            if (zabxa === "x") zabxc.rotation.z = -Math.PI * .5; else if (zabxa === "z") zabxc.rotation.x = Math.PI * .5;
            zabxc.name = "axis_" + zabxa;
            return zabxc;
        };
        this.gizmo = new Group;
        this.gizmo.add(zabxc("x", 16726832));
        this.gizmo.add(zabxc("y", 3458905));
        this.gizmo.add(zabxc("z", 31487));
        this.add(this.gizmo);
        this.initEvents();
    }
    attach(zabxa) {
        this.target = zabxa;
        this.visible = true;
        this.update();
        return this;
    }
    detach() {
        this.target = null;
        this.visible = false;
        return this;
    }
    setMode(zabxa) {
        this.mode = zabxa;
        return this;
    }
    update() {
        if (!this.target) {
            this.visible = false;
            return;
        }
        this.position.copy(this.target.position);
        if (this.camera) {
            var zabxa = this.position.distanceTo(this.camera.position);
            var zabxb = Math.max(.1, zabxa * .15);
            this.scale.set(zabxb, zabxb, zabxb);
        }
    }
    initEvents() {
        if (!this.domElement) return;
        var zabxa = this;
        var zabxb = function(zabxb) {
            if (!zabxa.target) return;
            var zabxc = zabxa.domElement.getBoundingClientRect();
            var zabxd = (zabxb.clientX - zabxc.left) / zabxc.width * 2 - 1;
            var zabxe = -((zabxb.clientY - zabxc.top) / zabxc.height) * 2 + 1;
            zabxa.pointer.set(zabxd, zabxe);
            zabxa.prevPointer.set(zabxd, zabxe);
            zabxa.raycaster.setFromCamera(zabxa.pointer, zabxa.camera);
            var zabxf = zabxa.raycaster.intersectObjects(zabxa.gizmo.children, true);
            if (zabxf.length > 0) {
                zabxa.dragging = true;
                var zabxg = zabxf[0].object.parent;
                zabxa.axis = zabxg && zabxg.name ? zabxg.name.replace("axis_", "") : "y";
            }
        };
        var zabxc = function(zabxb) {
            if (!zabxa.dragging || !zabxa.target) return;
            var zabxc = zabxa.domElement.getBoundingClientRect();
            var zabxd = (zabxb.clientX - zabxc.left) / zabxc.width * 2 - 1;
            var zabxe = -((zabxb.clientY - zabxc.top) / zabxc.height) * 2 + 1;
            var zabxf = (zabxd - zabxa.prevPointer.x) * 5;
            var zabxg = (zabxe - zabxa.prevPointer.y) * 5;
            if (zabxa.mode === "translate") {
                if (zabxa.axis === "x") zabxa.target.position.x += zabxf; else if (zabxa.axis === "y") zabxa.target.position.y += zabxg; else if (zabxa.axis === "z") zabxa.target.position.z += zabxg;
            } else if (zabxa.mode === "rotate") {
                if (zabxa.axis === "x") zabxa.target.rotation.x += zabxg; else if (zabxa.axis === "y") zabxa.target.rotation.y += zabxf; else if (zabxa.axis === "z") zabxa.target.rotation.z += zabxf;
            } else if (zabxa.mode === "scale") {
                var zabxh = 1 + zabxg;
                if (zabxa.axis === "x") zabxa.target.scale.x *= zabxh; else if (zabxa.axis === "y") zabxa.target.scale.y *= zabxh; else if (zabxa.axis === "z") zabxa.target.scale.z *= zabxh;
            }
            zabxa.prevPointer.set(zabxd, zabxe);
            zabxa.update();
        };
        var zabxd = function() {
            zabxa.dragging = false;
            zabxa.axis = null;
        };
        this.domElement.addEventListener("pointerdown", zabxb);
        this.domElement.addEventListener("pointermove", zabxc);
        this.domElement.addEventListener("pointerup", zabxd);
        this._handlers = {
            onDown: zabxb,
            onMove: zabxc,
            onUp: zabxd
        };
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
