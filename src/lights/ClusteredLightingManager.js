import { LightClusterGrid } from "./LightClusterGrid.js";

class ClusteredLightingManager {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.grid = new LightClusterGrid(options);
        this.lights = [];
        this.enabled = true;
    }
    addLight(light) { if (this.lights.indexOf(light) === -1) this.lights.push(light); return this; }
    removeLight(light) { var idx = this.lights.indexOf(light); if (idx !== -1) this.lights.splice(idx, 1); return this; }
    update(camera) { if (!this.enabled) return this; this.grid.update(camera, this.lights); return this; }
    getShaderChunk() {
        return {
            uniforms: "uniform usampler2D uClusterGrid; uniform sampler2D uLightData; uniform int uLightCount;",
            evalFunction: "vec3 evalClusteredLights(vec3 worldPos, vec3 N, vec3 V, vec3 albedo, float roughness, float metalness) { return vec3(0.0); }"
        };
    }
}

export { ClusteredLightingManager };
