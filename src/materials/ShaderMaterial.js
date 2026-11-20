import { BackSide, DoubleSide, FrontSide } from "../core/index.js";

import { Material } from "./Material.js";

class ShaderMaterial extends Material {
    constructor(zanva) {
        zanva = zanva || {};
        super(zanva);
        this.type = "ShaderMaterial";
        this.vertexShader = zanva.vertexShader || "uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; attribute vec3 position; void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }";
        this.fragmentShader = zanva.fragmentShader || "precision highp float; void main(){ gl_FragColor=vec4(1.0); }";
        this.uniforms = zanva.uniforms || {};
        this.defines = zanva.defines || {};
        this.lights = !!zanva.lights;
        this.fog = !!zanva.fog;
        this.glslVersion = zanva.glslVersion || zanva.glsl || null;
        this.extensions = zanva.extensions || {};
        this.defaultAttributeValues = zanva.defaultAttributeValues || {};
        this.clipping = !!zanva.clipping;
        this.vertexColors = zanva.vertexColors === true || zanva.vertexColors === "true";
        this.transparent = !!zanva.transparent;
        this.side = zanva.side === "back" || zanva.side === BackSide ? BackSide : zanva.side === "double" || zanva.side === DoubleSide ? DoubleSide : FrontSide;
    }
    clone() {
        return new ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            uniforms: this.uniforms,
            defines: Object.assign({}, this.defines),
            lights: this.lights,
            fog: this.fog,
            glslVersion: this.glslVersion,
            extensions: Object.assign({}, this.extensions),
            defaultAttributeValues: Object.assign({}, this.defaultAttributeValues),
            clipping: this.clipping,
            vertexColors: this.vertexColors,
            opacity: this.opacity,
            transparent: this.transparent,
            depthTest: this.depthTest,
            depthWrite: this.depthWrite,
            blending: this.blending,
            side: this.side
        });
    }
}

export { ShaderMaterial };
