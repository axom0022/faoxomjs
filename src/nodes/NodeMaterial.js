import { Material } from "../materials/index.js";

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
    }
    compileShader() {
        var zaqva = this.colorNode ? this.colorNode.build() : "vec3(1.0)";
        var zaqvb = this.roughnessNode ? this.roughnessNode.build() : "0.5";
        var zaqvc = this.metalnessNode ? this.metalnessNode.build() : "0.0";
        var zaqvd = this.emissiveNode ? this.emissiveNode.build() : "vec3(0.0)";
        var zaqve = this.opacityNode ? this.opacityNode.build() : "1.0";
        return {
            vertexShader: "varying vec3 vWorldPosition; varying vec3 vNormal; varying vec2 vUv; void main() { vUv = uv; vNormal = normalize(normalMatrix * normal); vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPos.xyz; gl_Position = projectionMatrix * viewMatrix * worldPos; }",
            fragmentShader: "varying vec3 vWorldPosition; varying vec3 vNormal; varying vec2 vUv; uniform vec3 uCameraPosition; uniform float uTime; void main() { vec3 baseColor = " + zaqva + "; float roughness = " + zaqvb + "; float metalness = " + zaqvc + "; vec3 emissive = " + zaqvd + "; float opacity = " + zaqve + "; vec3 N = normalize(vNormal); vec3 V = normalize(uCameraPosition - vWorldPosition); vec3 L = normalize(vec3(0.5, 1.0, 0.75)); float NdotL = max(0.0, dot(N, L)); vec3 diffuse = baseColor * (NdotL * 0.8 + 0.2); gl_FragColor = vec4(diffuse + emissive, opacity); }"
        };
    }
}

export { NodeMaterial };
