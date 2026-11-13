import { Material } from "../materials/index.js";

class NodeMaterial extends Material {
    constructor(options) {
        super(options);
        this.type = "NodeMaterial";
        options = options || {};
        this.colorNode = options.colorNode || null;
        this.roughnessNode = options.roughnessNode || null;
        this.metalnessNode = options.metalnessNode || null;
        this.normalNode = options.normalNode || null;
        this.emissiveNode = options.emissiveNode || null;
        this.opacityNode = options.opacityNode || null;
        this.positionNode = options.positionNode || null;
    }
    compileShader() {
        var colorExpr = this.colorNode ? this.colorNode.build() : "vec3(1.0)";
        var roughExpr = this.roughnessNode ? this.roughnessNode.build() : "0.5";
        var metalExpr = this.metalnessNode ? this.metalnessNode.build() : "0.0";
        var emissiveExpr = this.emissiveNode ? this.emissiveNode.build() : "vec3(0.0)";
        var opacityExpr = this.opacityNode ? this.opacityNode.build() : "1.0";
        return {
            vertexShader: "varying vec3 vWorldPosition; varying vec3 vNormal; varying vec2 vUv; void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPos.xyz; gl_Position = projectionMatrix * viewMatrix * worldPos; }",
            fragmentShader: "varying vec3 vWorldPosition; varying vec3 vNormal; varying vec2 vUv; uniform vec3 uCameraPosition; uniform float uTime; void main() { vec3 baseColor = " + colorExpr + "; float roughness = " + roughExpr + "; float metalness = " + metalExpr + "; vec3 emissive = " + emissiveExpr + "; float opacity = " + opacityExpr + "; vec3 N = normalize(vNormal); vec3 V = normalize(uCameraPosition - vWorldPosition); vec3 L = normalize(vec3(0.5, 1.0, 0.75)); float NdotL = max(0.0, dot(N, L)); vec3 diffuse = baseColor * (NdotL * 0.8 + 0.2); gl_FragColor = vec4(diffuse + emissive, opacity); }"
        };
    }
}

export { NodeMaterial };
