import { DirectionalLight, PhysicalMaterial, Terrain } from "../src/index.js";

function noise(x, z) {
    const a = Math.sin(x * .11) * Math.cos(z * .13);
    const b = Math.sin(x * .041 + 1.7) * Math.cos(z * .037 - 2.1) * 2.4;
    const c = Math.sin((x + z) * .017) * 3.6;
    return a + b + c;
}

function build() {
    const segments = 96;
    const size = 220;
    const heights = new Float32Array((segments + 1) * (segments + 1));
    for (let row = 0; row <= segments; row++) {
        for (let column = 0; column <= segments; column++) {
            const x = (column / segments - .5) * size;
            const z = (row / segments - .5) * size;
            heights[row * (segments + 1) + column] = noise(x, z) * .5;
        }
    }
    return new Terrain(size, size, segments, segments, {
        heightmap: heights,
        heightScale: 1,
        material: new PhysicalMaterial({
            color: 4475698,
            roughness: .92,
            metalness: .02
        })
    });
}

function mount(context) {
    const terrain = build();
    terrain.rotation.y = 0;
    context.scene.add(terrain);

    const sun = new DirectionalLight(16756479, 2.4);
    sun.position.set(60, 90, 40);
    context.scene.add(sun);

    const sky = new DirectionalLight(6711039, .6);
    sky.position.set(-40, 20, -60);
    context.scene.add(sky);

    context.camera.position.set(0, 70, 150);
    context.camera.lookAt(0, 0, 0);

    return {
        scene: context.scene,
        update() {
            terrain.rotation.y += .0006;
        },
        resize() {},
        dispose() {
            context.clear();
        }
    };
}

export default {
    label: "Terrain",
    description: "Procedural heightfield terrain, 96x96 segments, two directional lights",
    mount: mount
};
