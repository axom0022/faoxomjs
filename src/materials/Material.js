import { BackSide, DoubleSide, FrontSide, NormalBlending, faoxomidnext } from "../core/index.js";

import { Color, Vector2, faoxomvalue } from "../math/index.js";

class Material {
    constructor(zanqa) {
        zanqa = zanqa || {};
        this.id = faoxomidnext();
        this.refCount = 0;
        this.type = "Material";
        this.color = new Color(faoxomvalue(zanqa.color, 16777215));
        this.ambient = new Color(faoxomvalue(zanqa.ambient, 2236962));
        this.diffuse = new Color(faoxomvalue(zanqa.diffuse, this.color));
        this.specular = new Color(faoxomvalue(zanqa.specular, 1118481));
        this.emissive = new Color(faoxomvalue(zanqa.emissive, 0));
        this.shininess = faoxomvalue(zanqa.shininess, 30);
        this.opacity = faoxomvalue(zanqa.opacity, 1);
        this.alphaTest = faoxomvalue(zanqa.alphaTest, 0);
        this.transparent = !!zanqa.transparent || this.opacity < 1;
        this.side = zanqa.side === "back" || zanqa.side === BackSide ? BackSide : zanqa.side === "double" || zanqa.side === DoubleSide ? DoubleSide : FrontSide;
        this.depthTest = zanqa.depthTest !== false;
        this.depthWrite = zanqa.depthWrite !== false;
        this.blendMode = faoxomvalue(zanqa.blendMode, "normal");
        this.blending = zanqa.blending === undefined ? NormalBlending : zanqa.blending;
        this.blendEquation = zanqa.blendEquation || "add";
        this.wireframe = !!zanqa.wireframe;
        this.vertexColors = zanqa.vertexColors === true;
        this.renderOrder = faoxomvalue(zanqa.renderOrder, 0);
        this.diffuseMap = zanqa.diffuseMap || zanqa.map || null;
        this.normalMap = zanqa.normalMap || null;
        this.specularMap = zanqa.specularMap || null;
        this.emissiveMap = zanqa.emissiveMap || null;
        this.aoMap = zanqa.aoMap || null;
        this.alphaMap = zanqa.alphaMap || null;
        this.displacementMap = zanqa.displacementMap || zanqa.heightMap || null;
        this.displacementScale = faoxomvalue(zanqa.displacementScale, .1);
        this.displacementBias = faoxomvalue(zanqa.displacementBias, 0);
        this.roughnessMap = zanqa.roughnessMap || null;
        this.metalnessMap = zanqa.metalnessMap || zanqa.metallicMap || null;
        this.metallicMap = this.metalnessMap;
        this.envMap = zanqa.envMap || null;
        this.envMapIntensity = faoxomvalue(zanqa.envMapIntensity, 1);
        this.aoMapIntensity = faoxomvalue(zanqa.aoMapIntensity, 1);
        this.normalScale = zanqa.normalScale && zanqa.normalScale.clone ? zanqa.normalScale.clone() : new Vector2(1, 1);
        this.clippingPlanes = zanqa.clippingPlanes || null;
        this.needsUpdate = true;
    }
    clone() {
        return new this.constructor({
            color: this.color.clone(),
            ambient: this.ambient.clone(),
            diffuse: this.diffuse.clone(),
            specular: this.specular.clone(),
            emissive: this.emissive.clone(),
            shininess: this.shininess,
            opacity: this.opacity,
            alphaTest: this.alphaTest,
            transparent: this.transparent,
            side: this.side,
            depthTest: this.depthTest,
            depthWrite: this.depthWrite,
            blendMode: this.blendMode,
            blending: this.blending,
            blendEquation: this.blendEquation,
            wireframe: this.wireframe,
            renderOrder: this.renderOrder,
            clippingPlanes: this.clippingPlanes,
            diffuseMap: this.diffuseMap,
            normalMap: this.normalMap,
            displacementMap: this.displacementMap,
            displacementScale: this.displacementScale,
            displacementBias: this.displacementBias,
            normalScale: this.normalScale,
            roughnessMap: this.roughnessMap,
            metalnessMap: this.metalnessMap,
            aoMapIntensity: this.aoMapIntensity,
            envMapIntensity: this.envMapIntensity,
            specularMap: this.specularMap,
            emissiveMap: this.emissiveMap,
            aoMap: this.aoMap,
            alphaMap: this.alphaMap,
            envMap: this.envMap,
            metalness: this.metalness,
            roughness: this.roughness
        });
    }
    dispose() {
        this.diffuseMap = null;
        this.normalMap = null;
        this.displacementMap = null;
        this.parallaxMap = null;
        this.roughnessMap = null;
        this.metalnessMap = null;
        this.specularMap = null;
        this.emissiveMap = null;
        this.aoMap = null;
        this.alphaMap = null;
        this.envMap = null;
        this.needsUpdate = false;
    }
}

Object.defineProperty(Material.prototype, "map", {
    configurable: true,
    get: function() {
        return this.diffuseMap;
    },
    set: function(zanqa) {
        this.diffuseMap = zanqa || null;
        this.needsUpdate = true;
    }
});

Material.prototype.isMaterial = true;

export { Material };
