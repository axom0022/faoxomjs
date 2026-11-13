// FaoxomJS React binding (roadmap item 41).
// Peer dependency: react (16.8+). No JSX, no build step required.
//
//   import { FaoxomScene } from "faoxomjs/bindings/react";
//   <FaoxomScene src="/scenes/office.faox" cameraPosition="0,2,6" orbit onLoad={...} />

import React from "react";

var ATTRIBUTE_PROPS = ["src", "background", "cameraFov", "cameraPosition", "cameraTarget", "orbit", "ambient", "sun", "post", "backend", "width", "height"];

function toAttributeName(propName) {
    return propName.replace(/([A-Z])/g, function (match) { return "-" + match.toLowerCase(); });
}

export function FaoxomScene(props) {
    props = props || {};
    var attributes = {};
    for (var i = 0; i < ATTRIBUTE_PROPS.length; i++) {
        var name = ATTRIBUTE_PROPS[i];
        if (props[name] !== undefined && props[name] !== null) attributes[toAttributeName(name)] = String(props[name]);
    }
    if (props.className) attributes.class = props.className;
    if (props.style) attributes.style = props.style;

    var handleEvent = function (domEvent) {
        return function () {
            var handler = props[domEvent];
            if (typeof handler === "function") handler.apply(null, arguments);
        };
    };
    var ref = props.elementRef || null;

    return React.createElement(
        "faoxom-scene",
        Object.assign({}, attributes, {
            ref: ref,
            onReady: handleEvent("onReady"),
            onLoad: handleEvent("onLoad"),
            onError: handleEvent("onError")
        })
    );
}

export default FaoxomScene;
