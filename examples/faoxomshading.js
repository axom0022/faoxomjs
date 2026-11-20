import { DirectionalLight, Mesh, MeshStandardNodeMaterial, TorusKnotGeometry, tsl } from "../src/index.js";

function mount(context) {
    const material = new MeshStandardNodeMaterial({
        colorNode: tsl.mix(tsl.vec3(.05, .35, .95), tsl.vec3(1.0, .35, .08), tsl.fresnel(.15, 2.6, 1)),
        roughnessNode: tsl.clamp(tsl.noise2d(9), .08, 1),
        metalnessNode: tsl.float(.45),
        emissiveNode: tsl.mul(tsl.vec3(.02, .01, .04), tsl.noise2d(4))
    });

    const knot = new Mesh(new TorusKnotGeometry(6, 1.8, 220, 32), material);
    context.scene.add(knot);

    const sun = new DirectionalLight(16777215, 3);
    sun.position.set(30, 40, 20);
    context.scene.add(sun);

    const rim = new DirectionalLight(6684927, 1.4);
    rim.position.set(-30, 10, -20);
    context.scene.add(rim);

    context.camera.position.set(0, 8, 32);
    context.camera.lookAt(0, 0, 0);

    const shader = material.compileShader("wgsl");

    return {
        scene: context.scene,
        update(delta) {
            knot.rotation.y += delta * .45;
            knot.rotation.x += delta * .18;
        },
        resize() {},
        describe() {
            return "wgsl module bytes " + (shader && shader.code ? shader.code.length : 0);
        },
        dispose() {
            context.clear();
        }
    };
}

export default {
    label: "Shading",
    description: "TSL node material compiled to GLSL and WGSL from one graph",
    mount: mount
};
