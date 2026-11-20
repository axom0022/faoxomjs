import { Ray, Vector3 } from "../math/index.js";

import { RenderLayers } from "./RenderLayers.js";

class Raycaster {
    constructor(zadea, zadeb, zadec, zaded) {
        this.ray = new Ray(zadea, zadeb);
        this.near = zadec || 0;
        this.far = zaded === undefined ? Infinity : zaded;
        this.camera = null;
        this.renderLayers = new RenderLayers;
        this.layers = this.renderLayers;
    }
    set(zadea, zadeb) {
        this.ray.set(zadea, zadeb);
        return this;
    }
    setFromCamera(zadea, zadeb) {
        this.camera = zadeb;
        if (zadeb.isPerspectiveCamera) {
            this.ray.origin.copy(zadeb.getWorldPosition(new Vector3));
            this.ray.direction.set(zadea.x, zadea.y, -1).unproject(zadeb).sub(this.ray.origin).normalize();
        } else {
            this.ray.origin.set(zadea.x, zadea.y, 0).unproject(zadeb);
            this.ray.direction.set(0, 0, -1).transformDirection(zadeb.matrixWorld);
        }
        return this;
    }
    intersectObject(zadea, zadeb, zadec) {
        var zaded = zadec || [];
        if (!zadea || !zadea.visible) return zaded;
        if (zadea.raycast) {
            var zadee = zadea.raycast(this, zaded);
            if (Array.isArray(zadee)) zaded.push.apply(zaded, zadee);
        }
        if (zadeb) for (var zadef = 0; zadef < zadea.children.length; zadef++) this.intersectObject(zadea.children[zadef], true, zaded);
        return zaded.sort(function(zadea, zadeb) {
            return zadea.distance - zadeb.distance;
        });
    }
    intersectObjects(zadea, zadeb, zadec) {
        var zaded = zadec || [];
        for (var zadee = 0; zadee < zadea.length; zadee++) this.intersectObject(zadea[zadee], zadeb, zaded);
        return zaded.sort(function(zadea, zadeb) {
            return zadea.distance - zadeb.distance;
        });
    }
}

export { Raycaster };
