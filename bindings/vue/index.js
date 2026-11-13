// FaoxomJS Vue 3 binding (roadmap item 41).
// Peer dependency: vue (3.x). Uses the render-function API so no SFC
// compilation is needed:
//
//   import { FaoxomScene } from "faoxomjs/bindings/vue";
//   template: '<FaoxomScene src="/scenes/office.faox" orbit camera-position="0,2,6" @load="onLoad" />'

import { h, defineComponent } from "vue";

var ATTRIBUTE_PROPS = ["src", "background", "cameraFov", "cameraPosition", "cameraTarget", "orbit", "ambient", "sun", "post", "backend", "width", "height"];

function toAttributeName(propName) {
    return propName.replace(/([A-Z])/g, function (match) { return "-" + match.toLowerCase(); });
}

export var FaoxomScene = defineComponent({
    name: "FaoxomScene",
    props: {
        src: String,
        background: String,
        cameraFov: [String, Number],
        cameraPosition: String,
        cameraTarget: String,
        orbit: [Boolean, String],
        ambient: String,
        sun: String,
        post: String,
        backend: String,
        width: [String, Number],
        height: [String, Number]
    },
    emits: ["ready", "load", "error"],
    setup: function (props, context) {
        return function () {
            var attributes = {};
            for (var i = 0; i < ATTRIBUTE_PROPS.length; i++) {
                var name = ATTRIBUTE_PROPS[i];
                if (props[name] !== undefined && props[name] !== null && props[name] !== false) {
                    attributes[toAttributeName(name)] = props[name] === true ? "" : String(props[name]);
                }
            }
            attributes.onReady = function (event) { context.emit("ready", event); };
            attributes.onLoad = function (event) { context.emit("load", event); };
            attributes.onError = function (event) { context.emit("error", event); };
            if (context.attrs.class) attributes.class = context.attrs.class;
            if (context.attrs.style) attributes.style = context.attrs.style;
            return h("faoxom-scene", attributes);
        };
    }
});

export default FaoxomScene;
