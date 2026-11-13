import { BackSide } from "../core/index.js";
import { SphereGeometry } from "../geometries/index.js";
import { ShaderMaterial } from "../materials/index.js";
import { Vector3, faoxomvalue } from "../math/index.js";
import { Mesh } from "../objects/index.js";

class AtmosphericSky extends Mesh {
    constructor(options) {
        options = options || {};
        var geom = new SphereGeometry(faoxomvalue(options.radius, 450), 32, 16);
        var mat = new ShaderMaterial({
            vertexShader: "varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader: "uniform vec3 uSunPosition; uniform float uTurbidity; uniform float uRayleigh; varying vec3 vWorldPosition; void main() { vec3 dir = normalize(vWorldPosition); float sunDot = max(0.0, dot(dir, normalize(uSunPosition))); vec3 skyColor = mix(vec3(0.2, 0.5, 0.85), vec3(0.05, 0.15, 0.35), max(0.0, dir.y)); skyColor += vec3(1.0, 0.8, 0.5) * pow(sunDot, 32.0); gl_FragColor = vec4(skyColor, 1.0); }",
            uniforms: { uSunPosition: { value: new Vector3(0, 1, 0.5) }, uTurbidity: { value: 2.0 }, uRayleigh: { value: 1.0 } },
            side: BackSide,
            depthWrite: false
        });
        super(geom, mat);
        this.type = "AtmosphericSky";
    }
}

export { AtmosphericSky };
