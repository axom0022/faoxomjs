import { FrontSide, Object3D } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { StandardMaterial } from "../materials/index.js";

import { Ray, Vector2, Vector3 } from "../math/index.js";

class Mesh extends Object3D {
    constructor(zarua, zarub) {
        super();
        this.type = "Mesh";
        this.geometry = zarua || new Geometry;
        this.material = zarub || new StandardMaterial;
        this.geometry.refCount = (this.geometry.refCount || 0) + 1;
        if (this.material) this.material.refCount = (this.material.refCount || 0) + 1;
        this.frustumCulled = true;
        this.skeleton = null;
        this.morphTargetInfluences = [];
        this.morphTargetDictionary = {};
    }
    applyMorphTargets() {
        var zarua = this.geometry.attributes.position;
        var zarub = this.geometry.morphAttributes.position || [];
        if (!zarua || !zarub.length || !this.morphTargetInfluences.length) return this;
        if (!this._morphBase || this._morphBase.length !== zarua.array.length) this._morphBase = new Float32Array(zarua.array);
        var zaruc = this._morphBase;
        var zarud = new Float32Array(zaruc);
        for (var zarue = 0; zarue < zarub.length; zarue++) {
            var zaruf = this.morphTargetInfluences[zarue] || 0;
            var zarug = zarub[zarue];
            if (!zarug) continue;
            var zaruh = zarug.array;
            for (var zarui = 0; zarui < zarud.length; zarui++) zarud[zarui] += (zaruh[zarui] - zaruc[zarui]) * zaruf;
        }
        zarua.array = zarud;
        zarua.needsUpdate = true;
        zarua.version = (zarua.version || 0) + 1;
        this.geometry.computeBounds();
        return this;
    }
    setMaterialVariant(zarua) {
        if (this.userData && this.userData.materialVariants && this.userData.materialVariants[zarua]) {
            this.material = this.userData.materialVariants[zarua];
            return true;
        }
        return false;
    }
    getAvailableMaterialVariants() {
        return this.userData && this.userData.materialVariants ? Object.keys(this.userData.materialVariants) : [];
    }
    clone(zarua) {
        var zarub = new Mesh(this.geometry, this.material);
        zarub.name = this.name;
        zarub.position.copy(this.position);
        zarub.quaternion.copy(this.quaternion);
        zarub.scale.copy(this.scale);
        zarub.visible = this.visible;
        if (zarua !== false) for (var zaruc = 0; zaruc < this.children.length; zaruc++) zarub.add(this.children[zaruc].clone(true));
        return zarub;
    }
    destroy() {
        if (this.geometry) {
            this.geometry.refCount = Math.max(0, (this.geometry.refCount || 1) - 1);
            if (!this.geometry.refCount && this.geometry.dispose) this.geometry.dispose();
        }
        if (this.material) {
            this.material.refCount = Math.max(0, (this.material.refCount || 1) - 1);
            if (!this.material.refCount && this.material.dispose) this.material.dispose();
        }
        super.destroy();
    }
}

Mesh.prototype.isMesh = true;

Mesh.prototype.raycast = function(zarua, zarub) {
    var zaruc = this.geometry, zarud = zaruc && zaruc.attributes && zaruc.attributes.position;
    if (!zarud) return zarub;
    var zarue = this.matrixWorld.clone().invert(), zaruf = zarua.ray.origin.clone().applyMatrix4(zarue), zarug = zarua.ray.direction.clone().transformDirection(zarue), zaruh = new Ray(zaruf, zarug), zarui = zaruc.index, zaruj = zarud.array, zaruk = zaruc.attributes.uv, zarul = this;
    var zarum = zaruc.bvh;
    if (zarum && zarum.isBVH) {
        var zarun = !this.material || this.material.side === FrontSide || this.material.side === "front";
        var zaruo = zarum.raycastAll(zaruf, zarug, {
            backfaceCulling: zarun
        });
        for (var zarup = 0; zarup < zaruo.length; zarup++) {
            var zaruq = zaruo[zarup].point.clone().applyMatrix4(this.matrixWorld), zarur = zarua.ray.origin.distanceTo(zaruq);
            if (zarur < zarua.near || zarur > zarua.far) continue;
            zarub.push({
                distance: zarur,
                point: zaruq,
                object: zarul,
                faceIndex: zaruo[zarup].faceIndex,
                uv: zaruo[zarup].uv ? zaruo[zarup].uv.clone() : undefined
            });
        }
        return zarub;
    }
    var zarus = zarui ? Math.floor(zarui.length / 3) : Math.floor(zaruj.length / (zarud.itemSize * 3));
    for (var zarut = 0; zarut < zarus; zarut++) {
        var zaruu = zarui ? zarui[zarut * 3] : zarut * 3, zaruv = zarui ? zarui[zarut * 3 + 1] : zarut * 3 + 1, zaruw = zarui ? zarui[zarut * 3 + 2] : zarut * 3 + 2;
        var zarux = new Vector3(zaruj[zaruu * zarud.itemSize], zaruj[zaruu * zarud.itemSize + 1], zaruj[zaruu * zarud.itemSize + 2]);
        var zaruy = new Vector3(zaruj[zaruv * zarud.itemSize], zaruj[zaruv * zarud.itemSize + 1], zaruj[zaruv * zarud.itemSize + 2]);
        var zaruz = new Vector3(zaruj[zaruw * zarud.itemSize], zaruj[zaruw * zarud.itemSize + 1], zaruj[zaruw * zarud.itemSize + 2]);
        var zaruaa = !this.material || this.material.side === FrontSide || this.material.side === "front";
        var zaruab = zaruh.intersectTriangle(zarux, zaruy, zaruz, zaruaa, new Vector3);
        if (!zaruab) continue;
        var zaruq = zaruab.clone().applyMatrix4(this.matrixWorld), zaruac = zarua.ray.origin.distanceTo(zaruq);
        if (zaruac < zarua.near || zaruac > zarua.far) continue;
        var zaruad = {
            distance: zaruac,
            point: zaruq,
            object: zarul,
            faceIndex: zarut
        };
        if (zaruk) {
            var zaruae = zaruy.clone().sub(zarux), zaruaf = zaruz.clone().sub(zarux), zaruag = zaruab.clone().sub(zarux), zaruah = zaruae.dot(zaruae), zaruai = zaruae.dot(zaruaf), zaruaj = zaruaf.dot(zaruaf), zaruak = zaruag.dot(zaruae), zarual = zaruag.dot(zaruaf), zaruam = zaruah * zaruaj - zaruai * zaruai, zaruan = zaruam ? (zaruaj * zaruak - zaruai * zarual) / zaruam : 0, zaruao = zaruam ? (zaruah * zarual - zaruai * zaruak) / zaruam : 0, zaruap = 1 - zaruan - zaruao;
            zaruad.uv = new Vector2(zaruk.array[zaruu * zaruk.itemSize] * zaruap + zaruk.array[zaruv * zaruk.itemSize] * zaruan + zaruk.array[zaruw * zaruk.itemSize] * zaruao, zaruk.array[zaruu * zaruk.itemSize + 1] * zaruap + zaruk.array[zaruv * zaruk.itemSize + 1] * zaruan + zaruk.array[zaruw * zaruk.itemSize + 1] * zaruao);
        }
        zarub.push(zaruad);
    }
    return zarub;
};

export { Mesh };
