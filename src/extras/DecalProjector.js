import { Object3D } from "../core/index.js";

import { Raycaster } from "../core/Raycaster.js";

import { Geometry } from "../geometries/index.js";

import { Vector3 } from "../math/index.js";

import { Mesh } from "../objects/index.js";

import { ShaderMaterial } from "../materials/index.js";

class DecalProjector extends Object3D {
    constructor(zagza) {
        zagza = zagza || {};
        super();
        this.type = "DecalProjector";
        this.width = zagza.width || 1;
        this.height = zagza.height || 1;
        this.depth = zagza.depth || 4;
        this.resolution = Math.max(4, Math.floor(zagza.resolution || 16));
        this.angleFade = zagza.angleFade === undefined ? .35 : zagza.angleFade;
        this.material = zagza.material || null;
        this.texture = zagza.texture || null;
        this.opacity = zagza.opacity === undefined ? 1 : zagza.opacity;
        this.decal = null;
        this.isDecalProjector = true;
    }
    setSize(zagza, zagzb, zagzc) {
        this.width = zagza;
        this.height = zagzb;
        if (zagzc !== undefined) this.depth = zagzc;
        return this;
    }
    _defaultMaterial() {
        var zagza = this;
        return new ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: "double",
            uniforms: {
                map: {
                    value: this.texture
                },
                uOpacity: {
                    value: this.opacity
                }
            },
            vertexShader: "varying vec2 vUvDecal; varying float vFade;" + "void main(){ vUvDecal = uv; vFade = color.r; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }",
            fragmentShader: "precision highp float; uniform sampler2D map; uniform float uOpacity; varying vec2 vUvDecal; varying float vFade;" + "void main(){ vec4 texel = texture2D(map, vUvDecal); gl_FragColor = vec4(texel.rgb, texel.a * vFade * uOpacity); if (gl_FragColor.a < 0.02) discard; }"
        });
    }
    _faceNormal(zagza, zagzb, zagzc) {
        var zagzd = zagza.geometry;
        var zagze = zagzd.attributes.position;
        if (!zagze) return null;
        var zagzf = zagzd.index;
        var zagzg = zagze.itemSize || 3;
        var zagzh = zagzf ? zagzf[zagzb * 3] : zagzb * 3;
        var zagzi = zagzf ? zagzf[zagzb * 3 + 1] : zagzb * 3 + 1;
        var zagzj = zagzf ? zagzf[zagzb * 3 + 2] : zagzb * 3 + 2;
        var zagzk = new Vector3(zagze.array[zagzh * zagzg], zagze.array[zagzh * zagzg + 1], zagze.array[zagzh * zagzg + 2]);
        var zagzl = new Vector3(zagze.array[zagzi * zagzg], zagze.array[zagzi * zagzg + 1], zagze.array[zagzi * zagzg + 2]);
        var zagzm = new Vector3(zagze.array[zagzj * zagzg], zagze.array[zagzj * zagzg + 1], zagze.array[zagzj * zagzg + 2]);
        var zagzn = zagzc || new Vector3;
        zagzn.subVectors(zagzm, zagzl).cross((new Vector3).subVectors(zagzk, zagzl)).normalize();
        var zagzo = zagza.matrixWorld ? zagza.matrixWorld.elements : null;
        if (zagzo) {
            zagzn.set(zagzo[0] * zagzn.x + zagzo[4] * zagzn.y + zagzo[8] * zagzn.z, zagzo[1] * zagzn.x + zagzo[5] * zagzn.y + zagzo[9] * zagzn.z, zagzo[2] * zagzn.x + zagzo[6] * zagzn.y + zagzo[10] * zagzn.z).normalize();
        }
        return zagzn;
    }
    project(zagza, zagzb) {
        zagzb = zagzb || {};
        var zagzc = Array.isArray(zagza) ? zagza : [ zagza ];
        this.updateMatrixWorld(true);
        for (var zagzd = 0; zagzd < zagzc.length; zagzd++) {
            if (zagzc[zagzd] && zagzc[zagzd].updateMatrixWorld) zagzc[zagzd].updateMatrixWorld(true);
        }
        var zagze = this.matrixWorld.elements;
        var zagzf = new Vector3(-zagze[8], -zagze[9], -zagze[10]).normalize();
        var zagzg = new Vector3(zagze[0], zagze[1], zagze[2]).normalize();
        var zagzh = new Vector3(zagze[4], zagze[5], zagze[6]).normalize();
        var zagzi = (new Vector3).setFromMatrixPosition(this.matrixWorld);
        var zagzj = zagzb.resolution || this.resolution;
        var zagzk = new Raycaster(new Vector3, new Vector3(0, 0, -1), 0, this.depth);
        var zagzl = new Array(zagzj * zagzj);
        var zagzm = new Array(zagzj * zagzj);
        var zagzn = new Float32Array(zagzj * zagzj);
        var zagzo = (zagzj - 1) / 2;
        for (var zagzp = 0; zagzp < zagzj; zagzp++) {
            for (var zagzq = 0; zagzq < zagzj; zagzq++) {
                var zagzr = zagzp * zagzj + zagzq;
                var zagzs = (zagzq - zagzo) / zagzo * this.width * .5;
                var zagzt = (zagzp - zagzo) / zagzo * this.height * .5;
                var zagzu = zagzi.clone().addScaledVector(zagzg, zagzs).addScaledVector(zagzh, zagzt);
                zagzk.ray.origin.copy(zagzu);
                zagzk.ray.direction.copy(zagzf);
                var zagzv = zagzk.intersectObjects(zagzc, false);
                var zagzw = null;
                for (var zagzx = 0; zagzx < zagzv.length; zagzx++) {
                    if (zagzv[zagzx].distance <= this.depth) {
                        zagzw = zagzv[zagzx];
                        break;
                    }
                }
                if (zagzw && zagzw.faceIndex !== undefined && zagzw.object) {
                    var zagzy = this._faceNormal(zagzw.object, zagzw.faceIndex);
                    var zagzz = zagzy ? zagzy.dot(zagzf) : 1;
                    if (zagzz < 0) zagzz = -zagzz;
                    var zagzaa = (zagzz - this.angleFade) / (1 - this.angleFade);
                    if (zagzaa <= 0) {
                        zagzl[zagzr] = null;
                        continue;
                    }
                    zagzn[zagzr] = Math.min(1, zagzaa);
                } else if (zagzw) {
                    zagzn[zagzr] = 1;
                } else {
                    zagzl[zagzr] = null;
                    continue;
                }
                var zagzab = zagzw.point.clone().addScaledVector(zagzw.object ? this._faceNormal(zagzw.object, zagzw.faceIndex) || zagzf : zagzf, .003);
                zagzl[zagzr] = this.worldToLocal(zagzab);
                zagzm[zagzr] = [ zagzq / (zagzj - 1), zagzp / (zagzj - 1) ];
            }
        }
        var zagzac = [], zagzad = [], zagzae = [], zagzaf = [];
        var zagzag = 0;
        var zagzah = {};
        for (var zagzai = 0; zagzai < zagzj; zagzai++) {
            for (var zagzaj = 0; zagzaj < zagzj; zagzaj++) {
                var zagzak = zagzai * zagzj + zagzaj;
                if (zagzl[zagzak]) {
                    zagzah[zagzak] = zagzag++;
                    zagzac.push(zagzl[zagzak].x, zagzl[zagzak].y, zagzl[zagzak].z);
                    zagzad.push(zagzm[zagzak][0], zagzm[zagzak][1]);
                    zagzae.push(zagzn[zagzak], zagzn[zagzak], zagzn[zagzak]);
                }
            }
        }
        for (var zagzal = 0; zagzal < zagzj - 1; zagzal++) {
            for (var zagzam = 0; zagzam < zagzj - 1; zagzam++) {
                var zagzan = zagzal * zagzj + zagzam;
                var zagzao = zagzal * zagzj + zagzam + 1;
                var zagzap = (zagzal + 1) * zagzj + zagzam + 1;
                var zagzaq = (zagzal + 1) * zagzj + zagzam;
                if (zagzl[zagzan] && zagzl[zagzao] && zagzl[zagzap] && zagzl[zagzaq]) {
                    zagzaf.push(zagzah[zagzan], zagzah[zagzao], zagzah[zagzap], zagzah[zagzan], zagzah[zagzap], zagzah[zagzaq]);
                }
            }
        }
        if (this.decal) {
            this.remove(this.decal);
            this.decal = null;
        }
        if (!zagzaf.length) return this;
        var zagzar = new Geometry;
        zagzar.setAttribute("position", new Float32Array(zagzac), 3);
        zagzar.setAttribute("uv", new Float32Array(zagzad), 2);
        zagzar.setAttribute("color", new Float32Array(zagzae), 3);
        zagzar.setIndex(new Uint16Array(zagzaf));
        zagzar.computeBounds();
        var zagzas = this.material || this._defaultMaterial();
        this.decal = new Mesh(zagzar, zagzas);
        this.decal.renderOrder = 20;
        this.add(this.decal);
        return this;
    }
}

export { DecalProjector };
