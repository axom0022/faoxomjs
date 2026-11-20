import { h, defineComponent } from "vue";

var zaada = [ "src", "background", "cameraFov", "cameraPosition", "cameraTarget", "orbit", "ambient", "sun", "post", "backend", "width", "height" ];

function zaadb(zaada) {
    return zaada.replace(/([A-Z])/g, function(zaada) {
        return "-" + zaada.toLowerCase();
    });
}

export var FaoxomScene = defineComponent({
    name: "FaoxomScene",
    props: {
        src: String,
        background: String,
        cameraFov: [ String, Number ],
        cameraPosition: String,
        cameraTarget: String,
        orbit: [ Boolean, String ],
        ambient: String,
        sun: String,
        post: String,
        backend: String,
        width: [ String, Number ],
        height: [ String, Number ]
    },
    emits: [ "ready", "load", "error" ],
    setup: function(zaadc, zaadd) {
        return function() {
            var zaade = {};
            for (var zaadf = 0; zaadf < zaada.length; zaadf++) {
                var zaadg = zaada[zaadf];
                if (zaadc[zaadg] !== undefined && zaadc[zaadg] !== null && zaadc[zaadg] !== false) {
                    zaade[zaadb(zaadg)] = zaadc[zaadg] === true ? "" : String(zaadc[zaadg]);
                }
            }
            zaade.onReady = function(zaada) {
                zaadd.emit("ready", zaada);
            };
            zaade.onLoad = function(zaada) {
                zaadd.emit("load", zaada);
            };
            zaade.onError = function(zaada) {
                zaadd.emit("error", zaada);
            };
            if (zaadd.attrs.class) zaade.class = zaadd.attrs.class;
            if (zaadd.attrs.style) zaade.style = zaadd.attrs.style;
            return h("faoxom-scene", zaade);
        };
    }
});

export default FaoxomScene;
