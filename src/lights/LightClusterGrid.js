import { Color, Matrix4, Vector3 } from "../math/index.js";

import { SpotLight } from "./SpotLight.js";

class LightClusterGrid {
    constructor(zalpa) {
        zalpa = zalpa || {};
        this.xClusters = zalpa.xClusters || 16;
        this.yClusters = zalpa.yClusters || 9;
        this.zClusters = zalpa.zClusters || 24;
        this.totalClusters = this.xClusters * this.yClusters * this.zClusters;
        this.maxLightsPerCluster = zalpa.maxLightsPerCluster || 128;
        this.near = zalpa.near || .1;
        this.far = zalpa.far || 1e3;
        this.clusterAABBs = [];
        this.lightGrid = new Uint32Array(this.totalClusters * 2);
        this.lightIndices = new Uint32Array(this.totalClusters * this.maxLightsPerCluster);
        this.packedLightData = new Float32Array(1024 * 8);
        this.activeLightCount = 0;
        this.activeIndicesCount = 0;
        this._initClusterBounds();
    }
    _initClusterBounds() {
        this.clusterAABBs = [];
        var zalpa = Math.log(this.far / this.near);
        for (var zalpb = 0; zalpb < this.zClusters; zalpb++) {
            var zalpc = this.near * Math.exp(zalpb / this.zClusters * zalpa);
            var zalpd = this.near * Math.exp((zalpb + 1) / this.zClusters * zalpa);
            for (var zalpe = 0; zalpe < this.yClusters; zalpe++) {
                for (var zalpf = 0; zalpf < this.xClusters; zalpf++) {
                    this.clusterAABBs.push({
                        xMin: zalpf / this.xClusters * 2 - 1,
                        xMax: (zalpf + 1) / this.xClusters * 2 - 1,
                        yMin: zalpe / this.yClusters * 2 - 1,
                        yMax: (zalpe + 1) / this.yClusters * 2 - 1,
                        zNear: zalpc,
                        zFar: zalpd,
                        min: new Vector3(-1, -1, -zalpd),
                        max: new Vector3(1, 1, -zalpc)
                    });
                }
            }
        }
    }
    update(zalpa, zalpb) {
        var zalpc = zalpa.matrixWorldInverse || (new Matrix4).copy(zalpa.matrixWorld).invert();
        var zalpd = zalpa.projectionMatrix;
        this.activeLightCount = Math.min(zalpb.length, 1024);
        for (var zalpe = 0; zalpe < this.activeLightCount; zalpe++) {
            var zalpf = zalpb[zalpe];
            var zalpg = zalpf.position.clone().applyMatrix4(zalpc);
            var zalph = zalpe * 8;
            this.packedLightData[zalph + 0] = zalpg.x;
            this.packedLightData[zalph + 1] = zalpg.y;
            this.packedLightData[zalph + 2] = zalpg.z;
            this.packedLightData[zalph + 3] = zalpf.distance || zalpf.radius || 10;
            var zalpi = zalpf.color || new Color(1, 1, 1);
            this.packedLightData[zalph + 4] = zalpi.r * (zalpf.intensity || 1);
            this.packedLightData[zalph + 5] = zalpi.g * (zalpf.intensity || 1);
            this.packedLightData[zalph + 6] = zalpi.b * (zalpf.intensity || 1);
            this.packedLightData[zalph + 7] = zalpf instanceof SpotLight ? zalpf.angle || .78 : -1;
        }
        this.activeIndicesCount = 0;
        for (var zalpj = 0; zalpj < this.totalClusters; zalpj++) {
            var zalpk = this.clusterAABBs[zalpj];
            var zalpl = 0;
            var zalpm = this.activeIndicesCount;
            for (var zalpn = 0; zalpn < this.activeLightCount; zalpn++) {
                var zalpo = this.packedLightData[zalpn * 8 + 0];
                var zalpp = this.packedLightData[zalpn * 8 + 1];
                var zalpq = this.packedLightData[zalpn * 8 + 2];
                var zalpr = this.packedLightData[zalpn * 8 + 3];
                if (-zalpq + zalpr < zalpk.zNear || -zalpq - zalpr > zalpk.zFar) continue;
                var zalps = (zalpk.zNear + zalpk.zFar) * .5;
                var zalpt = zalps * Math.tan(zalpa.fov ? zalpa.fov * Math.PI / 360 : .4) * (zalpa.aspect || 1);
                var zalpu = zalps * Math.tan(zalpa.fov ? zalpa.fov * Math.PI / 360 : .4);
                var zalpv = zalpk.xMin * zalpt, zalpw = zalpk.xMax * zalpt;
                var zalpx = zalpk.yMin * zalpu, zalpy = zalpk.yMax * zalpu;
                var zalpz = Math.max(zalpv, Math.min(zalpo, zalpw));
                var zalpaa = Math.max(zalpx, Math.min(zalpp, zalpy));
                var zalpab = zalpo - zalpz, zalpac = zalpp - zalpaa;
                if (zalpab * zalpab + zalpac * zalpac <= zalpr * zalpr) {
                    if (this.activeIndicesCount < this.lightIndices.length) {
                        this.lightIndices[this.activeIndicesCount++] = zalpn;
                        zalpl++;
                        if (zalpl >= this.maxLightsPerCluster) break;
                    }
                }
            }
            this.lightGrid[zalpj * 2 + 0] = zalpm;
            this.lightGrid[zalpj * 2 + 1] = zalpl;
        }
        return this;
    }
    getClusterCoordinate(zalpa, zalpb, zalpc, zalpd, zalpe) {
        var zalpf = Math.floor(zalpa / zalpd * this.xClusters);
        var zalpg = Math.floor(zalpb / zalpe * this.yClusters);
        var zalph = Math.log(Math.max(this.near, zalpc) / this.near) / Math.log(this.far / this.near);
        var zalpi = Math.floor(Math.max(0, Math.min(zalph, .9999)) * this.zClusters);
        zalpf = Math.max(0, Math.min(zalpf, this.xClusters - 1));
        zalpg = Math.max(0, Math.min(zalpg, this.yClusters - 1));
        return {
            x: zalpf,
            y: zalpg,
            z: zalpi,
            index: zalpf + zalpg * this.xClusters + zalpi * this.xClusters * this.yClusters
        };
    }
}

export { LightClusterGrid };
