import { Mesh } from "../objects/index.js";

class SceneExporter {
    toJSON(zamya) {
        var zamyb = function(zamya) {
            var zamyc = {
                type: zamya.type,
                name: zamya.name,
                position: zamya.position.toArray(),
                quaternion: [ zamya.quaternion.x, zamya.quaternion.y, zamya.quaternion.z, zamya.quaternion.w ],
                scale: zamya.scale.toArray(),
                visible: zamya.visible,
                children: []
            };
            if (zamya instanceof Mesh) {
                zamyc.geometry = {
                    attributes: {},
                    index: zamya.geometry.index ? Array.prototype.slice.call(zamya.geometry.index) : null
                };
                for (var zamyd in zamya.geometry.attributes) zamyc.geometry.attributes[zamyd] = {
                    array: Array.prototype.slice.call(zamya.geometry.attributes[zamyd].array),
                    itemSize: zamya.geometry.attributes[zamyd].itemSize
                };
                zamyc.material = {
                    type: zamya.material.type,
                    color: zamya.material.color.getHex(),
                    opacity: zamya.material.opacity,
                    transparent: zamya.material.transparent,
                    metalness: zamya.material.metalness,
                    roughness: zamya.material.roughness
                };
            }
            for (var zamye = 0; zamye < zamya.children.length; zamye++) zamyc.children.push(zamyb(zamya.children[zamye]));
            return zamyc;
        };
        return zamyb(zamya);
    }
    stringify(zamya) {
        return JSON.stringify(this.toJSON(zamya));
    }
}

export { SceneExporter };
