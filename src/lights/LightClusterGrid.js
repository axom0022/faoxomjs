import { Color, Matrix4, Vector3 } from "../math/index.js";
import { SpotLight } from "./SpotLight.js";

class LightClusterGrid {
    constructor(options) {
        options = options || {};
        this.xClusters = options.xClusters || 16;
        this.yClusters = options.yClusters || 9;
        this.zClusters = options.zClusters || 24;
        this.totalClusters = this.xClusters * this.yClusters * this.zClusters;
        this.maxLightsPerCluster = options.maxLightsPerCluster || 128;
        this.near = options.near || 0.1;
        this.far = options.far || 1000;
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
        var logFarNear = Math.log(this.far / this.near);
        for (var z = 0; z < this.zClusters; z++) {
            var zNear = this.near * Math.exp(z / this.zClusters * logFarNear);
            var zFar = this.near * Math.exp((z + 1) / this.zClusters * logFarNear);
            for (var y = 0; y < this.yClusters; y++) {
                for (var x = 0; x < this.xClusters; x++) {
                    this.clusterAABBs.push({
                        xMin: (x / this.xClusters) * 2 - 1,
                        xMax: ((x + 1) / this.xClusters) * 2 - 1,
                        yMin: (y / this.yClusters) * 2 - 1,
                        yMax: ((y + 1) / this.yClusters) * 2 - 1,
                        zNear: zNear,
                        zFar: zFar,
                        min: new Vector3(-1, -1, -zFar),
                        max: new Vector3(1, 1, -zNear)
                    });
                }
            }
        }
    }
    update(camera, lights) {
        var viewMatrix = camera.matrixWorldInverse || new Matrix4().copy(camera.matrixWorld).invert();
        var proj = camera.projectionMatrix;
        this.activeLightCount = Math.min(lights.length, 1024);
        for (var i = 0; i < this.activeLightCount; i++) {
            var light = lights[i];
            var viewPos = light.position.clone().applyMatrix4(viewMatrix);
            var offset = i * 8;
            this.packedLightData[offset + 0] = viewPos.x;
            this.packedLightData[offset + 1] = viewPos.y;
            this.packedLightData[offset + 2] = viewPos.z;
            this.packedLightData[offset + 3] = light.distance || light.radius || 10.0;
            var col = light.color || new Color(1, 1, 1);
            this.packedLightData[offset + 4] = col.r * (light.intensity || 1.0);
            this.packedLightData[offset + 5] = col.g * (light.intensity || 1.0);
            this.packedLightData[offset + 6] = col.b * (light.intensity || 1.0);
            this.packedLightData[offset + 7] = light instanceof SpotLight ? (light.angle || 0.78) : -1.0;
        }
        this.activeIndicesCount = 0;
        for (var c = 0; c < this.totalClusters; c++) {
            var cluster = this.clusterAABBs[c];
            var count = 0;
            var startIndex = this.activeIndicesCount;
            for (var l = 0; l < this.activeLightCount; l++) {
                var lx = this.packedLightData[l * 8 + 0];
                var ly = this.packedLightData[l * 8 + 1];
                var lz = this.packedLightData[l * 8 + 2];
                var lr = this.packedLightData[l * 8 + 3];
                if (-lz + lr < cluster.zNear || -lz - lr > cluster.zFar) continue;
                var zMid = (cluster.zNear + cluster.zFar) * 0.5;
                var xBound = zMid * Math.tan(camera.fov ? (camera.fov * Math.PI / 360) : 0.4) * (camera.aspect || 1);
                var yBound = zMid * Math.tan(camera.fov ? (camera.fov * Math.PI / 360) : 0.4);
                var cxMin = cluster.xMin * xBound, cxMax = cluster.xMax * xBound;
                var cyMin = cluster.yMin * yBound, cyMax = cluster.yMax * yBound;
                var closestX = Math.max(cxMin, Math.min(lx, cxMax));
                var closestY = Math.max(cyMin, Math.min(ly, cyMax));
                var dx = lx - closestX, dy = ly - closestY;
                if (dx * dx + dy * dy <= lr * lr) {
                    if (this.activeIndicesCount < this.lightIndices.length) {
                        this.lightIndices[this.activeIndicesCount++] = l;
                        count++;
                        if (count >= this.maxLightsPerCluster) break;
                    }
                }
            }
            this.lightGrid[c * 2 + 0] = startIndex;
            this.lightGrid[c * 2 + 1] = count;
        }
        return this;
    }
    getClusterCoordinate(screenX, screenY, depth, width, height) {
        var cx = Math.floor((screenX / width) * this.xClusters);
        var cy = Math.floor((screenY / height) * this.yClusters);
        var zNorm = Math.log(Math.max(this.near, depth) / this.near) / Math.log(this.far / this.near);
        var cz = Math.floor(Math.max(0, Math.min(zNorm, 0.9999)) * this.zClusters);
        cx = Math.max(0, Math.min(cx, this.xClusters - 1));
        cy = Math.max(0, Math.min(cy, this.yClusters - 1));
        return { x: cx, y: cy, z: cz, index: cx + cy * this.xClusters + cz * this.xClusters * this.yClusters };
    }
}

export { LightClusterGrid };
