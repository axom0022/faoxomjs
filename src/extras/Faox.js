import { Float32BufferAtt } from "../core/index.js";

import { Color } from "../math/index.js";

import { Scene } from "../scenes/index.js";

import { Mesh } from "../objects/index.js";

import { Object3D } from "../core/index.js";

import { Geometry } from "../geometries/index.js";

import { BasicMaterial, LambertMaterial, StandardMaterial } from "../materials/index.js";

import { AmbientLight, DirectionalLight, PointLight } from "../lights/index.js";

import { Light } from "../lights/index.js";

import { DataTexture } from "../textures/index.js";

import { AnimationClip, AnimationTrack } from "../animation/index.js";

var zahfa = [ 70, 65, 79, 88 ];

var FAOX_VERSION = 1;

var zahfb = {
    BasicMaterial,
    LambertMaterial,
    StandardMaterial
};

var zahfc = [ "position", "normal", "tangent", "uv", "uv2", "color", "skinIndex", "skinWeight" ];

function zahfd(zahfa) {
    var zahfb = 2166136261;
    for (var zahfc = 0; zahfc < zahfa.length; zahfc++) {
        zahfb ^= zahfa[zahfc];
        zahfb = Math.imul(zahfb, 16777619);
    }
    return zahfb >>> 0;
}

function zahfe(zahfa) {
    return (zahfa.charCodeAt(0) << 24 | zahfa.charCodeAt(1) << 16 | zahfa.charCodeAt(2) << 8 | zahfa.charCodeAt(3)) >>> 0;
}

function zahff(zahfa) {
    return String.fromCharCode(zahfa >>> 24 & 255, zahfa >>> 16 & 255, zahfa >>> 8 & 255, zahfa & 255);
}

function zahfg(zahfa) {
    var zahfb = (zahfa >>> 0).toString(16);
    while (zahfb.length < 8) zahfb = "0" + zahfb;
    return zahfb;
}

class FaoxWriter {
    static hashBytes(zahfa) {
        return zahfd(zahfa);
    }
    static fileHash(zahfa) {
        return zahfg(zahfd(zahfa));
    }
    static write(zahfb, zahfc) {
        var zahff = [ {
            fourcc: zahfe("head"),
            nameId: 0,
            bytes: (new TextEncoder).encode(JSON.stringify(zahfb))
        } ];
        for (var zahfg = 0; zahfg < zahfc.length; zahfg++) {
            zahff.push({
                fourcc: zahfe(zahfc[zahfg].fourcc),
                nameId: zahfc[zahfg].nameId || zahfg + 1,
                bytes: zahfc[zahfg].bytes
            });
        }
        var zahfh = 16 + zahff.length * 20;
        for (var zahfi = 0; zahfi < zahff.length; zahfi++) zahfh += zahff[zahfi].bytes.length;
        var zahfj = new Uint8Array(zahfh);
        var zahfk = new DataView(zahfj.buffer);
        zahfj[0] = zahfa[0];
        zahfj[1] = zahfa[1];
        zahfj[2] = zahfa[2];
        zahfj[3] = zahfa[3];
        zahfk.setUint32(4, FAOX_VERSION, true);
        zahfk.setUint32(8, zahff.length, true);
        zahfk.setUint32(12, 0, true);
        var zahfl = 16 + zahff.length * 20;
        for (var zahfm = 0; zahfm < zahff.length; zahfm++) {
            var zahfn = 16 + zahfm * 20;
            zahfk.setUint32(zahfn, zahff[zahfm].fourcc, true);
            zahfk.setUint32(zahfn + 4, zahfl, true);
            zahfk.setUint32(zahfn + 8, zahff[zahfm].bytes.length, true);
            zahfk.setUint32(zahfn + 12, zahfd(zahff[zahfm].bytes), true);
            zahfk.setUint32(zahfn + 16, zahff[zahfm].nameId, true);
            zahfj.set(zahff[zahfm].bytes, zahfl);
            zahfl += zahff[zahfm].bytes.length;
        }
        return {
            bytes: zahfj,
            hash: FaoxWriter.fileHash(zahfj),
            chunkCount: zahff.length,
            byteLength: zahfj.length
        };
    }
    static read(zahfb) {
        var zahfc = zahfb instanceof Uint8Array ? zahfb : new Uint8Array(zahfb);
        if (zahfc.length < 16) throw new Error("Faox: file too short");
        if (zahfc[0] !== zahfa[0] || zahfc[1] !== zahfa[1] || zahfc[2] !== zahfa[2] || zahfc[3] !== zahfa[3]) throw new Error("Faox: bad magic");
        var zahfe = new DataView(zahfc.buffer, zahfc.byteOffset, zahfc.byteLength);
        var zahfg = zahfe.getUint32(4, true);
        if (zahfg !== FAOX_VERSION) throw new Error("Faox: unsupported version " + zahfg);
        var zahfh = zahfe.getUint32(8, true);
        var zahfi = [];
        for (var zahfj = 0; zahfj < zahfh; zahfj++) {
            var zahfk = 16 + zahfj * 20;
            var zahfl = zahfe.getUint32(zahfk, true);
            var zahfm = zahfe.getUint32(zahfk + 4, true);
            var zahfn = zahfe.getUint32(zahfk + 8, true);
            var zahfo = zahfe.getUint32(zahfk + 12, true);
            var zahfp = zahfe.getUint32(zahfk + 16, true);
            if (zahfm + zahfn > zahfc.length) throw new Error("Faox: chunk " + zahfj + " out of bounds");
            var zahfq = zahfc.slice(zahfm, zahfm + zahfn);
            if (zahfd(zahfq) !== zahfo) throw new Error("Faox: chunk " + zahfj + " hash mismatch");
            zahfi.push({
                fourcc: zahff(zahfl),
                offset: zahfm,
                length: zahfn,
                hash: zahfo,
                nameId: zahfp,
                bytes: zahfq
            });
        }
        if (!zahfi.length || zahfi[0].fourcc !== "head") throw new Error("Faox: missing head chunk");
        var zahfr = JSON.parse((new TextDecoder).decode(zahfi[0].bytes));
        if (!zahfr || zahfr.format !== "faox") throw new Error("Faox: head chunk is not a faox manifest");
        return {
            head: zahfr,
            chunks: zahfi,
            hash: FaoxWriter.fileHash(zahfc),
            byteLength: zahfc.length
        };
    }
}

class FaoxPacker {
    pack(zahfa, zahfe) {
        zahfe = zahfe || {};
        var zahff = [];
        var zahfh = {};
        function zahfi(zahfa, zahfb) {
            var zahfc = zahfa + ":" + zahfg(zahfd(zahfb));
            if (zahfh[zahfc] !== undefined) return zahfh[zahfc];
            var zahfe = zahff.length + 1;
            zahff.push({
                fourcc: zahfa,
                nameId: zahfe,
                bytes: zahfb
            });
            zahfh[zahfc] = zahfe;
            return zahfe;
        }
        function zahfj(zahfa) {
            var zahfb = zahfa instanceof Float32Array ? zahfa : new Float32Array(zahfa || []);
            var zahfc = new Uint8Array(zahfb.buffer, zahfb.byteOffset, zahfb.byteLength);
            return {
                chunk: zahfi("buf ", zahfc),
                array: "f32",
                count: zahfb.length
            };
        }
        function zahfk(zahfa) {
            if (!zahfa) return null;
            var zahfb = zahfa instanceof Uint32Array ? zahfa : new Uint16Array(zahfa);
            var zahfc = new Uint8Array(zahfb.buffer, zahfb.byteOffset, zahfb.byteLength);
            return {
                chunk: zahfi("buf ", zahfc),
                array: zahfb instanceof Uint32Array ? "u32" : "u16",
                count: zahfb.length
            };
        }
        var zahfl = [];
        var zahfm = new Map;
        function zahfn(zahfa) {
            if (zahfm.has(zahfa)) return zahfm.get(zahfa);
            var zahfb = {};
            var zahfd = Object.keys(zahfa.attributes);
            zahfd.sort(function(zahfa, zahfb) {
                return zahfc.indexOf(zahfa) - zahfc.indexOf(zahfb) || (zahfa < zahfb ? -1 : zahfa > zahfb ? 1 : 0);
            });
            for (var zahfe = 0; zahfe < zahfd.length; zahfe++) {
                var zahff = zahfa.attributes[zahfd[zahfe]];
                var zahfg = zahfj(zahff.array);
                zahfg.itemSize = zahff.itemSize;
                zahfb[zahfd[zahfe]] = zahfg;
            }
            var zahfh = {
                attributes: zahfb,
                index: zahfk(zahfa.index)
            };
            var zahfi = zahfl.length;
            zahfl.push(zahfh);
            zahfm.set(zahfa, zahfi);
            return zahfi;
        }
        var zahfo = [];
        var zahfp = new Map;
        function zahfq(zahfa) {
            if (!zahfa) return null;
            if (!zahfa.isDataTexture) throw new Error("Faox: only DataTexture maps are supported in v1");
            if (zahfa.type === "float") throw new Error("Faox: float DataTexture maps are not supported in v1");
            if (zahfp.has(zahfa)) return zahfp.get(zahfa);
            var zahfb = zahfa.data instanceof Uint8Array ? zahfa.data : new Uint8Array(zahfa.data);
            var zahfc = {
                chunk: zahfi("tex ", zahfb),
                mime: "rgba8",
                width: zahfa.width,
                height: zahfa.height,
                minFilter: zahfa.minFilter,
                magFilter: zahfa.magFilter
            };
            var zahfd = zahfo.length;
            zahfo.push(zahfc);
            zahfp.set(zahfa, zahfd);
            return zahfd;
        }
        var zahfr = [];
        var zahfs = new Map;
        function zahft(zahfa) {
            if (!zahfa) throw new Error("Faox: mesh without material");
            if (zahfs.has(zahfa)) return zahfs.get(zahfa);
            if (!zahfb[zahfa.type]) throw new Error("Faox: unsupported material type " + zahfa.type);
            var zahfc = {
                type: zahfa.type,
                color: zahfa.color ? zahfa.color.getHex() : 16777215,
                metalness: zahfa.metalness,
                roughness: zahfa.roughness,
                emissive: zahfa.emissive ? zahfa.emissive.getHex() : 0,
                opacity: zahfa.opacity,
                transparent: zahfa.transparent,
                vertexColors: zahfa.vertexColors,
                map: zahfq(zahfa.map)
            };
            var zahfd = zahfr.length;
            zahfr.push(zahfc);
            zahfs.set(zahfa, zahfd);
            return zahfd;
        }
        var zahfu = [];
        function zahfv(zahfa) {
            if (zahfa instanceof AmbientLight) return {
                type: "AmbientLight",
                color: zahfa.color.getHex(),
                intensity: zahfa.intensity
            };
            if (zahfa instanceof DirectionalLight) return {
                type: "DirectionalLight",
                color: zahfa.color.getHex(),
                intensity: zahfa.intensity,
                position: zahfa.position.toArray(),
                castShadow: zahfa.castShadow === true
            };
            if (zahfa instanceof PointLight) return {
                type: "PointLight",
                color: zahfa.color.getHex(),
                intensity: zahfa.intensity,
                position: zahfa.position.toArray(),
                castShadow: zahfa.castShadow === true
            };
            throw new Error("Faox: unsupported light type " + zahfa.type);
        }
        function zahfw(zahfa) {
            var zahfb = {
                type: zahfa instanceof Mesh ? "Mesh" : "Object3D",
                name: zahfa.name || "",
                position: zahfa.position.toArray(),
                quaternion: [ zahfa.quaternion.x, zahfa.quaternion.y, zahfa.quaternion.z, zahfa.quaternion.w ],
                scale: zahfa.scale.toArray(),
                visible: zahfa.visible !== false,
                children: []
            };
            if (zahfa instanceof Mesh) {
                zahfb.mesh = zahfn(zahfa.geometry);
                zahfb.material = zahft(zahfa.material);
            }
            for (var zahfc = 0; zahfc < zahfa.children.length; zahfc++) {
                var zahfd = zahfa.children[zahfc];
                if (zahfd instanceof Light) {
                    zahfu.push(zahfv(zahfd));
                    continue;
                }
                zahfb.children.push(zahfw(zahfd));
            }
            return zahfb;
        }
        var zahfx = [];
        for (var zahfy = 0; zahfy < zahfa.children.length; zahfy++) {
            var zahfz = zahfa.children[zahfy];
            if (zahfz instanceof Light) {
                zahfu.push(zahfv(zahfz));
                continue;
            }
            zahfx.push(zahfw(zahfz));
        }
        var zahfaa = [];
        var zahfab = zahfe.clips || [];
        for (var zahfac = 0; zahfac < zahfab.length; zahfac++) {
            var zahfad = zahfab[zahfac];
            var zahfae = [];
            var zahfaf = zahfad.tracks || [];
            for (var zahfag = 0; zahfag < zahfaf.length; zahfag++) {
                var zahfah = zahfaf[zahfag];
                zahfae.push({
                    name: zahfah.name,
                    valueType: zahfah.valueType,
                    interpolation: zahfah.interpolation,
                    times: zahfj(zahfah.times),
                    values: zahfj(zahfah.values)
                });
            }
            zahfaa.push({
                name: zahfad.name,
                duration: zahfad.duration,
                tracks: zahfae
            });
        }
        var zahfai = zahfa.background instanceof Color ? [ zahfa.background.r, zahfa.background.g, zahfa.background.b ] : null;
        var zahfaj = {
            format: "faox",
            version: FAOX_VERSION,
            generator: "FaoxomJS v6 faox packer",
            scene: {
                background: zahfai,
                root: zahfx
            },
            meshes: zahfl,
            materials: zahfr,
            textures: zahfo,
            lights: zahfu,
            clips: zahfaa
        };
        var zahfak = FaoxWriter.write(zahfaj, zahff);
        return {
            bytes: zahfak.bytes,
            hash: zahfak.hash,
            chunkCount: zahfak.chunkCount,
            byteLength: zahfak.byteLength,
            head: zahfaj
        };
    }
}

class FaoxLoader {
    parse(zahfa) {
        var zahfc = FaoxWriter.read(zahfa);
        var zahfd = zahfc.head;
        var zahfe = zahfc.chunks;
        function zahff(zahfa, zahfb) {
            var zahfc = zahfe[zahfa.chunk].bytes;
            var zahfd = zahfc.slice();
            return new zahfb(zahfd.buffer);
        }
        var zahfg = [];
        for (var zahfh = 0; zahfh < zahfd.meshes.length; zahfh++) {
            var zahfi = zahfd.meshes[zahfh];
            var zahfj = new Geometry;
            var zahfk = Object.keys(zahfi.attributes);
            for (var zahfl = 0; zahfl < zahfk.length; zahfl++) {
                var zahfm = zahfi.attributes[zahfk[zahfl]];
                zahfj.setAttribute(zahfk[zahfl], new Float32BufferAtt(zahff(zahfm, Float32Array), zahfm.itemSize));
            }
            if (zahfi.index) zahfj.setIndex(zahff(zahfi.index, zahfi.index.array === "u32" ? Uint32Array : Uint16Array));
            zahfg.push(zahfj);
        }
        var zahfn = [];
        for (var zahfo = 0; zahfo < zahfd.textures.length; zahfo++) {
            var zahfp = zahfd.textures[zahfo];
            var zahfq = zahfe[zahfp.chunk].bytes.slice();
            zahfn.push(new DataTexture(zahfq, zahfp.width, zahfp.height, {
                minFilter: zahfp.minFilter,
                magFilter: zahfp.magFilter
            }));
        }
        var zahfr = [];
        for (var zahfs = 0; zahfs < zahfd.materials.length; zahfs++) {
            var zahft = zahfd.materials[zahfs];
            var zahfu = zahfb[zahft.type];
            if (!zahfu) throw new Error("Faox: unsupported material type " + zahft.type);
            var zahfv = new zahfu({});
            if (zahft.color !== undefined) zahfv.color = new Color(zahft.color);
            if (zahft.metalness !== undefined) zahfv.metalness = zahft.metalness;
            if (zahft.roughness !== undefined) zahfv.roughness = zahft.roughness;
            if (zahft.emissive !== undefined) zahfv.emissive = new Color(zahft.emissive);
            if (zahft.opacity !== undefined) zahfv.opacity = zahft.opacity;
            if (zahft.transparent !== undefined) zahfv.transparent = zahft.transparent;
            if (zahft.vertexColors !== undefined) zahfv.vertexColors = zahft.vertexColors;
            if (zahft.map !== null && zahft.map !== undefined) zahfv.map = zahfn[zahft.map];
            zahfr.push(zahfv);
        }
        function zahfw(zahfa) {
            var zahfb = zahfa.type === "Mesh" ? new Mesh(zahfg[zahfa.mesh], zahfr[zahfa.material]) : new Object3D;
            if (zahfa.name) zahfb.name = zahfa.name;
            zahfb.position.fromArray(zahfa.position);
            zahfb.quaternion.set(zahfa.quaternion[0], zahfa.quaternion[1], zahfa.quaternion[2], zahfa.quaternion[3]);
            zahfb.scale.fromArray(zahfa.scale);
            zahfb.visible = zahfa.visible !== false;
            for (var zahfc = 0; zahfc < zahfa.children.length; zahfc++) zahfb.add(zahfw(zahfa.children[zahfc]));
            return zahfb;
        }
        var zahfx = new Scene;
        if (zahfd.scene.background) zahfx.background = (new Color).setRGB(zahfd.scene.background[0], zahfd.scene.background[1], zahfd.scene.background[2]);
        for (var zahfy = 0; zahfy < zahfd.scene.root.length; zahfy++) zahfx.add(zahfw(zahfd.scene.root[zahfy]));
        for (var zahfz = 0; zahfz < zahfd.lights.length; zahfz++) {
            var zahfaa = zahfd.lights[zahfz];
            var zahfab = null;
            if (zahfaa.type === "AmbientLight") zahfab = new AmbientLight(zahfaa.color, zahfaa.intensity); else if (zahfaa.type === "DirectionalLight") zahfab = new DirectionalLight(zahfaa.color, zahfaa.intensity); else if (zahfaa.type === "PointLight") zahfab = new PointLight(zahfaa.color, zahfaa.intensity); else throw new Error("Faox: unsupported light type " + zahfaa.type);
            if (zahfaa.position) zahfab.position.fromArray(zahfaa.position);
            if (zahfaa.castShadow) zahfab.castShadow = true;
            zahfx.add(zahfab);
        }
        var zahfac = [];
        for (var zahfad = 0; zahfad < (zahfd.clips || []).length; zahfad++) {
            var zahfae = zahfd.clips[zahfad];
            var zahfaf = [];
            for (var zahfag = 0; zahfag < zahfae.tracks.length; zahfag++) {
                var zahfah = zahfae.tracks[zahfag];
                zahfaf.push(new AnimationTrack(zahfah.name, Array.from(zahff(zahfah.times, Float32Array)), Array.from(zahff(zahfah.values, Float32Array)), zahfah.valueType, zahfah.interpolation));
            }
            zahfac.push(new AnimationClip(zahfae.name, zahfae.duration, zahfaf));
        }
        return {
            scene: zahfx,
            clips: zahfac,
            hash: zahfc.hash,
            head: zahfd,
            byteLength: zahfc.byteLength
        };
    }
    async load(zahfa) {
        var zahfb = await fetch(zahfa);
        if (!zahfb.ok) throw new Error("Faox: fetch failed " + zahfb.status);
        return this.parse(await zahfb.arrayBuffer());
    }
}

export { FaoxWriter, FaoxPacker, FaoxLoader, FAOX_VERSION };
