import {
    DirectionalLight,
    Mesh,
    PhysicalMaterial,
    PhysicsWorld,
    PlaneGeometry,
    RigidBody,
    SphereGeometry,
    Vector3
} from "../src/index.js";

function mount(context) {
    const world = new PhysicsWorld({
        gravity: [ 0, -9.81, 0 ],
        iterations: 8
    });

    const ground = new Mesh(new PlaneGeometry(80, 80, 1, 1), new PhysicalMaterial({
        color: 3158064,
        roughness: .95
    }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -4, 0);
    context.scene.add(ground);
    world.addBody(new RigidBody({
        object: ground,
        isStatic: true,
        mass: 0,
        position: new Vector3(0, -4, 0)
    }));

    const material = new PhysicalMaterial({
        color: 4601151,
        roughness: .25,
        metalness: .65
    });
    const geometry = new SphereGeometry(1, 24, 18);
    const bodies = [];
    const meshes = [];
    for (let index = 0; index < 40; index++) {
        const mesh = new Mesh(geometry, material);
        const x = (index % 8) - 3.5;
        const z = Math.floor(index / 8) - 2;
        mesh.position.set(x * 2.2, 4 + index * 1.6, z * 2.2);
        context.scene.add(mesh);
        meshes.push(mesh);
        const body = new RigidBody({
            object: mesh,
            mass: 1,
            restitution: .35,
            friction: .35,
            position: new Vector3(mesh.position.x, mesh.position.y, mesh.position.z)
        });
        world.addBody(body);
        bodies.push(body);
    }

    const sun = new DirectionalLight(16777215, 2.6);
    sun.position.set(12, 24, 10);
    context.scene.add(sun);

    context.camera.position.set(16, 12, 26);
    context.camera.lookAt(0, 2, 0);

    return {
        scene: context.scene,
        update(delta) {
            world.step(Math.min(delta, 1 / 30));
            for (let index = 0; index < bodies.length; index++) bodies[index].syncObject();
            for (let index = 0; index < meshes.length; index++) {
                if (meshes[index].position.y < -20) {
                    bodies[index].position.set((index % 8) - 3.5, 18, (index % 4) - 2);
                    bodies[index].velocity.set(0, 0, 0);
                    bodies[index].angularVelocity.set(0, 0, 0);
                    bodies[index].wake();
                }
            }
        },
        resize() {},
        dispose() {
            context.clear();
        }
    };
}

export default {
    label: "Physics",
    description: "40 rigid body spheres against a static ground plane",
    mount: mount
};
