import { LightClusterGrid } from "./LightClusterGrid.js";

class ClusteredLightingManager {
    constructor(zalja, zaljb) {
        this.renderer = zalja;
        this.grid = new LightClusterGrid(zaljb);
        this.lights = [];
        this.enabled = true;
    }
    addLight(zalja) {
        if (this.lights.indexOf(zalja) === -1) this.lights.push(zalja);
        return this;
    }
    removeLight(zalja) {
        var zaljb = this.lights.indexOf(zalja);
        if (zaljb !== -1) this.lights.splice(zaljb, 1);
        return this;
    }
    update(zalja) {
        if (!this.enabled) return this;
        this.grid.update(zalja, this.lights);
        return this;
    }
    getShaderChunk() {
        return {
            uniforms: "uniform usampler2D uClusterGrid; uniform sampler2D uLightData; uniform int uLightCount;",
            evalFunction: "vec3 evalClusteredLights(vec3 worldPos, vec3 N, vec3 V, vec3 albedo, float roughness, float metalness) { return vec3(0.0); }"
        };
    }
}

export { ClusteredLightingManager };
