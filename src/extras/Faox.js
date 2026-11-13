import { Float32BufferAttribute } from "../core/index.js";
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

var FAOX_MAGIC = [70, 65, 79, 88];
var FAOX_VERSION = 1;
var FAOX_SUPPORTED_MATERIALS = { BasicMaterial: BasicMaterial, LambertMaterial: LambertMaterial, StandardMaterial: StandardMaterial };
var FAOX_ATTRIBUTE_ORDER = ["position", "normal", "tangent", "uv", "uv2", "color", "skinIndex", "skinWeight"];

function faoxfnv(bytes) {
    var h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i++) {
        h ^= bytes[i];
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

function faoxfourcc(text) {
    return ((text.charCodeAt(0) << 24) | (text.charCodeAt(1) << 16) | (text.charCodeAt(2) << 8) | text.charCodeAt(3)) >>> 0;
}

function faoxfourccText(value) {
    return String.fromCharCode((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
}

function faoxhex(value) {
    var s = (value >>> 0).toString(16);
    while (s.length < 8) s = "0" + s;
    return s;
}

class FaoxWriter {
    static hashBytes(bytes) { return faoxfnv(bytes); }
    static fileHash(bytes) { return faoxhex(faoxfnv(bytes)); }
    static write(head, payloads) {
        var entries = [{ fourcc: faoxfourcc("head"), nameId: 0, bytes: new TextEncoder().encode(JSON.stringify(head)) }];
        for (var i = 0; i < payloads.length; i++) {
            entries.push({ fourcc: faoxfourcc(payloads[i].fourcc), nameId: payloads[i].nameId || (i + 1), bytes: payloads[i].bytes });
        }
        var total = 16 + entries.length * 20;
        for (var j = 0; j < entries.length; j++) total += entries[j].bytes.length;
        var out = new Uint8Array(total);
        var view = new DataView(out.buffer);
        out[0] = FAOX_MAGIC[0]; out[1] = FAOX_MAGIC[1]; out[2] = FAOX_MAGIC[2]; out[3] = FAOX_MAGIC[3];
        view.setUint32(4, FAOX_VERSION, true);
        view.setUint32(8, entries.length, true);
        view.setUint32(12, 0, true);
        var offset = 16 + entries.length * 20;
        for (var k = 0; k < entries.length; k++) {
            var entry = 16 + k * 20;
            view.setUint32(entry, entries[k].fourcc, true);
            view.setUint32(entry + 4, offset, true);
            view.setUint32(entry + 8, entries[k].bytes.length, true);
            view.setUint32(entry + 12, faoxfnv(entries[k].bytes), true);
            view.setUint32(entry + 16, entries[k].nameId, true);
            out.set(entries[k].bytes, offset);
            offset += entries[k].bytes.length;
        }
        return { bytes: out, hash: FaoxWriter.fileHash(out), chunkCount: entries.length, byteLength: out.length };
    }
    static read(source) {
        var bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
        if (bytes.length < 16) throw new Error("Faox: file too short");
        if (bytes[0] !== FAOX_MAGIC[0] || bytes[1] !== FAOX_MAGIC[1] || bytes[2] !== FAOX_MAGIC[2] || bytes[3] !== FAOX_MAGIC[3]) throw new Error("Faox: bad magic");
        var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var version = view.getUint32(4, true);
        if (version !== FAOX_VERSION) throw new Error("Faox: unsupported version " + version);
        var count = view.getUint32(8, true);
        var chunks = [];
        for (var i = 0; i < count; i++) {
            var entry = 16 + i * 20;
            var fourcc = view.getUint32(entry, true);
            var offset = view.getUint32(entry + 4, true);
            var length = view.getUint32(entry + 8, true);
            var hash = view.getUint32(entry + 12, true);
            var nameId = view.getUint32(entry + 16, true);
            if (offset + length > bytes.length) throw new Error("Faox: chunk " + i + " out of bounds");
            var payload = bytes.slice(offset, offset + length);
            if (faoxfnv(payload) !== hash) throw new Error("Faox: chunk " + i + " hash mismatch");
            chunks.push({ fourcc: faoxfourccText(fourcc), offset: offset, length: length, hash: hash, nameId: nameId, bytes: payload });
        }
        if (!chunks.length || chunks[0].fourcc !== "head") throw new Error("Faox: missing head chunk");
        var head = JSON.parse(new TextDecoder().decode(chunks[0].bytes));
        if (!head || head.format !== "faox") throw new Error("Faox: head chunk is not a faox manifest");
        return { head: head, chunks: chunks, hash: FaoxWriter.fileHash(bytes), byteLength: bytes.length };
    }
}

class FaoxPacker {
    pack(scene, options) {
        options = options || {};
        var payloads = [];
        var chunkByKey = {};
        function addPayload(fourcc, bytes) {
            var key = fourcc + ":" + faoxhex(faoxfnv(bytes));
            if (chunkByKey[key] !== undefined) return chunkByKey[key];
            var index = payloads.length + 1;
            payloads.push({ fourcc: fourcc, nameId: index, bytes: bytes });
            chunkByKey[key] = index;
            return index;
        }
        function packFloats(values) {
            var typed = values instanceof Float32Array ? values : new Float32Array(values || []);
            var view = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
            return { chunk: addPayload("buf ", view), array: "f32", count: typed.length };
        }
        function packIndex(index) {
            if (!index) return null;
            var typed = index instanceof Uint32Array ? index : new Uint16Array(index);
            var view = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
            return { chunk: addPayload("buf ", view), array: typed instanceof Uint32Array ? "u32" : "u16", count: typed.length };
        }
        var meshes = [];
        var meshIds = new Map();
        function meshEntry(geometry) {
            if (meshIds.has(geometry)) return meshIds.get(geometry);
            var attributes = {};
            var names = Object.keys(geometry.attributes);
            names.sort(function (a, b) { return FAOX_ATTRIBUTE_ORDER.indexOf(a) - FAOX_ATTRIBUTE_ORDER.indexOf(b) || (a < b ? -1 : a > b ? 1 : 0); });
            for (var i = 0; i < names.length; i++) {
                var attribute = geometry.attributes[names[i]];
                var ref = packFloats(attribute.array);
                ref.itemSize = attribute.itemSize;
                attributes[names[i]] = ref;
            }
            var entry = { attributes: attributes, index: packIndex(geometry.index) };
            var index = meshes.length;
            meshes.push(entry);
            meshIds.set(geometry, index);
            return index;
        }
        var textures = [];
        var textureIds = new Map();
        function textureEntry(texture) {
            if (!texture) return null;
            if (!texture.isDataTexture) throw new Error("Faox: only DataTexture maps are supported in v1");
            if (texture.type === "float") throw new Error("Faox: float DataTexture maps are not supported in v1");
            if (textureIds.has(texture)) return textureIds.get(texture);
            var data = texture.data instanceof Uint8Array ? texture.data : new Uint8Array(texture.data);
            var entry = { chunk: addPayload("tex ", data), mime: "rgba8", width: texture.width, height: texture.height, minFilter: texture.minFilter, magFilter: texture.magFilter };
            var index = textures.length;
            textures.push(entry);
            textureIds.set(texture, index);
            return index;
        }
        var materials = [];
        var materialIds = new Map();
        function materialEntry(material) {
            if (!material) throw new Error("Faox: mesh without material");
            if (materialIds.has(material)) return materialIds.get(material);
            if (!FAOX_SUPPORTED_MATERIALS[material.type]) throw new Error("Faox: unsupported material type " + material.type);
            var entry = { type: material.type, color: material.color ? material.color.getHex() : 16777215, metalness: material.metalness, roughness: material.roughness, emissive: material.emissive ? material.emissive.getHex() : 0, opacity: material.opacity, transparent: material.transparent, vertexColors: material.vertexColors, map: textureEntry(material.map) };
            var index = materials.length;
            materials.push(entry);
            materialIds.set(material, index);
            return index;
        }
        var lights = [];
        function packLight(light) {
            if (light instanceof AmbientLight) return { type: "AmbientLight", color: light.color.getHex(), intensity: light.intensity };
            if (light instanceof DirectionalLight) return { type: "DirectionalLight", color: light.color.getHex(), intensity: light.intensity, position: light.position.toArray(), castShadow: light.castShadow === true };
            if (light instanceof PointLight) return { type: "PointLight", color: light.color.getHex(), intensity: light.intensity, position: light.position.toArray(), castShadow: light.castShadow === true };
            throw new Error("Faox: unsupported light type " + light.type);
        }
        function packNode(node) {
            var data = { type: node instanceof Mesh ? "Mesh" : "Object3D", name: node.name || "", position: node.position.toArray(), quaternion: [node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w], scale: node.scale.toArray(), visible: node.visible !== false, children: [] };
            if (node instanceof Mesh) {
                data.mesh = meshEntry(node.geometry);
                data.material = materialEntry(node.material);
            }
            for (var i = 0; i < node.children.length; i++) {
                var child = node.children[i];
                if (child instanceof Light) { lights.push(packLight(child)); continue; }
                data.children.push(packNode(child));
            }
            return data;
        }
        var root = [];
        for (var i = 0; i < scene.children.length; i++) {
            var child = scene.children[i];
            if (child instanceof Light) { lights.push(packLight(child)); continue; }
            root.push(packNode(child));
        }
        var clips = [];
        var inputClips = options.clips || [];
        for (var k = 0; k < inputClips.length; k++) {
            var clip = inputClips[k];
            var tracks = [];
            var inputTracks = clip.tracks || [];
            for (var t = 0; t < inputTracks.length; t++) {
                var track = inputTracks[t];
                tracks.push({ name: track.name, valueType: track.valueType, interpolation: track.interpolation, times: packFloats(track.times), values: packFloats(track.values) });
            }
            clips.push({ name: clip.name, duration: clip.duration, tracks: tracks });
        }
        var background = scene.background instanceof Color ? [scene.background.r, scene.background.g, scene.background.b] : null;
        var head = {
            format: "faox",
            version: FAOX_VERSION,
            generator: "FaoxomJS v6 faox packer",
            scene: { background: background, root: root },
            meshes: meshes,
            materials: materials,
            textures: textures,
            lights: lights,
            clips: clips
        };
        var written = FaoxWriter.write(head, payloads);
        return { bytes: written.bytes, hash: written.hash, chunkCount: written.chunkCount, byteLength: written.byteLength, head: head };
    }
}

class FaoxLoader {
    parse(source) {
        var container = FaoxWriter.read(source);
        var head = container.head;
        var chunks = container.chunks;
        function typedArray(ref, Type) {
            var bytes = chunks[ref.chunk].bytes;
            var copy = bytes.slice();
            return new Type(copy.buffer);
        }
        var geometries = [];
        for (var i = 0; i < head.meshes.length; i++) {
            var meshRef = head.meshes[i];
            var geometry = new Geometry();
            var names = Object.keys(meshRef.attributes);
            for (var a = 0; a < names.length; a++) {
                var ref = meshRef.attributes[names[a]];
                geometry.setAttribute(names[a], new Float32BufferAttribute(typedArray(ref, Float32Array), ref.itemSize));
            }
            if (meshRef.index) geometry.setIndex(typedArray(meshRef.index, meshRef.index.array === "u32" ? Uint32Array : Uint16Array));
            geometries.push(geometry);
        }
        var textures = [];
        for (var t = 0; t < head.textures.length; t++) {
            var texRef = head.textures[t];
            var data = chunks[texRef.chunk].bytes.slice();
            textures.push(new DataTexture(data, texRef.width, texRef.height, { minFilter: texRef.minFilter, magFilter: texRef.magFilter }));
        }
        var materials = [];
        for (var m = 0; m < head.materials.length; m++) {
            var matRef = head.materials[m];
            var MaterialClass = FAOX_SUPPORTED_MATERIALS[matRef.type];
            if (!MaterialClass) throw new Error("Faox: unsupported material type " + matRef.type);
            var material = new MaterialClass({});
            if (matRef.color !== undefined) material.color = new Color(matRef.color);
            if (matRef.metalness !== undefined) material.metalness = matRef.metalness;
            if (matRef.roughness !== undefined) material.roughness = matRef.roughness;
            if (matRef.emissive !== undefined) material.emissive = new Color(matRef.emissive);
            if (matRef.opacity !== undefined) material.opacity = matRef.opacity;
            if (matRef.transparent !== undefined) material.transparent = matRef.transparent;
            if (matRef.vertexColors !== undefined) material.vertexColors = matRef.vertexColors;
            if (matRef.map !== null && matRef.map !== undefined) material.map = textures[matRef.map];
            materials.push(material);
        }
        function buildNode(ref) {
            var node = ref.type === "Mesh" ? new Mesh(geometries[ref.mesh], materials[ref.material]) : new Object3D();
            if (ref.name) node.name = ref.name;
            node.position.fromArray(ref.position);
            node.quaternion.set(ref.quaternion[0], ref.quaternion[1], ref.quaternion[2], ref.quaternion[3]);
            node.scale.fromArray(ref.scale);
            node.visible = ref.visible !== false;
            for (var i = 0; i < ref.children.length; i++) node.add(buildNode(ref.children[i]));
            return node;
        }
        var scene = new Scene();
        if (head.scene.background) scene.background = new Color().setRGB(head.scene.background[0], head.scene.background[1], head.scene.background[2]);
        for (var r = 0; r < head.scene.root.length; r++) scene.add(buildNode(head.scene.root[r]));
        for (var l = 0; l < head.lights.length; l++) {
            var lightRef = head.lights[l];
            var light = null;
            if (lightRef.type === "AmbientLight") light = new AmbientLight(lightRef.color, lightRef.intensity);
            else if (lightRef.type === "DirectionalLight") light = new DirectionalLight(lightRef.color, lightRef.intensity);
            else if (lightRef.type === "PointLight") light = new PointLight(lightRef.color, lightRef.intensity);
            else throw new Error("Faox: unsupported light type " + lightRef.type);
            if (lightRef.position) light.position.fromArray(lightRef.position);
            if (lightRef.castShadow) light.castShadow = true;
            scene.add(light);
        }
        var clips = [];
        for (var c = 0; c < (head.clips || []).length; c++) {
            var clipRef = head.clips[c];
            var tracks = [];
            for (var tr = 0; tr < clipRef.tracks.length; tr++) {
                var trackRef = clipRef.tracks[tr];
                tracks.push(new AnimationTrack(trackRef.name, Array.from(typedArray(trackRef.times, Float32Array)), Array.from(typedArray(trackRef.values, Float32Array)), trackRef.valueType, trackRef.interpolation));
            }
            clips.push(new AnimationClip(clipRef.name, clipRef.duration, tracks));
        }
        return { scene: scene, clips: clips, hash: container.hash, head: head, byteLength: container.byteLength };
    }
    async load(url) {
        var response = await fetch(url);
        if (!response.ok) throw new Error("Faox: fetch failed " + response.status);
        return this.parse(await response.arrayBuffer());
    }
}

export { FaoxWriter, FaoxPacker, FaoxLoader, FAOX_VERSION };
