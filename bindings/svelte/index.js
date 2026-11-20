export function mountFaoxomScene(zaaca, zaacb) {
    zaacb = zaacb || {};
    if (!zaaca || !zaaca.appendChild) throw new Error("mountFaoxomScene requires a DOM node");
    var zaacc = document.createElement("faoxom-scene");
    var zaacd = [ "src", "background", "camera-fov", "camera-position", "camera-target", "ambient", "sun", "post", "backend" ];
    for (var zaace = 0; zaace < zaacd.length; zaace++) {
        var zaacf = zaacd[zaace];
        if (zaacb[zaacf] !== undefined && zaacb[zaacf] !== null) zaacc.setAttribute(zaacf, String(zaacb[zaacf]));
    }
    if (zaacb.width) zaacc.setAttribute("width", String(zaacb.width));
    if (zaacb.height) zaacc.setAttribute("height", String(zaacb.height));
    if (zaacb.orbit) zaacc.setAttribute("orbit", "");
    if (typeof zaacb.onReady === "function") zaacc.addEventListener("ready", zaacb.onReady);
    if (typeof zaacb.onLoad === "function") zaacc.addEventListener("load", zaacb.onLoad);
    if (typeof zaacb.onError === "function") zaacc.addEventListener("error", zaacb.onError);
    if (zaacb.className) zaacc.className = zaacb.className;
    if (zaacb.style) zaacc.style.cssText = zaacb.style;
    zaaca.appendChild(zaacc);
    var zaacg = {
        element: zaacc,
        getApp: function() {
            return zaacc.getApp ? zaacc.getApp() : null;
        },
        getScene: function() {
            return zaacc.getScene ? zaacc.getScene() : null;
        },
        getCamera: function() {
            return zaacc.getCamera ? zaacc.getCamera() : null;
        },
        getControls: function() {
            return zaacc.getControls ? zaacc.getControls() : null;
        },
        destroy: function() {
            if (zaacc.parentNode) zaacc.parentNode.removeChild(zaacc);
        }
    };
    return zaacg;
}

export default mountFaoxomScene;
