import { Mesh } from "../objects/index.js";

class SceneExporter {
    toJSON(object) { var serialize = function(node) { var data = { type: node.type, name: node.name, position: node.position.toArray(), quaternion: [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w], scale: node.scale.toArray(), visible: node.visible, children: [] }; if (node instanceof Mesh) { data.geometry = { attributes: {}, index: node.geometry.index ? Array.prototype.slice.call(node.geometry.index) : null }; for (var key in node.geometry.attributes) data.geometry.attributes[key] = { array: Array.prototype.slice.call(node.geometry.attributes[key].array), itemSize: node.geometry.attributes[key].itemSize }; data.material = { type: node.material.type, color: node.material.color.getHex(), opacity: node.material.opacity, transparent: node.material.transparent, metalness: node.material.metalness, roughness: node.material.roughness }; } for (var i = 0; i < node.children.length; i++) data.children.push(serialize(node.children[i])); return data; }; return serialize(object); }
    stringify(object) { return JSON.stringify(this.toJSON(object)); }
}

export { SceneExporter };
