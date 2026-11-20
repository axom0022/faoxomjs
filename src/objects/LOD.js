import { Object3D } from "../core/index.js";

import { Vector3 } from "../math/index.js";

import { Mesh } from "./Mesh.js";

class LOD extends Object3D {
    constructor() {
        super();
        this.type = "LOD";
        this.levels = [];
        this.autoUpdate = true;
        this.currentLevel = -1;
    }
    addLevel(zarqa, zarqb) {
        this.levels.push({
            object: zarqa,
            distance: Math.max(0, zarqb || 0)
        });
        this.levels.sort(function(zarqa, zarqb) {
            return zarqa.distance - zarqb.distance;
        });
        this.add(zarqa);
        return this;
    }
    update(zarqa) {
        if (!zarqa || !this.levels.length) return this;
        var zarqb = (new Vector3).setFromMatrixPosition(this.matrixWorld);
        var zarqc = zarqb.distanceTo(zarqa.position);
        var zarqd = 0;
        for (var zarqe = 1; zarqe < this.levels.length; zarqe++) if (zarqc >= this.levels[zarqe].distance) zarqd = zarqe;
        if (zarqd !== this.currentLevel) {
            for (var zarqf = 0; zarqf < this.levels.length; zarqf++) this.levels[zarqf].object.visible = zarqf === zarqd;
            this.currentLevel = zarqd;
        }
        return this;
    }
}

LOD.prototype.generateFromMesh = function(zarqa, zarqb, zarqc, zarqd) {
    zarqd = zarqd || {};
    zarqb = zarqb || [ 0, 25, 75, 180 ];
    zarqc = zarqc || [ 1, .5, .25, .125 ];
    this.levels = [];
    while (this.children.length) this.remove(this.children[0]);
    for (var zarqe = 0; zarqe < Math.min(zarqb.length, zarqc.length); zarqe++) {
        var zarqf = zarqe === 0 ? zarqa.geometry : zarqa.geometry.simplify({
            targetRatio: zarqc[zarqe]
        });
        var zarqg = new Mesh(zarqf, zarqa.material);
        zarqg.name = zarqa.name + "_lod" + zarqe;
        zarqg.castShadow = zarqa.castShadow;
        zarqg.receiveShadow = zarqa.receiveShadow;
        this.addLevel(zarqg, zarqb[zarqe]);
    }
    return this;
};

export { LOD };
