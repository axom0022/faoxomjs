import { DirectionalLight, Mesh, PhysicalMaterial, SphereGeometry, WebXRManager } from "../src/index.js";

function mount(context) {
    const material = new PhysicalMaterial({
        color: 3381759,
        roughness: .35,
        metalness: .1
    });
    const geometry = new SphereGeometry(1.4, 32, 24);
    const markers = [];
    for (let index = 0; index < 12; index++) {
        const marker = new Mesh(geometry, material);
        const angle = index / 12 * Math.PI * 2;
        marker.position.set(Math.cos(angle) * 5, 1.6 + Math.sin(index) * .6, Math.sin(angle) * 5);
        context.scene.add(marker);
        markers.push(marker);
    }

    const sun = new DirectionalLight(16777215, 2.4);
    sun.position.set(4, 12, 6);
    context.scene.add(sun);

    const manager = new WebXRManager({
        renderer: context.renderer,
        activeScene: context.scene,
        camera: context.camera
    });

    let supported = false;
    manager.isSupported("immersive-vr").then((value) => {
        supported = value;
        context.status(supported ? "XR ready, press enter XR" : "XR not supported in this browser");
    }).catch(() => {
        context.status("XR not supported in this browser");
    });

    context.camera.position.set(0, 3.2, 14);
    context.camera.lookAt(0, 1.6, 0);

    return {
        scene: context.scene,
        supported() {
            return supported;
        },
        async enter(options) {
            return manager.request("immersive-vr", options || {});
        },
        update(delta) {
            for (let index = 0; index < markers.length; index++) {
                markers[index].position.y += Math.sin(delta * 2 + index) * .002;
            }
        },
        resize() {},
        dispose() {
            if (manager.session) manager.end();
            context.clear();
        }
    };
}

export default {
    label: "XR",
    description: "WebXRManager session wiring with a ring of markers",
    mount: mount
};
