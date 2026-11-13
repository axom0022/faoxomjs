// FaoxomJS Svelte binding (roadmap item 41).
// Framework-agnostic imperative mount helper - usable from Svelte actions,
// SvelteKit loaders, plain JS or any framework without an official binding:
//
//   import { mountFaoxomScene } from "faoxomjs/bindings/svelte";
//   // in a Svelte component:
//   // <div use:faoxom={{ src: "/scenes/office.faox", orbit: true }}></div>
//   const faoxom = (node, options) => {
//       const engine = mountFaoxomScene(node, options);
//       return { destroy: () => engine.destroy() };
//   };
//
// Also see FaoxomScene.svelte (same folder) for a ready-made component.

export function mountFaoxomScene(target, options) {
    options = options || {};
    if (!target || !target.appendChild) throw new Error("mountFaoxomScene requires a DOM node");
    var element = document.createElement("faoxom-scene");
    var keys = ["src", "background", "camera-fov", "camera-position", "camera-target", "ambient", "sun", "post", "backend"];
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (options[key] !== undefined && options[key] !== null) element.setAttribute(key, String(options[key]));
    }
    if (options.width) element.setAttribute("width", String(options.width));
    if (options.height) element.setAttribute("height", String(options.height));
    if (options.orbit) element.setAttribute("orbit", "");
    if (typeof options.onReady === "function") element.addEventListener("ready", options.onReady);
    if (typeof options.onLoad === "function") element.addEventListener("load", options.onLoad);
    if (typeof options.onError === "function") element.addEventListener("error", options.onError);
    if (options.className) element.className = options.className;
    if (options.style) element.style.cssText = options.style;
    target.appendChild(element);
    var handle = {
        element: element,
        getApp: function () { return element.getApp ? element.getApp() : null; },
        getScene: function () { return element.getScene ? element.getScene() : null; },
        getCamera: function () { return element.getCamera ? element.getCamera() : null; },
        getControls: function () { return element.getControls ? element.getControls() : null; },
        destroy: function () {
            if (element.parentNode) element.parentNode.removeChild(element);
        }
    };
    return handle;
}

export default mountFaoxomScene;
