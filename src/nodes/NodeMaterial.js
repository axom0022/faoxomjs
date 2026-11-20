import { Material } from "../materials/index.js";

import { compileNodeMaterial } from "./faoxomtslcodegen.js";

class NodeMaterial extends Material {
    constructor(zaqva) {
        super(zaqva);
        this.type = "NodeMaterial";
        zaqva = zaqva || {};
        this.colorNode = zaqva.colorNode || null;
        this.roughnessNode = zaqva.roughnessNode || null;
        this.metalnessNode = zaqva.metalnessNode || null;
        this.normalNode = zaqva.normalNode || null;
        this.emissiveNode = zaqva.emissiveNode || null;
        this.opacityNode = zaqva.opacityNode || null;
        this.positionNode = zaqva.positionNode || null;
        this.backend = zaqva.backend || "glsl";
    }
    compileShader(zaqva) {
        var zaqvb = typeof zaqva === "string" ? {
            backend: zaqva
        } : zaqva || {};
        var zaqvc = compileNodeMaterial(this, zaqvb.backend || this.backend, zaqvb);
        return zaqvc;
    }
    compileGlsl(zaqva) {
        return compileNodeMaterial(this, "glsl", zaqva);
    }
    compileWgsl(zaqva) {
        return compileNodeMaterial(this, "wgsl", zaqva);
    }
    backendShaders() {
        return {
            glsl: this.compileGlsl(),
            wgsl: this.compileWgsl()
        };
    }
}

export { NodeMaterial };
