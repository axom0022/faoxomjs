import { BoxGeometry, InstancedMesh, Matrix4, Mesh, PhysicalMaterial, PlaneGeometry, DirectionalLight } from "../src/index.js";

function mount(context) {
    const count = 12000;
    const geometry = new BoxGeometry(1.6, 1.6, 1.6);
    const material = new PhysicalMaterial({
        color: 5592405,
        roughness: .55,
        metalness: .25
    });
    const mesh = new InstancedMesh(geometry, material, count);
    const matrix = new Matrix4();
    const span = Math.ceil(Math.sqrt(count));
    for (let index = 0; index < count; index++) {
        const x = (index % span) - span / 2;
        const z = Math.floor(index / span) - span / 2;
        const height = 1 + (Math.sin(x * .12) + Math.cos(z * .09) + 2) * 3;
        matrix.identity();
        matrix.elements[0] = 1;
        matrix.elements[5] = height;
        matrix.elements[10] = 1;
        matrix.elements[12] = x * 2.4;
        matrix.elements[13] = height * .8;
        matrix.elements[14] = z * 2.4;
        mesh.setMatrixAt(index, matrix);
    }
    context.scene.add(mesh);

    const ground = new Mesh(new PlaneGeometry(400, 400, 2, 2), new PhysicalMaterial({
        color: 1973790,
        roughness: .9
    }));
    ground.position.set(0, -1, 0);
    context.scene.add(ground);

    const sun = new DirectionalLight(16777215, 2.2);
    sun.position.set(40, 60, 20);
    context.scene.add(sun);

    context.camera.position.set(0, 40, 150);
    context.camera.lookAt(0, 10, 0);

    let traveled = 0;
    return {
        scene: context.scene,
        update(delta) {
            traveled += delta;
            context.camera.position.x = Math.sin(traveled * .12) * 110;
            context.camera.position.z = Math.cos(traveled * .12) * 110;
            context.camera.lookAt(0, 10, 0);
        },
        resize() {},
        dispose() {
            context.clear();
        }
    };
}

export default {
    label: "Large world",
    description: "12000 instanced boxes in a single draw call with a flying camera",
    mount: mount
};
