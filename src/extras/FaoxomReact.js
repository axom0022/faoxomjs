import { FaoxomJs } from "../core/facade.js";
import { BoxGeometry } from "../geometries/index.js";
import { AmbientLight, DirectionalLight, PointLight } from "../lights/index.js";
import { StandardMaterial } from "../materials/index.js";
import { Group, Mesh } from "../objects/index.js";

class FaoxomReact {
    static createElement(type, props) {
        var children = [];
        for (var i = 2; i < arguments.length; i++) {
            var child = arguments[i];
            if (Array.isArray(child)) children.push.apply(children, child);
            else if (child !== null && child !== undefined) children.push(child);
        }
        return { type: type, props: props || {}, children: children };
    }
    static createFaoxomRoot(domElement) {
        var app = new FaoxomJs({ renderer: { canvas: domElement } }).init();
        var currentTree = null;
        return {
            render: function(element) {
                currentTree = element;
                var scene = app.activeScene || app.createScene("main");
                scene.clear();
                var mount = function(node, parent) {
                    if (!node) return;
                    if (typeof node.type === "function") {
                        var componentResult = node.type(Object.assign({}, node.props, { children: node.children }));
                        mount(componentResult, parent);
                        return;
                    }
                    var obj = null;
                    if (node.type === "Mesh" || node.type === "mesh") {
                        var geom = node.props.geometry || new BoxGeometry(1, 1, 1);
                        var mat = node.props.material || new StandardMaterial({ color: node.props.color || 0x4f9be8 });
                        obj = new Mesh(geom, mat);
                    } else if (node.type === "PointLight" || node.type === "pointLight") {
                        obj = new PointLight(node.props.color || 0xffffff, node.props.intensity || 1);
                    } else if (node.type === "DirectionalLight" || node.type === "directionalLight") {
                        obj = new DirectionalLight(node.props.color || 0xffffff, node.props.intensity || 1);
                    } else if (node.type === "AmbientLight" || node.type === "ambientLight") {
                        obj = new AmbientLight(node.props.color || 0xffffff, node.props.intensity || 0.5);
                    } else if (node.type === "Group" || node.type === "group") {
                        obj = new Group();
                    }
                    if (obj) {
                        if (node.props.position) obj.position.set(node.props.position[0], node.props.position[1], node.props.position[2]);
                        if (node.props.rotation) obj.rotation.set(node.props.rotation[0], node.props.rotation[1], node.props.rotation[2]);
                        if (node.props.scale) obj.scale.set(node.props.scale[0], node.props.scale[1], node.props.scale[2]);
                        parent.add(obj);
                        for (var c = 0; c < node.children.length; c++) mount(node.children[c], obj);
                    }
                };
                mount(element, scene);
                app.start();
            },
            unmount: function() { app.destroy(); }
        };
    }
}

export { FaoxomReact };
