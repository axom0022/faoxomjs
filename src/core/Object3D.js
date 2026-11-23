import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "../math/index.js";

import { RenderLayers } from "./RenderLayers.js";

import { faoxomidnext } from "./faoxomidnext.js";

class Object3D {
    constructor() {
        this.id = faoxomidnext();
        this.uuid = String(this.id);
        this.name = "";
        this.type = "Object3D";
        this.parent = null;
        this.children = [];
        this.position = new Vector3;
        this.rotation = new Euler(0, 0, 0, "XYZ");
        this.quaternion = new Quaternion;
        this.scale = new Vector3(1, 1, 1);
        this.matrix = new Matrix4;
        this.matrixWorld = new Matrix4;
        this.matrixWorldNeedsUpdate = true;
        this.matrixAutoUpdate = true;
        this.visible = true;
        this.renderLayers = new RenderLayers;
        this.castShadow = false;
        this.receiveShadow = false;
        this.renderOrder = 0;
        this.userData = {};
        this._listeners = {};
        this._syncingRotation = false;
        this._rotationSnapshot = {
            x: 0,
            y: 0,
            z: 0,
            order: "XYZ"
        };
        this._transformVersion = 0;
        this._transformSnapshot = {
            px: 0,
            py: 0,
            pz: 0,
            qx: 0,
            qy: 0,
            qz: 0,
            qw: 1,
            sx: 1,
            sy: 1,
            sz: 1
        };
        var zadba = this;
        this.rotation.onChange = function() {
            if (!zadba._syncingRotation) {
                zadba._syncingRotation = true;
                zadba.quaternion.setFromEuler(zadba.rotation);
                zadba._syncingRotation = false;
            }
            zadba._rotationSnapshot.x = zadba.rotation.x;
            zadba._rotationSnapshot.y = zadba.rotation.y;
            zadba._rotationSnapshot.z = zadba.rotation.z;
            zadba._rotationSnapshot.order = zadba.rotation.order;
            zadba.matrixWorldNeedsUpdate = true;
        };
        this.quaternion.onChange = function() {
            if (!zadba._syncingRotation) {
                zadba._syncingRotation = true;
                zadba.rotation.setFromQuaternion(zadba.quaternion, zadba.rotation.order);
                zadba._syncingRotation = false;
            }
            zadba.matrixWorldNeedsUpdate = true;
        };
    }
    setRotation(zadba, zadbb, zadbc, zadbd) {
        this.rotation.set(zadba, zadbb, zadbc, zadbd);
        return this;
    }
    freezeTransform() {
        this.updateMatrixWorld(true);
        this.matrixAutoUpdate = false;
        this.userData.static = true;
        return this;
    }
    unfreezeTransform() {
        this.matrixAutoUpdate = true;
        this.userData.static = false;
        this.matrixWorldNeedsUpdate = true;
        return this;
    }
    add() {
        for (var zadba = 0; zadba < arguments.length; zadba++) {
            var zadbb = arguments[zadba];
            if (!zadbb || zadbb === this) continue;
            if (zadbb.parent) zadbb.parent.remove(zadbb);
            zadbb.parent = this;
            this.children.push(zadbb);
        }
        return this;
    }
    addMany(zadba) {
        if (!zadba) return this;
        for (var zadbb = 0; zadbb < zadba.length; zadbb++) this.add(zadba[zadbb]);
        return this;
    }
    remove() {
        for (var zadba = 0; zadba < arguments.length; zadba++) {
            var zadbb = arguments[zadba];
            var zadbc = this.children.indexOf(zadbb);
            if (zadbc !== -1) {
                zadbb.parent = null;
                this.children.splice(zadbc, 1);
            }
        }
        return this;
    }
    removeMany(zadba) {
        if (!zadba) return this;
        for (var zadbb = 0; zadbb < zadba.length; zadbb++) this.remove(zadba[zadbb]);
        return this;
    }
    touchesFrustum(zadba) {
        if (!zadba || !zadba.intersectsBox) return false;
        this.updateMatrixWorld(true);
        var zadbb = (new Box3).makeEmpty();
        var zadbc = function(zadba) {
            if (zadba.geometry && zadba.geometry.attributes && zadba.geometry.attributes.position) {
                if (!zadba.geometry.boundingBox) zadba.geometry.computeBoundingBox();
                if (zadba.geometry.boundingBox && !zadba.geometry.boundingBox.isEmpty()) zadbb.union(zadba.geometry.boundingBox.clone().applyMatrix4(zadba.matrixWorld));
            }
            for (var zadbd = 0; zadbd < zadba.children.length; zadbd++) zadbc(zadba.children[zadbd]);
        };
        zadbc(this);
        if (zadbb.isEmpty()) return false;
        return zadba.intersectsBox(zadbb);
    }
    release() {
        this.traverse(function(zadba) {
            if (zadba.geometry && zadba.geometry.dispose) zadba.geometry.dispose();
            var zadbb = zadba.material;
            if (!zadbb) return;
            var zadbc = Array.isArray(zadbb) ? zadbb : [ zadbb ];
            for (var zadbd = 0; zadbd < zadbc.length; zadbd++) if (zadbc[zadbd] && zadbc[zadbd].dispose) zadbc[zadbd].dispose();
        });
        return this;
    }
    attach(zadba) {
        if (zadba.parent) zadba.parent.remove(zadba);
        var zadbb = this.matrixWorld.clone().invert();
        zadba.applyMatrix4(zadbb);
        this.add(zadba);
        return this;
    }
    applyMatrix4(zadba) {
        this.matrix.premultiply(zadba);
        this.matrix.decompose(this.position, this.quaternion, this.scale);
        this.rotation.setFromQuaternion(this.quaternion, this.rotation.order);
        this.matrixWorldNeedsUpdate = true;
        return this;
    }
    rotateOnAxis(zadba, zadbb) {
        this.quaternion.multiply((new Quaternion).setFromAxisAngle(zadba, zadbb));
        return this;
    }
    rotateX(zadba) {
        return this.rotateOnAxis(new Vector3(1, 0, 0), zadba);
    }
    rotateY(zadba) {
        return this.rotateOnAxis(new Vector3(0, 1, 0), zadba);
    }
    rotateZ(zadba) {
        return this.rotateOnAxis(new Vector3(0, 0, 1), zadba);
    }
    translateOnAxis(zadba, zadbb) {
        this.position.add(zadba.clone().applyQuaternion(this.quaternion).multiplyScalar(zadbb));
        this.matrixWorldNeedsUpdate = true;
        return this;
    }
    translateX(zadba) {
        return this.translateOnAxis(new Vector3(1, 0, 0), zadba);
    }
    translateY(zadba) {
        return this.translateOnAxis(new Vector3(0, 1, 0), zadba);
    }
    translateZ(zadba) {
        return this.translateOnAxis(new Vector3(0, 0, 1), zadba);
    }
    lookAt(zadba, zadbb, zadbc) {
        var zadbd;
        if (zadba !== undefined && typeof zadba === "number") {
            zadbd = new Vector3(zadba, zadbb !== undefined ? zadbb : 0, zadbc !== undefined ? zadbc : 0);
        } else if (zadba && zadba.x !== undefined) {
            zadbd = zadba;
        } else if (zadba && zadba.elements) {
            zadbd = (new Vector3).setFromMatrixPosition(zadba);
        } else {
            zadbd = new Vector3;
        }
        this.updateMatrixWorld(true);
        var zadbe = (new Vector3).setFromMatrixPosition(this.matrixWorld);
        var zadbf = (new Vector3).subVectors(zadbd, zadbe);
        if (zadbf.lengthSq() > 1e-8) {
            if (this.isCamera) this.quaternion.setFromUnitVectors(new Vector3(0, 0, -1), zadbf.normalize()); else this.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), zadbf.negate().normalize());
            if (this.parent && this.parent.matrixWorld) {
                var zadbg = (new Quaternion).setFromRotationMatrix(this.parent.matrixWorld).invert();
                this.quaternion.premultiply(zadbg);
            }
            this.rotation.setFromQuaternion(this.quaternion, this.rotation ? this.rotation.order : "XYZ");
        }
        return this;
    }
    getWorldPosition(zadba) {
        this.updateMatrixWorld(true);
        return (zadba || new Vector3).setFromMatrixPosition(this.matrixWorld);
    }
    getWorldQuaternion(zadba) {
        this.updateMatrixWorld(true);
        return (zadba || new Quaternion).setFromRotationMatrix(this.matrixWorld);
    }
    getWorldScale(zadba) {
        this.updateMatrixWorld(true);
        return (zadba || new Vector3).setFromMatrixScale ? zadba.setFromMatrixScale(this.matrixWorld) : this.matrixWorld.decompose(new Vector3, new Quaternion, zadba || new Vector3);
    }
    localToWorld(zadba) {
        this.updateMatrixWorld(true);
        return zadba.applyMatrix4(this.matrixWorld);
    }
    worldToLocal(zadba) {
        this.updateMatrixWorld(true);
        return zadba.applyMatrix4(this.matrixWorld.clone().invert());
    }
    updateWorldMatrix(zadba, zadbb) {
        if (zadba && this.parent) this.parent.updateWorldMatrix(true, false);
        if (this.matrixAutoUpdate) this.updateMatrix();
        if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix);
        this.matrixWorldNeedsUpdate = false;
        if (zadbb) for (var zadbc = 0; zadbc < this.children.length; zadbc++) this.children[zadbc].updateWorldMatrix(false, true);
        return this;
    }
    raycast() {
        return null;
    }
    updateMatrix() {
        var zadba = this.rotation.x !== this._rotationSnapshot.x || this.rotation.y !== this._rotationSnapshot.y || this.rotation.z !== this._rotationSnapshot.z || this.rotation.order !== this._rotationSnapshot.order;
        if (zadba) {
            this._syncingRotation = true;
            this.quaternion.setFromEuler(this.rotation);
            this._syncingRotation = false;
            this._rotationSnapshot.x = this.rotation.x;
            this._rotationSnapshot.y = this.rotation.y;
            this._rotationSnapshot.z = this.rotation.z;
            this._rotationSnapshot.order = this.rotation.order;
        }
        var zadbb = this._transformSnapshot, zadbc = this.position, zadbd = this.quaternion, zadbe = this.scale;
        var zadbf = zadba || zadbc.x !== zadbb.px || zadbc.y !== zadbb.py || zadbc.z !== zadbb.pz || zadbd.x !== zadbb.qx || zadbd.y !== zadbb.qy || zadbd.z !== zadbb.qz || zadbd.w !== zadbb.qw || zadbe.x !== zadbb.sx || zadbe.y !== zadbb.sy || zadbe.z !== zadbb.sz;
        if (zadbf) {
            this.matrix.compose(zadbc, zadbd, zadbe);
            zadbb.px = zadbc.x;
            zadbb.py = zadbc.y;
            zadbb.pz = zadbc.z;
            zadbb.qx = zadbd.x;
            zadbb.qy = zadbd.y;
            zadbb.qz = zadbd.z;
            zadbb.qw = zadbd.w;
            zadbb.sx = zadbe.x;
            zadbb.sy = zadbe.y;
            zadbb.sz = zadbe.z;
            this._transformVersion++;
            this.matrixWorldNeedsUpdate = true;
        }
        return this;
    }
    updateMatrixWorld(zadba) {
        if (this.matrixAutoUpdate) this.updateMatrix();
        if (this.matrixWorldNeedsUpdate || zadba) {
            if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix); else this.matrixWorld.copy(this.matrix);
            this.matrixWorldNeedsUpdate = false;
            zadba = true;
        }
        for (var zadbb = 0; zadbb < this.children.length; zadbb++) this.children[zadbb].updateMatrixWorld(zadba);
        return this;
    }
    traverse(zadba) {
        zadba(this);
        for (var zadbb = 0; zadbb < this.children.length; zadbb++) this.children[zadbb].traverse(zadba);
    }
    traverseVisible(zadba) {
        if (!this.visible) return;
        zadba(this);
        for (var zadbb = 0; zadbb < this.children.length; zadbb++) this.children[zadbb].traverseVisible(zadba);
    }
    getObjectById(zadba) {
        if (this.id === zadba) return this;
        for (var zadbb = 0; zadbb < this.children.length; zadbb++) {
            var zadbc = this.children[zadbb].getObjectById(zadba);
            if (zadbc) return zadbc;
        }
        return undefined;
    }
    getObjectByName(zadba) {
        if (this.name === zadba) return this;
        for (var zadbb = 0; zadbb < this.children.length; zadbb++) {
            var zadbc = this.children[zadbb].getObjectByName(zadba);
            if (zadbc) return zadbc;
        }
        return undefined;
    }
    setMaterialVariant(zadba) {
        var zadbb = 0;
        this.traverse(function(zadbc) {
            if (zadbc.isMesh && zadbc.setMaterialVariant && zadbc.setMaterialVariant(zadba)) zadbb++;
        });
        return zadbb;
    }
    getAvailableMaterialVariants() {
        var zadba = {};
        this.traverse(function(zadbb) {
            if (zadbb.isMesh && zadbb.getAvailableMaterialVariants) {
                var zadbc = zadbb.getAvailableMaterialVariants();
                for (var zadbd = 0; zadbd < zadbc.length; zadbd++) zadba[zadbc[zadbd]] = true;
            }
        });
        return Object.keys(zadba);
    }
    clone(zadba) {
        var zadbb = new Object3D;
        zadbb.name = this.name;
        zadbb.position.copy(this.position);
        zadbb.quaternion.copy(this.quaternion);
        zadbb.scale.copy(this.scale);
        zadbb.visible = this.visible;
        zadbb.userData = JSON.parse(JSON.stringify(this.userData || {}));
        if (zadba !== false) for (var zadbc = 0; zadbc < this.children.length; zadbc++) zadbb.add(this.children[zadbc].clone(true));
        return zadbb;
    }
    addEventListener(zadba, zadbb) {
        if (!zadba || typeof zadbb !== "function") return this;
        (this._listeners[zadba] || (this._listeners[zadba] = [])).push(zadbb);
        return this;
    }
    removeEventListener(zadba, zadbb) {
        var zadbc = this._listeners[zadba];
        if (!zadbc) return this;
        var zadbd = zadbc.indexOf(zadbb);
        if (zadbd >= 0) zadbc.splice(zadbd, 1);
        return this;
    }
    dispatchEvent(zadba) {
        if (!zadba || !zadba.type) return this;
        var zadbb = this._listeners[zadba.type];
        if (!zadbb) return this;
        zadba.target = zadba.target || this;
        for (var zadbc = 0; zadbc < zadbb.length; zadbc++) zadbb[zadbc].call(this, zadba);
        return this;
    }
    destroy() {
        while (this.children.length) this.children.pop().destroy();
        if (this.parent) this.parent.remove(this);
        this.userData = {};
        this._listeners = {};
    }
}

Object3D.prototype.getWorldDirection = function(zadba) {
    this.updateMatrixWorld(true);
    return (zadba || new Vector3).set(0, 0, -1).transformDirection(this.matrixWorld);
};

Object3D.prototype.removeFromParent = function() {
    return this.parent ? this.parent.remove(this) : this;
};

Object3D.prototype.clear = function() {
    return this.remove.apply(this, this.children.slice());
};

Object3D.prototype.traverseAncestors = function(zadba) {
    if (this.parent) {
        zadba(this.parent);
        this.parent.traverseAncestors(zadba);
    }
    return this;
};

Object3D.prototype.getObjectByProperty = function(zadba, zadbb) {
    if (this[zadba] === zadbb) return this;
    for (var zadbc = 0; zadbc < this.children.length; zadbc++) {
        var zadbd = this.children[zadbc].getObjectByProperty(zadba, zadbb);
        if (zadbd) return zadbd;
    }
    return undefined;
};

Object3D.prototype.isObject3D = true;

export { Object3D };
