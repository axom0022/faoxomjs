import { DirectionalLight, Mesh, PlaneGeometry, ShaderMaterial } from "../src/index.js";

const vertexShader = `uniform float uTime;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
varying vec3 vWorld;
varying vec2 vUv;
varying float vHeight;
void main() {
    vUv = uv;
    vec3 wave = position;
    float t = uTime;
    wave.y += sin(position.x * 0.12 + t * 1.4) * 0.9;
    wave.y += sin(position.z * 0.17 - t * 1.1) * 0.7;
    wave.y += sin((position.x + position.z) * 0.06 + t * 0.7) * 1.4;
    vHeight = wave.y;
    vec4 world = modelMatrix * vec4(wave, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
}`;

const fragmentShader = `precision highp float;
uniform float uTime;
varying vec3 vWorld;
varying vec2 vUv;
varying float vHeight;
void main() {
    float slope = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
    vec3 deep = vec3(0.02, 0.08, 0.19);
    vec3 shallow = vec3(0.05, 0.35, 0.45);
    vec3 color = mix(deep, shallow, slope);
    float foam = smoothstep(0.85, 1.0, sin(vUv.x * 420.0 + uTime) * 0.5 + 0.5) * 0.08;
    color += foam;
    gl_FragColor = vec4(color, 1.0);
}`;

function mount(context) {
    const geometry = new PlaneGeometry(400, 400, 160, 160);
    const material = new ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            uTime: {
                value: 0
            }
        }
    });
    const ocean = new Mesh(geometry, material);
    context.scene.add(ocean);

    const sun = new DirectionalLight(16772091, 2.1);
    sun.position.set(-40, 60, -80);
    context.scene.add(sun);

    context.camera.position.set(30, 18, 60);
    context.camera.lookAt(0, 4, 0);

    let elapsed = 0;
    return {
        scene: context.scene,
        update(delta) {
            elapsed += delta;
            if (material.uniforms && material.uniforms.uTime) material.uniforms.uTime.value = elapsed;
            ocean.rotation.y = Math.sin(elapsed * .05) * .06;
        },
        resize() {},
        dispose() {
            context.clear();
        }
    };
}

export default {
    label: "Ocean",
    description: "Gerstner style wave surface with animated ShaderMaterial",
    mount: mount
};
