import { PerspectiveCamera, Scene, WebGLRenderer } from "../src/index.js";

import largeworld from "./faoxomlargeworld.js";

import ocean from "./faoxomocean.js";

import physics from "./faoxomphysics.js";

import shading from "./faoxomshading.js";

import terrain from "./faoxomterrain.js";

import xr from "./faoxomxr.js";

const demos = {
    terrain: terrain,
    ocean: ocean,
    physics: physics,
    shading: shading,
    largeworld: largeworld,
    xr: xr
};

const labels = {
    terrain: "Terrain",
    ocean: "Ocean",
    physics: "Physics",
    shading: "Shading",
    largeworld: "Large world",
    xr: "XR"
};

const root = document.getElementById("stage");
const list = document.getElementById("demos");
const status = document.getElementById("status");
const fps = document.getElementById("fps");

const renderer = new WebGLRenderer({
    antialias: true
});
renderer.setSize(root.clientWidth, root.clientHeight);
renderer.canvas.style.display = "block";
renderer.canvas.style.width = "100%";
renderer.canvas.style.height = "100%";
root.appendChild(renderer.canvas);

const camera = new PerspectiveCamera(55, root.clientWidth / root.clientHeight, .1, 4000);
camera.position.set(0, 8, 24);
resize();

let active = null;
let activeScene = null;
let activeName = null;
let lastFrame = 0;

function setStatus(text) {
    status.textContent = text;
}

function resize() {
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function clearScene(scene) {
    scene.children.slice().forEach((child) => scene.remove(child));
}

function mount(name) {
    if (active && active.dispose) active.dispose();
    activeName = name;
    const scene = new Scene();
    activeScene = scene;
    [ ...list.querySelectorAll("button") ].forEach((button) => {
        button.classList.toggle("active", button.dataset.demo === name);
    });
    camera.position.set(0, 8, 24);
    camera.lookAt(0, 0, 0);
    active = demos[name].mount({
        scene: scene,
        camera: camera,
        renderer: renderer,
        clear: () => clearScene(scene),
        status: setStatus
    }) || {};
    if (demos[name].controls && active.bindControls !== false) demos[name].controls(camera, renderer.canvas);
    setStatus(demos[name].description || labels[name]);
}

function frame(now) {
    const delta = lastFrame ? Math.min(.05, (now - lastFrame) / 1000) : .016;
    lastFrame = now;
    if (active && active.update) active.update(delta);
    if (activeScene) renderer.render(activeScene, camera);
    if (now - (frame.stamp || 0) > 500) {
        frame.stamp = now;
        fps.textContent = Math.round(1 / Math.max(delta, .0001)) + " fps";
    }
    requestAnimationFrame(frame);
}

Object.keys(demos).forEach((name) => {
    const button = document.createElement("button");
    button.dataset.demo = name;
    button.textContent = labels[name] || name;
    button.onclick = () => {
        try {
            mount(name);
        } catch (error) {
            setStatus(name + ": " + error.message);
        }
    };
    list.appendChild(button);
});

mount("terrain");
requestAnimationFrame(frame);
window.addEventListener("resize", () => {
    resize();
    if (active && active.resize) active.resize();
});
if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => {
    resize();
    if (active && active.resize) active.resize();
}).observe(root);
