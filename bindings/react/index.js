import React from "react";

var zaaba = [ "src", "background", "cameraFov", "cameraPosition", "cameraTarget", "orbit", "ambient", "sun", "post", "backend", "width", "height" ];

function zaabb(zaaba) {
    return zaaba.replace(/([A-Z])/g, function(zaaba) {
        return "-" + zaaba.toLowerCase();
    });
}

export function FaoxomScene(zaabc) {
    zaabc = zaabc || {};
    var zaabd = {};
    for (var zaabe = 0; zaabe < zaaba.length; zaabe++) {
        var zaabf = zaaba[zaabe];
        if (zaabc[zaabf] !== undefined && zaabc[zaabf] !== null) zaabd[zaabb(zaabf)] = String(zaabc[zaabf]);
    }
    if (zaabc.className) zaabd.class = zaabc.className;
    if (zaabc.style) zaabd.style = zaabc.style;
    var zaabg = function(zaaba) {
        return function() {
            var zaabb = zaabc[zaaba];
            if (typeof zaabb === "function") zaabb.apply(null, arguments);
        };
    };
    var zaabh = zaabc.elementRef || null;
    return React.createElement("faoxom-scene", Object.assign({}, zaabd, {
        ref: zaabh,
        onReady: zaabg("onReady"),
        onLoad: zaabg("onLoad"),
        onError: zaabg("onError")
    }));
}

export default FaoxomScene;
