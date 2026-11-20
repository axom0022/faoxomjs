import { FaoxomJs } from "../core/facade.js";

import { BoxGeometry } from "../geometries/index.js";

import { AmbientLight, DirectionalLight, PointLight } from "../lights/index.js";

import { StandardMaterial } from "../materials/index.js";

import { Group, Mesh } from "../objects/index.js";

class FaoxomReact {
    static createElement(zahga, zahgb) {
        var zahgc = [];
        for (var zahgd = 2; zahgd < arguments.length; zahgd++) {
            var zahge = arguments[zahgd];
            if (Array.isArray(zahge)) zahgc.push.apply(zahgc, zahge); else if (zahge !== null && zahge !== undefined) zahgc.push(zahge);
        }
        return {
            type: zahga,
            props: zahgb || {},
            children: zahgc
        };
    }
    static createFaoxomRoot(zahga) {
        var zahgb = new FaoxomJs({
            renderer: {
                canvas: zahga
            }
        }).init();
        var zahgc = null;
        return {
            render: function(zahga) {
                zahgc = zahga;
                var zahgd = zahgb.activeScene || zahgb.createScene("main");
                zahgd.clear();
                var zahge = function(zahga, zahgb) {
                    if (!zahga) return;
                    if (typeof zahga.type === "function") {
                        var zahgc = zahga.type(Object.assign({}, zahga.props, {
                            children: zahga.children
                        }));
                        zahge(zahgc, zahgb);
                        return;
                    }
                    var zahgd = null;
                    if (zahga.type === "Mesh" || zahga.type === "mesh") {
                        var zahgf = zahga.props.geometry || new BoxGeometry(1, 1, 1);
                        var zahgg = zahga.props.material || new StandardMaterial({
                            color: zahga.props.color || 5217256
                        });
                        zahgd = new Mesh(zahgf, zahgg);
                    } else if (zahga.type === "PointLight" || zahga.type === "pointLight") {
                        zahgd = new PointLight(zahga.props.color || 16777215, zahga.props.intensity || 1);
                    } else if (zahga.type === "DirectionalLight" || zahga.type === "directionalLight") {
                        zahgd = new DirectionalLight(zahga.props.color || 16777215, zahga.props.intensity || 1);
                    } else if (zahga.type === "AmbientLight" || zahga.type === "ambientLight") {
                        zahgd = new AmbientLight(zahga.props.color || 16777215, zahga.props.intensity || .5);
                    } else if (zahga.type === "Group" || zahga.type === "group") {
                        zahgd = new Group;
                    }
                    if (zahgd) {
                        if (zahga.props.position) zahgd.position.set(zahga.props.position[0], zahga.props.position[1], zahga.props.position[2]);
                        if (zahga.props.rotation) zahgd.rotation.set(zahga.props.rotation[0], zahga.props.rotation[1], zahga.props.rotation[2]);
                        if (zahga.props.scale) zahgd.scale.set(zahga.props.scale[0], zahga.props.scale[1], zahga.props.scale[2]);
                        zahgb.add(zahgd);
                        for (var zahgh = 0; zahgh < zahga.children.length; zahgh++) zahge(zahga.children[zahgh], zahgd);
                    }
                };
                zahge(zahga, zahgd);
                zahgb.start();
            },
            unmount: function() {
                zahgb.destroy();
            }
        };
    }
}

export { FaoxomReact };
