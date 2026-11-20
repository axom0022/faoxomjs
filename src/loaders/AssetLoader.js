import { AnimationClip, AnimationTrack } from "../animation/index.js";

import { OrthographicCamera, PerspectiveCamera } from "../camera/index.js";

import { DoubleSide, FrontSide, Node, faoxombase64bytes, faoxombytestotext, faoxomdecodehdr, faoxomembeddeddecodersource, faoxomembeddeddecoderwasm, faoxomfbxarray, faoxomfbxchild, faoxomfbxchildren, faoxomfbxcolor, faoxomfbxname, faoxomfbxnumber, faoxomfbxparsenode, faoxomfbxproperty, faoxomfbxresolvenode, faoxomfbxtext, faoxommodelstore, faoxomreadresponse, faoxomstate } from "../core/index.js";

import { Geometry, faoxomgeometry } from "../geometries/index.js";

import { DirectionalLight, PointLight, SpotLight } from "../lights/index.js";

import { BasicMaterial, PhongMaterial, StandardMaterial } from "../materials/index.js";

import { Color, Euler, Matrix4, Quaternion, Vector2, Vector3 } from "../math/index.js";

import { Bone, Group, Mesh, Skeleton, SkinnedMesh } from "../objects/index.js";

import { CompressedCubeTexture, CompressedTexture3D, CompressedTextureArray, CubeTexture, HDRTexture, PMREMGenerator, Texture } from "../textures/index.js";

import { DDSLoader } from "./DDSLoader.js";

import { EXRLoader } from "./EXRLoader.js";

import { GCodeLoader } from "./GCodeLoader.js";

import { MD2Loader } from "./MD2Loader.js";

import { MDDLoader } from "./MDDLoader.js";

import { SVGLoader } from "./SVGLoader.js";

import { TGALoader } from "./TGALoader.js";

import { VTKLoader } from "./VTKLoader.js";

import { faoxomdecodepcd } from "./faoxomdecodepcd.js";

import { faoxomdecodeply } from "./faoxomdecodeply.js";

import { faoxomfbxgeometry } from "./faoxomfbxgeometry.js";

class AssetLoader {
    constructor(zalva) {
        this.options = zalva || {};
        this.cache = {};
        this.inflight = {};
        this.decoderCache = {};
        this.cacheEnabled = this.options.cache !== false;
        this.onProgress = this.options.onProgress || null;
        this.onError = this.options.onError || null;
        this.decoderPaths = this.options.decoderPaths || {
            meshopt: "/decoders/meshopt_decoder.js",
            draco: "/decoders/draco_wasm_wrapper.js",
            dracoWasm: "/decoders/draco_decoder.wasm",
            basis: "/decoders/basis_transcoder.js",
            basisWasm: "/decoders/basis_transcoder.wasm"
        };
    }
    async loadDecoderScript(zalva, zalvb) {
        if (this.decoderCache[zalvb]) return this.decoderCache[zalvb];
        var zalvc = zalvb === "MeshoptDecoder" ? "meshopt" : zalvb === "DracoDecoderModule" ? "draco" : zalvb === "BASIS" ? "basis" : null;
        var zalvd = "";
        if (zalvc && faoxomembeddeddecodersource[zalvc]) {
            var zalve = faoxomembeddeddecodersource[zalvc];
            zalvd = typeof atob === "function" ? (new TextDecoder).decode(new Uint8Array(faoxombase64bytes(zalve))) : typeof Buffer !== "undefined" ? Buffer.from(zalve.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8") : "";
        } else {
            var zalvf = await fetch(zalva);
            if (!zalvf.ok) throw new Error("Decoder request failed: " + zalva);
            zalvd = await zalvf.text();
        }
        var zalvg = new Function("process", zalvd + "\nreturn typeof " + zalvb + " !== 'undefined' ? " + zalvb + " : null;");
        var zalvh = zalvg.call(typeof globalThis !== "undefined" ? globalThis : this, undefined);
        if (!zalvh) throw new Error("Decoder did not expose " + zalvb);
        this.decoderCache[zalvb] = zalvh;
        return zalvh;
    }
    async loadMeshoptDecoder() {
        var zalva = await this.loadDecoderScript(this.decoderPaths.meshopt, "MeshoptDecoder");
        if (zalva.ready) await zalva.ready;
        return zalva;
    }
    async loadDracoDecoder() {
        if (this.decoderCache.dracoModule) return this.decoderCache.dracoModule;
        var zalva = await this.loadDecoderScript(this.decoderPaths.draco, "DracoDecoderModule");
        var zalvb = faoxomembeddeddecoderwasm.draco ? faoxombase64bytes(faoxomembeddeddecoderwasm.draco) : await (await fetch(this.decoderPaths.dracoWasm)).arrayBuffer();
        var zalvc = await zalva({
            wasmBinary: zalvb
        });
        this.decoderCache.dracoModule = zalvc;
        return zalvc;
    }
    async loadBasisDecoder() {
        if (this.decoderCache.basisModule) return this.decoderCache.basisModule;
        var zalva = await this.loadDecoderScript(this.decoderPaths.basis, "BASIS");
        this.decoderCache.basisModule = zalva;
        return zalva;
    }
    async loadBasisWasm() {
        return faoxomembeddeddecoderwasm.basis ? faoxombase64bytes(faoxomembeddeddecoderwasm.basis) : await (await fetch(this.decoderPaths.basisWasm)).arrayBuffer();
    }
    async loadBasisModule() {
        if (this.decoderCache.basisRuntime) return this.decoderCache.basisRuntime;
        var zalva = await this.loadBasisDecoder();
        var zalvb = await zalva({
            wasmBinary: await this.loadBasisWasm()
        });
        if (zalvb.initializeBasis) zalvb.initializeBasis();
        this.decoderCache.basisRuntime = zalvb;
        return zalvb;
    }
    async decodeHDR(zalva) {
        return faoxomdecodehdr(zalva);
    }
    async loadHDR(zalva, zalvb) {
        var zalvc = await fetch(zalva).then(function(zalva) {
            if (!zalva.ok) throw new Error("HDR request failed");
            return zalva.arrayBuffer();
        });
        var zalvd = await this.decodeHDR(zalvc);
        var zalve = new HDRTexture(zalvd, {
            flipY: false,
            minFilter: "linear",
            magFilter: "linear"
        });
        zalve.renderer = zalvb || null;
        return zalve;
    }
    async decodeKTX2(zalva, zalvb, zalvc) {
        zalvc = zalvc || {};
        var zalvd = await this.loadBasisModule();
        var zalve = new zalvd.KTX2File(new Uint8Array(zalva));
        if (!zalve.isValid()) {
            zalve.close();
            throw new Error("Invalid KTX2 texture");
        }
        var zalvf = zalve.getFaces();
        var zalvg = Math.max(1, zalve.getLayers());
        var zalvh = zalve.getDepth ? Math.max(1, zalve.getDepth()) : 1;
        var zalvi = zalve.getLevels();
        var zalvj = !!zalve.getHasAlpha();
        var zalvk = zalvb && zalvb.gl;
        var zalvl = zalvb && zalvb.getCapabilities ? zalvb.getCapabilities() : {
            extensions: {},
            webgl2: false
        };
        var zalvm = zalvl.extensions || {};
        var zalvn = zalvd.transcoder_texture_format;
        var zalvo = {
            name: "rgba8",
            format: zalvn.cTFRGBA32,
            compressed: false,
            internalFormat: null
        };
        var zalvp = zalvk && zalvk.getExtension ? zalvk.getExtension("WEBGL_compressed_texture_astc") : null;
        var zalvq = zalvk && zalvk.getExtension ? zalvk.getExtension("EXT_texture_compression_bptc") : null;
        var zalvr = zalvk && zalvk.getExtension ? zalvk.getExtension("WEBGL_compressed_texture_s3tc") : null;
        var zalvs = zalvk && zalvk.getExtension ? zalvk.getExtension("WEBGL_compressed_texture_pvrtc") : null;
        var zalvt = zalvk && zalvk.getExtension ? zalvk.getExtension("EXT_texture_compression_rgtc") : null;
        if (zalvq && zalvn.cTFBC7_M5_RGBA !== undefined && zalvk.COMPRESSED_RGBA_BPTC_UNORM !== undefined) zalvo = {
            name: "bc7",
            format: zalvj ? zalvn.cTFBC7_M5_RGBA : zalvn.cTFBC7_M6_RGB,
            compressed: true,
            internalFormat: zalvk.COMPRESSED_RGBA_BPTC_UNORM
        }; else if (zalvp && zalvn.cTFASTC_4x4_RGBA !== undefined) zalvo = {
            name: "astc",
            format: zalvn.cTFASTC_4x4_RGBA,
            compressed: true,
            internalFormat: zalvp.COMPRESSED_RGBA_ASTC_4x4_KHR
        }; else if (zalvt && !zalvj && zalvn.cTFBC5_RG !== undefined && zalvt.COMPRESSED_RED_GREEN_RGTC2_EXT !== undefined) zalvo = {
            name: "bc5",
            format: zalvn.cTFBC5_RG,
            compressed: true,
            internalFormat: zalvt.COMPRESSED_RED_GREEN_RGTC2_EXT
        }; else if (zalvt && !zalvj && zalvn.cTFBC4_R !== undefined && zalvt.COMPRESSED_RED_RGTC1_EXT !== undefined) zalvo = {
            name: "bc4",
            format: zalvn.cTFBC4_R,
            compressed: true,
            internalFormat: zalvt.COMPRESSED_RED_RGTC1_EXT
        }; else if (zalvr) zalvo = {
            name: zalvj ? "bc3" : "bc1",
            format: zalvj ? zalvn.cTFBC3_RGBA : zalvn.cTFBC1_RGB,
            compressed: true,
            internalFormat: zalvj ? zalvr.COMPRESSED_RGBA_S3TC_DXT5_EXT : zalvr.COMPRESSED_RGB_S3TC_DXT1_EXT
        }; else if (zalvs && zalvn.cTFPVRTC1_4_RGBA !== undefined) zalvo = {
            name: "pvrtc",
            format: zalvj ? zalvn.cTFPVRTC1_4_RGBA : zalvn.cTFPVRTC1_4_RGB,
            compressed: true,
            internalFormat: zalvj ? zalvs.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG : zalvs.COMPRESSED_RGB_PVRTC_4BPPV1_IMG
        }; else if (zalvk && zalvb.isWebGL2 && zalvk.COMPRESSED_RGBA8_ETC2_EAC !== undefined && zalvn.cTFETC2_RGBA !== undefined) zalvo = {
            name: "etc2",
            format: zalvn.cTFETC2_RGBA,
            compressed: true,
            internalFormat: zalvk.COMPRESSED_RGBA8_ETC2_EAC
        };
        if (!zalve.startTranscoding()) {
            zalve.close();
            throw new Error("KTX2 transcoding initialization failed");
        }
        var zalvu = zalve.getWidth(), zalvv = zalve.getHeight(), zalvw = [];
        for (var zalvx = 0; zalvx < zalvi; zalvx++) {
            var zalvy = [];
            var zalvz = zalvh > 1 ? zalvh : zalvg;
            for (var zalvaa = 0; zalvaa < zalvz; zalvaa++) for (var zalvab = 0; zalvab < zalvf; zalvab++) {
                var zalvac = zalve.getImageTranscodedSizeInBytes(zalvx, zalvaa, zalvab, zalvo.format);
                var zalvad = new Uint8Array(zalvac);
                if (!zalve.transcodeImage(zalvad, zalvx, zalvaa, zalvab, zalvo.format, 0, -1, -1)) {
                    zalve.close();
                    throw new Error("KTX2 level transcoding failed");
                }
                zalvy.push({
                    layer: zalvaa,
                    face: zalvab,
                    data: zalvad
                });
            }
            zalvw.push({
                level: zalvx,
                width: Math.max(1, zalvu >> zalvx),
                height: Math.max(1, zalvv >> zalvx),
                slices: zalvy,
                data: zalvy.length === 1 ? zalvy[0].data : null,
                compressed: zalvo.compressed,
                internalFormat: zalvo.internalFormat
            });
        }
        zalve.close();
        return {
            width: zalvu,
            height: zalvv,
            depth: zalvh,
            levels: zalvw,
            faces: zalvf,
            layers: zalvg,
            target: zalvf === 6 ? "cubemap" : zalvh > 1 ? "3d" : zalvg > 1 ? "array" : "2d",
            format: zalvo.name,
            compressed: zalvo.compressed,
            hasAlpha: zalvj
        };
    }
    async loadKTX2(zalva, zalvb) {
        var zalvc = await fetch(zalva).then(function(zalva) {
            if (!zalva.ok) throw new Error("KTX2 request failed");
            return zalva.arrayBuffer();
        });
        var zalvd = await this.decodeKTX2(zalvc, zalvb);
        var zalve = zalvd.target === "cubemap" ? new CompressedCubeTexture(zalvd, {
            flipY: false,
            minFilter: zalvd.levels.length > 1 ? "linearMipmapLinear" : "linear"
        }) : zalvd.target === "array" ? new CompressedTextureArray(zalvd, {
            flipY: false,
            minFilter: zalvd.levels.length > 1 ? "linearMipmapLinear" : "linear"
        }) : zalvd.target === "3d" ? new CompressedTexture3D(zalvd, {
            flipY: false,
            minFilter: zalvd.levels.length > 1 ? "linearMipmapLinear" : "linear"
        }) : new Texture(null, {
            flipY: false,
            minFilter: zalvd.levels.length > 1 ? "linearMipmapLinear" : "linear"
        });
        if (zalvd.target !== "cubemap" && zalvd.target !== "array" && zalvd.target !== "3d") zalve.compressed = zalvd;
        zalve.loaded = true;
        zalve.needsUpdate = true;
        return zalve;
    }
    async prepareDraco(zalva, zalvb) {
        var zalvc = null;
        var zalvd = null;
        var zalve = zalva.meshes || [];
        for (var zalvf = 0; zalvf < zalve.length; zalvf++) for (var zalvg = 0; zalvg < (zalve[zalvf].primitives || []).length; zalvg++) {
            var zalvh = zalve[zalvf].primitives[zalvg];
            var zalvi = zalvh.extensions && zalvh.extensions.KHR_draco_mesh_compression;
            if (!zalvi) continue;
            if (!zalvc) {
                zalvc = await this.loadDracoDecoder();
                zalvd = new zalvc.Decoder;
            }
            var zalvj = zalva.bufferViews[zalvi.bufferView];
            var zalvk = new Int8Array(zalvb[zalvj.buffer], zalvj.byteOffset || 0, zalvj.byteLength);
            var zalvl = new zalvc.DecoderBuffer;
            zalvl.Init(zalvk, zalvk.length);
            var zalvm = zalvd.GetEncodedGeometryType(zalvl);
            if (zalvm !== zalvc.TRIANGULAR_MESH) {
                zalvl.__destroy__();
                throw new Error("Draco point clouds are not supported as mesh primitives");
            }
            var zalvn = new zalvc.Mesh;
            var zalvo = zalvd.DecodeBufferToMesh(zalvl, zalvn);
            if (!zalvo.ok() || zalvn.num_points() === 0) {
                zalvl.__destroy__();
                zalvn.__destroy__();
                throw new Error("Draco mesh decoding failed");
            }
            var zalvp = {
                attributes: {},
                index: new Uint32Array(zalvn.num_faces() * 3)
            };
            zalvd.GetTrianglesUInt32Array(zalvn, zalvp.index.length, zalvp.index);
            var zalvq = {
                POSITION: "POSITION",
                NORMAL: "NORMAL",
                TEXCOORD_0: "TEX_COORD",
                COLOR_0: "COLOR",
                TANGENT: "GENERIC"
            };
            for (var zalvr in zalvi.attributes) {
                var zalvs = zalvi.attributes[zalvr];
                var zalvt = zalvd.GetAttributeByUniqueId(zalvn, zalvs);
                if (!zalvt) continue;
                var zalvu = zalvt.size();
                var zalvv = new Float32Array(zalvn.num_points() * zalvu);
                zalvd.GetAttributeFloatForAllPoints(zalvn, zalvt, zalvv);
                zalvp.attributes[zalvr] = {
                    array: zalvv,
                    itemSize: zalvu,
                    normalized: false
                };
            }
            zalvh._decoded = zalvp;
            zalvl.__destroy__();
            zalvn.__destroy__();
        }
        if (zalvd && zalvd.__destroy__) zalvd.__destroy__();
        return zalva;
    }
    async prepareMeshopt(zalva, zalvb) {
        var zalvc = null;
        var zalvd = zalva.bufferViews || [];
        for (var zalve = 0; zalve < zalvd.length; zalve++) {
            var zalvf = zalvd[zalve];
            var zalvg = zalvf.extensions && zalvf.extensions.EXT_meshopt_compression;
            if (!zalvg) continue;
            if (!zalvc) zalvc = await this.loadMeshoptDecoder();
            var zalvh = zalvb[zalvg.buffer];
            var zalvi = new Uint8Array(zalvh, zalvg.byteOffset || 0, zalvg.byteLength);
            var zalvj = new Uint8Array(zalvg.count * zalvg.byteStride);
            zalvc.decodeGltfBuffer(zalvj, zalvg.count, zalvg.byteStride, zalvi, zalvg.mode, zalvg.filter);
            var zalvk = zalva.buffers.length;
            zalva.buffers.push({
                byteLength: zalvj.byteLength
            });
            zalvb.push(zalvj.buffer);
            zalvf.buffer = zalvk;
            zalvf.byteOffset = 0;
            zalvf.byteLength = zalvj.byteLength;
            zalvf.byteStride = zalvg.byteStride;
            delete zalvf.extensions;
        }
        return zalva;
    }
    prepareCompressedTextures(zalva) {
        var zalvb = this;
        var zalvc = [];
        if (!zalva || !zalva.traverse) return Promise.resolve(zalva);
        zalva.traverse(function(zalva) {
            if (!zalva.material) return;
            var zalvd = Array.isArray(zalva.material) ? zalva.material : [ zalva.material ];
            for (var zalve = 0; zalve < zalvd.length; zalve++) {
                var zalvf = zalvd[zalve];
                for (var zalvg in zalvf) {
                    var zalvh = zalvf[zalvg];
                    if (!zalvh || !zalvh.compressedTexture || !zalvh.compressedSource) continue;
                    zalvc.push(zalvb.loadKTX2(zalvh.compressedSource, zalvb.options.renderer).then(function(zalva, zalvb) {
                        return function(zalvc) {
                            zalva[zalvb] = zalvc;
                        };
                    }(zalvf, zalvg)));
                }
            }
        });
        return Promise.all(zalvc).then(function() {
            return zalva;
        });
    }
    load(zalva, zalvb, zalvc) {
        if (zalvb && typeof zalvb === "object") {
            zalvc = zalvb;
            zalvb = zalvc.type;
        }
        zalvc = zalvc || {};
        var zalvd = typeof zalva === "string" && (!zalvb || zalvb === "model") && (!zalvc.type || zalvc.type === "model") ? zalva.indexOf("embedded:") === 0 ? zalva.slice(9) : faoxommodelstore()[zalva] !== undefined ? zalva : null : null;
        var zalve = zalvc.cacheKey || (zalvd !== null ? "embedded:" + zalvd + "#" + faoxomstate.faoxommodelstoreversion : zalva) + "|" + (zalvb || "");
        if (this.cacheEnabled && zalvc.cache !== false && this.cache[zalve]) return Promise.resolve(this.cache[zalve]);
        if (this.inflight[zalve]) return this.inflight[zalve];
        var zalvf = this, zalvg = (zalva.split(".").pop() || "").toLowerCase().split("?")[0], zalvh = zalvb || zalvc.type || (zalvg === "gltf" || zalvg === "glb" || zalvg === "fbx" || zalvg === "obj" || zalvg === "ply" || zalvg === "stl" || zalvg === "mtl" || zalvg === "bvh" || zalvg === "pcd" || zalvg === "vtk" || zalvg === "gcode" || zalvg === "md2" || zalvg === "mdd" || zalvg === "svg" ? "model" : zalvg === "png" || zalvg === "jpg" || zalvg === "jpeg" || zalvg === "webp" || zalvg === "ktx2" || zalvg === "hdr" || zalvg === "tga" || zalvg === "dds" || zalvg === "exr" ? "texture" : zalvg === "mp3" || zalvg === "wav" || zalvg === "ogg" ? "audio" : zalvg === "json" ? "json" : "text"), zalvi = zalvc.onProgress || this.onProgress, zalvj = {
            headers: zalvc.headers || {}
        };
        if (zalvc.signal) zalvj.signal = zalvc.signal;
        var zalvk = function(zalva) {
            if (zalvf.cacheEnabled && zalvc.cache !== false) zalvf.cache[zalve] = zalva;
            return zalva;
        };
        var zalvl;
        if (zalvd !== null) zalvl = Promise.resolve(zalvf.loadEmbeddedEntry(zalvd)).then(function(zalva) {
            return zalvf.prepareCompressedTextures(zalva);
        }).then(zalvk); else if (zalvh === "texture") zalvl = zalvg === "ktx2" ? zalvf.loadKTX2(zalva, zalvf.options.renderer).then(zalvk) : zalvg === "hdr" ? zalvf.loadHDR(zalva, zalvf.options.renderer).then(zalvk) : zalvg === "tga" ? zalvf.loadTGA(zalva).then(zalvk) : zalvg === "dds" ? zalvf.loadDDS(zalva).then(zalvk) : zalvg === "exr" ? zalvf.loadEXR(zalva).then(zalvk) : new Texture(zalva).promise.then(zalvk); else if (zalvh === "audio") zalvl = Promise.resolve(typeof Audio !== "undefined" ? new Audio(zalva) : {
            src: zalva
        }).then(zalvk); else zalvl = fetch(zalva, zalvj).then(function(zalvb) {
            return faoxomreadresponse(zalvb, zalvg === "glb" || zalvg === "fbx" || zalvg === "ply" || zalvg === "pcd" || zalvg === "stl" || zalvg === "md2" || zalvg === "mdd" || zalvg === "vtk" ? "arraybuffer" : zalvh === "json" || zalvg === "gltf" ? "json" : "text", function(zalvb, zalvc) {
                if (zalvi) zalvi({
                    url: zalva,
                    loaded: zalvb,
                    total: zalvc,
                    ratio: zalvc ? zalvb / zalvc : 0
                });
            });
        }).then(function(zalvb) {
            return zalvf.parseModel(zalvb, zalvg, zalva);
        }).then(function(zalva) {
            return zalvf.prepareCompressedTextures(zalva);
        }).then(zalvk);
        this.inflight[zalve] = zalvl;
        return zalvl.then(function(zalva) {
            delete zalvf.inflight[zalve];
            return zalva;
        }, function(zalvb) {
            delete zalvf.inflight[zalve];
            if (zalvf.onError) zalvf.onError(zalvb, zalva);
            throw zalvb;
        });
    }
    loadEmbeddedEntry(zalva) {
        var zalvb = faoxommodelstore()[zalva];
        if (!zalvb) return Promise.reject(new Error("No embedded model named " + zalva));
        if (zalvb.format === "gltf") return this.parseGLTF(typeof zalvb.json === "string" ? JSON.parse(zalvb.json) : zalvb.json, "embedded:" + zalva + ".gltf", []);
        var zalvc = zalvb.data;
        var zalvd = zalvc instanceof ArrayBuffer ? zalvc : typeof zalvc === "string" ? faoxombase64bytes(zalvc) : zalvc && zalvc.buffer instanceof ArrayBuffer ? zalvc.buffer.slice(zalvc.byteOffset, zalvc.byteOffset + zalvc.byteLength) : null;
        if (!zalvd) return Promise.reject(new Error("Embedded model " + zalva + " has no usable data"));
        return Promise.resolve(this.parseGLB(zalvd, "embedded:" + zalva + ".glb"));
    }
    loadModel(zalva, zalvb) {
        return this.load(zalva, "model", zalvb);
    }
    loadTexture(zalva, zalvb) {
        return this.load(zalva, "texture", zalvb);
    }
    hasCached(zalva, zalvb) {
        return !!(this.cacheEnabled && this.cache[zalva + "|" + (zalvb || "")]);
    }
    getCached(zalva, zalvb) {
        return this.cache[zalva + "|" + (zalvb || "")] || null;
    }
    clearCache(zalva, zalvb) {
        if (zalva === undefined) this.cache = {}; else delete this.cache[zalva + "|" + (zalvb || "")];
        return this;
    }
    loadWithProgress(zalva, zalvb, zalvc, zalvd) {
        zalvd = Object.assign({}, zalvd || {}, {
            onProgress: zalvc
        });
        return this.load(zalva, zalvb, zalvd);
    }
    loadManifest(zalva, zalvb) {
        var zalvc = [];
        if (Array.isArray(zalva)) for (var zalvd = 0; zalvd < zalva.length; zalvd++) zalvc.push({
            name: String(zalvd),
            value: zalva[zalvd]
        }); else if (zalva) {
            for (var zalve in zalva) {
                var zalvf = zalva[zalve];
                if (Array.isArray(zalvf)) for (var zalvg = 0; zalvg < zalvf.length; zalvg++) zalvc.push({
                    name: zalve + "." + zalvg,
                    value: zalvf[zalvg]
                }); else if (zalvf && typeof zalvf === "object") for (var zalvh in zalvf) zalvc.push({
                    name: zalve + "." + zalvh,
                    value: zalvf[zalvh]
                });
            }
        }
        var zalvi = {};
        var zalvj = 0;
        var zalvk = this;
        return Promise.all(zalvc.map(function(zalva) {
            var zalvd = zalva.value;
            var zalve = typeof zalvd === "string" ? zalvd : zalvd.url;
            var zalvf = typeof zalvd === "string" ? undefined : zalvd.type;
            return zalvk.load(zalve, zalvf).then(function(zalvd) {
                zalvi[zalva.name] = zalvd;
                zalvj++;
                if (zalvb) zalvb(zalvj, zalvc.length, zalva.name, zalvd);
                return zalvd;
            });
        })).then(function() {
            return zalvi;
        });
    }
    loadAudio(zalva) {
        return this.load(zalva, "audio");
    }
    parseModel(zalva, zalvb, zalvc) {
        if (zalvb === "obj" && typeof zalva === "string") return this.parseOBJ(zalva);
        if (zalvb === "ply") return this.parsePLY(zalva);
        if (zalvb === "stl" && (typeof zalva === "string" || zalva instanceof ArrayBuffer)) return this.parseSTL(zalva);
        if (zalvb === "pcd") return this.parsePCD(zalva);
        if (zalvb === "vtk") return this.parseVTK(zalva);
        if (zalvb === "gcode" && typeof zalva === "string") return this.parseGCode(zalva);
        if (zalvb === "md2" && zalva instanceof ArrayBuffer) return this.parseMD2(zalva);
        if (zalvb === "mdd" && zalva instanceof ArrayBuffer) return this.parseMDD(zalva);
        if (zalvb === "svg" && typeof zalva === "string") return this.parseSVG(zalva);
        if (zalvb === "bvh" && typeof zalva === "string") return this.parseBVH(zalva);
        if (zalvb === "mtl" && typeof zalva === "string") return this.parseMTL(zalva, zalvc);
        if (zalvb === "glb" && zalva instanceof ArrayBuffer) return this.parseGLB(zalva, zalvc);
        if (zalvb === "fbx" && zalva instanceof ArrayBuffer) return this.parseFBX(zalva, zalvc);
        if (zalvb === "gltf" && zalva && zalva.asset) return this.parseGLTF(zalva, zalvc, []);
        if (zalvb === "dae" && typeof zalva === "string") return this.parseCollada(zalva, zalvc);
        return zalva;
    }
    parseCollada(zalva, zalvb) {
        if (typeof DOMParser === "undefined") throw new Error("Collada parsing requires DOMParser");
        var zalvc = (new DOMParser).parseFromString(zalva, "application/xml");
        var zalvd = zalvb ? zalvb.slice(0, zalvb.lastIndexOf("/") + 1) : "";
        var zalve = function(zalva, zalvb) {
            var zalvc = [];
            if (!zalva) return zalvc;
            for (var zalvd = 0; zalvd < zalva.childNodes.length; zalvd++) if (zalva.childNodes[zalvd].nodeType === 1 && zalva.childNodes[zalvd].tagName === zalvb) zalvc.push(zalva.childNodes[zalvd]);
            return zalvc;
        };
        var zalvf = function(zalva, zalvb) {
            var zalvc = zalve(zalva, zalvb);
            return zalvc.length ? zalvc[0] : null;
        };
        var zalvg = function(zalva, zalvb) {
            var zalvc = zalvf(zalva, zalvb);
            return zalvc ? zalvc.textContent.trim() : "";
        };
        var zalvh = function(zalva) {
            return zalva ? zalva.trim().split(/\s+/).map(Number) : [];
        };
        var zalvi = {};
        var zalvj = zalvc.getElementsByTagName("library_images")[0];
        if (zalvj) for (var zalvk = 0; zalvk < zalvj.getElementsByTagName("image").length; zalvk++) {
            var zalvl = zalvj.getElementsByTagName("image")[zalvk];
            zalvi[zalvl.getAttribute("id")] = zalvg(zalvl, "init_from");
        }
        var zalvm = {};
        var zalvn = function(zalva, zalvb) {
            zalvb = (zalvb || "").replace(/^#/, "");
            if (zalvm[zalvb]) return zalvm[zalvb];
            var zalvd = zalva && zalva.ownerDocument ? zalva.ownerDocument.getElementById(zalvb) : zalvc.getElementById(zalvb);
            var zalvi = zalvd ? zalvg(zalvd, "float_array") : "";
            var zalvj = zalvd ? zalvg(zalvd, "Name_array") : "";
            var zalvk = zalvj ? zalvj.split(/\s+/) : [];
            var zalvl = zalvi ? zalvh(zalvi) : zalvk;
            var zalvn = zalvd ? zalvf(zalvf(zalvd, "technique_common"), "accessor") : null;
            var zalvo = zalvn ? parseInt(zalvn.getAttribute("stride") || "1", 10) : 1;
            var zalvp = [];
            if (zalvn) {
                var zalvq = zalve(zalvn, "param");
                for (var zalvr = 0; zalvr < zalvq.length; zalvr++) zalvp.push(zalvq[zalvr].getAttribute("name") || "");
            }
            zalvm[zalvb] = {
                array: zalvl,
                stride: zalvo,
                names: zalvk.length ? zalvk : zalvp
            };
            return zalvm[zalvb];
        };
        var zalvo = {};
        var zalvp = zalvc.getElementsByTagName("library_effects")[0];
        if (zalvp) for (var zalvq = 0; zalvq < zalvp.getElementsByTagName("effect").length; zalvq++) {
            var zalvr = zalvp.getElementsByTagName("effect")[zalvq];
            var zalvs = zalvf(zalvr, "profile_COMMON");
            var zalvt = {};
            var zalvu = zalvs ? zalve(zalvs, "newparam") : [];
            for (var zalvv = 0; zalvv < zalvu.length; zalvv++) {
                var zalvw = zalvf(zalvu[zalvv], "surface");
                var zalvx = zalvf(zalvu[zalvv], "sampler2D");
                if (zalvw) zalvt[zalvu[zalvv].getAttribute("sid")] = zalvg(zalvw, "init_from");
                if (zalvx) zalvt[zalvu[zalvv].getAttribute("sid")] = zalvt[zalvg(zalvx, "source")] || "";
            }
            var zalvy = zalvs ? zalvf(zalvs, "technique") : null;
            var zalvz = zalvy ? zalvf(zalvy, "phong") || zalvf(zalvy, "blinn") || zalvf(zalvy, "lambert") || zalvf(zalvy, "constant") : null;
            var zalvaa = {
                color: 16777215,
                ambient: 2236962,
                diffuse: 16777215,
                specular: 1118481,
                shininess: 30,
                opacity: 1
            };
            var zalvab = function(zalva, zalvb, zalvc) {
                var zalvd = zalvf(zalva, zalvb);
                var zalve = zalvd ? zalvh(zalvd.textContent) : [];
                return zalve.length >= 3 ? new Color(zalve[0], zalve[1], zalve[2]) : zalvc;
            };
            if (zalvz) {
                zalvaa.ambient = zalvab(zalvz, "ambient", zalvaa.ambient);
                zalvaa.diffuse = zalvab(zalvz, "diffuse", zalvaa.diffuse);
                zalvaa.color = zalvaa.diffuse;
                zalvaa.specular = zalvab(zalvz, "specular", zalvaa.specular);
                var zalvac = zalvf(zalvz, "shininess");
                if (zalvac) zalvaa.shininess = parseFloat(zalvg(zalvac, "float") || zalvac.textContent);
                var zalvad = zalvf(zalvz, "transparency");
                if (zalvad) {
                    zalvaa.opacity = parseFloat(zalvg(zalvad, "float") || zalvad.textContent);
                    zalvaa.transparent = zalvaa.opacity < 1;
                }
                var zalvae = zalvf(zalvz, "diffuse");
                var zalvaf = zalvae ? zalvf(zalvae, "texture") : null;
                if (zalvaf) {
                    var zalvag = zalvt[zalvaf.getAttribute("texture")] || zalvi[zalvaf.getAttribute("texture")];
                    if (zalvag) zalvaa.diffuseMap = new Texture(zalvd + zalvag, {
                        flipY: false
                    });
                }
                var zalvah = zalvf(zalvz, "emission");
                if (zalvah) zalvaa.emissive = zalvab(zalvz, "emission", new Color(0, 0, 0));
            }
            zalvo[zalvr.getAttribute("id")] = zalvaa;
        }
        var zalvai = {};
        var zalvaj = zalvc.getElementsByTagName("library_materials")[0];
        if (zalvaj) for (var zalvak = 0; zalvak < zalvaj.getElementsByTagName("material").length; zalvak++) {
            var zalval = zalvaj.getElementsByTagName("material")[zalvak];
            var zalvam = (zalval.getAttribute("url") || "").replace(/^#/, "");
            zalvai[zalval.getAttribute("id")] = new PhongMaterial(zalvo[zalvam] || {});
        }
        var zalvan = {};
        var zalvao = zalvc.getElementsByTagName("library_geometries")[0];
        var zalvap = function(zalva) {
            var zalvb = zalvf(zalva, "mesh");
            if (!zalvb) return null;
            var zalvc = {};
            var zalvd = zalve(zalvb, "source");
            for (var zalvi = 0; zalvi < zalvd.length; zalvi++) zalvc[zalvd[zalvi].getAttribute("id")] = zalvn(zalvd[zalvi], zalvd[zalvi].getAttribute("id"));
            var zalvj = zalvf(zalvb, "vertices");
            var zalvk = zalvj ? zalve(zalvj, "input") : [];
            var zalvl = zalvk.length ? (zalvk[0].getAttribute("source") || "").replace(/^#/, "") : null;
            var zalvm = zalvl && zalvc[zalvl] ? zalvc[zalvl] : zalvn(zalvb, zalvl);
            var zalvo = [], zalvp = [], zalvq = [], zalvr = [], zalvs = {}, zalvt = [], zalvu = false, zalvv = false;
            var zalvw = zalve(zalvb, "triangles").concat(zalve(zalvb, "polylist"));
            for (var zalvx = 0; zalvx < zalvw.length; zalvx++) {
                var zalvy = zalvw[zalvx];
                var zalvz = zalve(zalvy, "input");
                var zalvaa = 0, zalvab = 0, zalvac = -1, zalvad = -1, zalvae = null, zalvaf = null;
                for (var zalvag = 0; zalvag < zalvz.length; zalvag++) {
                    var zalvah = zalvz[zalvag];
                    var zalvai = parseInt(zalvah.getAttribute("offset") || "0", 10);
                    zalvaa = Math.max(zalvaa, zalvai + 1);
                    var zalvaj = zalvah.getAttribute("semantic");
                    var zalvak = (zalvah.getAttribute("source") || "").replace(/^#/, "");
                    if (zalvaj === "VERTEX") zalvab = zalvai;
                    if (zalvaj === "NORMAL") {
                        zalvac = zalvai;
                        zalvae = zalvak;
                    }
                    if (zalvaj === "TEXCOORD" && zalvad < 0) {
                        zalvad = zalvai;
                        zalvaf = zalvak;
                    }
                }
                var zalval = zalvh(zalvg(zalvy, "p"));
                var zalvam = zalvy.tagName === "polylist" ? zalvh(zalvg(zalvy, "vcount")) : null;
                var zalvan = 0;
                var zalvao = function(zalva) {
                    var zalvd = zalva.join("/");
                    var zalve = zalvs[zalvd];
                    if (zalve === undefined) {
                        var zalvf = zalva[zalvab] || 0;
                        var zalvg = zalvf * zalvm.stride;
                        var zalvh = zalvae && zalvc[zalvae] ? zalvc[zalvae] : zalvn(zalvb, zalvae);
                        var zalvi = zalvaf && zalvc[zalvaf] ? zalvc[zalvaf] : zalvn(zalvb, zalvaf);
                        zalvo.push(zalvm.array[zalvg] || 0, zalvm.array[zalvg + 1] || 0, zalvm.array[zalvg + 2] || 0);
                        if (zalvac >= 0 && zalvh) {
                            var zalvj = (zalva[zalvac] || 0) * zalvh.stride;
                            zalvp.push(zalvh.array[zalvj] || 0, zalvh.array[zalvj + 1] || 0, zalvh.array[zalvj + 2] || 0);
                            zalvu = true;
                        }
                        if (zalvad >= 0 && zalvi) {
                            var zalvk = (zalva[zalvad] || 0) * zalvi.stride;
                            zalvq.push(zalvi.array[zalvk] || 0, zalvi.array[zalvk + 1] || 0);
                            zalvv = true;
                        }
                        zalve = zalvo.length / 3 - 1;
                        zalvs[zalvd] = zalve;
                    }
                    return zalve;
                };
                var zalvap = function(zalva, zalvb) {
                    var zalvc = [];
                    for (var zalvd = 0; zalvd < zalvb; zalvd++) {
                        var zalve = [];
                        for (var zalvf = 0; zalvf < zalvaa; zalvf++) zalve.push(zalval[zalva + zalvd * zalvaa + zalvf] || 0);
                        zalvc.push(zalvao(zalve));
                    }
                    for (var zalvg = 1; zalvg < zalvc.length - 1; zalvg++) zalvt.push(zalvy.getAttribute("material") || ""),
                    zalvr.push(zalvc[0], zalvc[zalvg], zalvc[zalvg + 1]);
                };
                if (zalvam) {
                    for (var zalvaq = 0; zalvaq < zalvam.length; zalvaq++) {
                        zalvap(zalvan, zalvam[zalvaq]);
                        zalvan += zalvam[zalvaq] * zalvaa;
                    }
                } else {
                    for (var zalvar = 0; zalvar < zalval.length / zalvaa; zalvar += 3) zalvap(zalvar * zalvaa, 3);
                }
            }
            var zalvas = [];
            for (var zalvat = 0; zalvat < zalvr.length; zalvat++) if (typeof zalvr[zalvat] === "number") zalvas.push(zalvr[zalvat]);
            var zalvau = faoxomgeometry(zalvo, zalvu ? zalvp : null, zalvv ? zalvq : null, zalvas);
            return {
                geometry: zalvau,
                materialSymbols: zalvt
            };
        };
        if (zalvao) {
            var zalvaq = zalvao.getElementsByTagName("geometry");
            for (var zalvar = 0; zalvar < zalvaq.length; zalvar++) zalvan[zalvaq[zalvar].getAttribute("id")] = zalvap(zalvaq[zalvar]);
        }
        var zalvas = {};
        var zalvat = zalvc.getElementsByTagName("library_controllers")[0];
        if (zalvat) {
            var zalvau = zalvat.getElementsByTagName("controller");
            for (var zalvav = 0; zalvav < zalvau.length; zalvav++) {
                var zalvaw = zalvau[zalvav];
                var zalvax = zalvf(zalvaw, "skin");
                if (!zalvax) continue;
                var zalvay = (zalvax.getAttribute("source") || "").replace(/^#/, "");
                var zalvaz = {};
                var zalvba = zalve(zalvax, "source");
                for (var zalvbb = 0; zalvbb < zalvba.length; zalvbb++) zalvaz[zalvba[zalvbb].getAttribute("id")] = zalvn(zalvba[zalvbb], zalvba[zalvbb].getAttribute("id"));
                var zalvbc = zalvf(zalvax, "joints");
                var zalvbd = zalvbc ? zalve(zalvbc, "input") : [];
                var zalvbe = [], zalvbf = null;
                for (var zalvbg = 0; zalvbg < zalvbd.length; zalvbg++) {
                    var zalvbh = (zalvbd[zalvbg].getAttribute("source") || "").replace(/^#/, "");
                    if (zalvbd[zalvbg].getAttribute("semantic") === "JOINT") {
                        var zalvbi = zalvaz[zalvbh] || zalvn(zalvax, zalvbh);
                        zalvbe = zalvbi.names && zalvbi.names.length ? zalvbi.names : zalvbi.array;
                    }
                    if (zalvbd[zalvbg].getAttribute("semantic") === "INV_BIND_MATRIX") zalvbf = zalvaz[zalvbh] || zalvn(zalvax, zalvbh);
                }
                var zalvbj = zalvf(zalvax, "vertex_weights"), zalvbk = null, zalvbl = -1, zalvbm = -1, zalvbn = 0;
                if (zalvbj) {
                    var zalvbo = zalve(zalvbj, "input");
                    for (var zalvbp = 0; zalvbp < zalvbo.length; zalvbp++) {
                        var zalvbq = (zalvbo[zalvbp].getAttribute("source") || "").replace(/^#/, "");
                        zalvbn = Math.max(zalvbn, parseInt(zalvbo[zalvbp].getAttribute("offset") || "0", 10) + 1);
                        if (zalvbo[zalvbp].getAttribute("semantic") === "JOINT") zalvbl = parseInt(zalvbo[zalvbp].getAttribute("offset") || "0", 10);
                        if (zalvbo[zalvbp].getAttribute("semantic") === "WEIGHT") zalvbm = parseInt(zalvbo[zalvbp].getAttribute("offset") || "0", 10),
                        zalvbk = zalvaz[zalvbq] || zalvn(zalvax, zalvbq);
                    }
                }
                zalvas[zalvaw.getAttribute("id")] = {
                    geometry: zalvay,
                    jointNames: zalvbe,
                    inverseSource: zalvbf,
                    weights: zalvbk,
                    jointOffset: zalvbl,
                    weightOffset: zalvbm,
                    weightStride: zalvbn,
                    vcounts: zalvbj ? zalvh(zalvg(zalvbj, "vcount")) : [],
                    values: zalvbj ? zalvh(zalvg(zalvbj, "v")) : []
                };
            }
        }
        var zalvbr = {}, zalvbs = {}, zalvbt = new Group;
        zalvbt.name = "collada";
        var zalvbu = function(zalva, zalvb) {
            var zalvc = zalva.childNodes;
            for (var zalvd = 0; zalvd < zalvc.length; zalvd++) {
                var zalve = zalvc[zalvd];
                if (zalve.nodeType !== 1) continue;
                var zalvf = zalvh(zalve.textContent);
                if (zalve.tagName === "translate" && zalvf.length >= 3) zalvb.position.set(zalvf[0], zalvf[1], zalvf[2]); else if (zalve.tagName === "scale" && zalvf.length >= 3) zalvb.scale.set(zalvf[0], zalvf[1], zalvf[2]); else if (zalve.tagName === "rotate" && zalvf.length >= 4) zalvb.quaternion.multiply((new Quaternion).setFromAxisAngle(new Vector3(zalvf[0], zalvf[1], zalvf[2]).normalize(), zalvf[3] * Math.PI / 180)); else if (zalve.tagName === "matrix" && zalvf.length >= 16) zalvb.matrix.fromArray(zalvf);
            }
        };
        var zalvbv = zalvc.getElementsByTagName("library_visual_scenes")[0];
        var zalvbw = zalvbv ? zalvf(zalvbv, "visual_scene") : null;
        var zalvbx = function(zalva) {
            var zalvb = zalva ? zalvf(zalva, "bind_material") : null;
            var zalvc = zalvb ? zalvf(zalvb, "technique_common") : null;
            var zalvd = zalvc ? zalve(zalvc, "instance_material") : [];
            if (zalvd.length) {
                var zalvg = (zalvd[0].getAttribute("target") || "").replace(/^#/, "");
                return zalvai[zalvg] || new PhongMaterial;
            }
            return new PhongMaterial;
        };
        var zalvby = function(zalva, zalvb, zalvc) {
            var zalvd = zalvc ? zalvas[zalvc].geometry : (zalvb.getAttribute("url") || "").replace(/^#/, "");
            var zalve = zalvan[zalvd];
            if (!zalve) return;
            var zalvf = zalvbx(zalvb);
            var zalvg = new Mesh(zalve.geometry, zalvf);
            if (zalvc) {
                var zalvh = zalvas[zalvc];
                var zalvi = [];
                var zalvj = [];
                for (var zalvk = 0; zalvk < zalvh.jointNames.length; zalvk++) {
                    var zalvl = zalvbr[zalvh.jointNames[zalvk]] || zalvbt.getObjectByName(zalvh.jointNames[zalvk]);
                    if (zalvl) zalvi.push(zalvl);
                    if (zalvh.inverseSource) {
                        var zalvm = zalvk * zalvh.inverseSource.stride;
                        zalvj.push((new Matrix4).fromArray(zalvh.inverseSource.array, zalvm));
                    }
                }
                if (zalvi.length) {
                    var zalvn = new Skeleton(zalvi, zalvj);
                    var zalvo = zalve.geometry.attributes.position.array.length / 3;
                    var zalvp = new Float32Array(zalvo * 4), zalvq = new Float32Array(zalvo * 4), zalvr = 0;
                    for (var zalvs = 0; zalvs < zalvo; zalvs++) {
                        var zalvt = zalvh.vcounts[zalvs] || 0;
                        var zalvu = [];
                        for (var zalvv = 0; zalvv < zalvt; zalvv++) {
                            var zalvw = zalvr + zalvv * zalvh.weightStride;
                            zalvu.push({
                                joint: zalvh.values[zalvw + zalvh.jointOffset] || 0,
                                weight: zalvh.weights ? zalvh.weights.array[zalvh.values[zalvw + zalvh.weightOffset] || 0] || 0 : 0
                            });
                        }
                        zalvr += zalvt * zalvh.weightStride;
                        zalvu.sort(function(zalva, zalvb) {
                            return zalvb.weight - zalva.weight;
                        });
                        var zalvx = 0;
                        for (var zalvy = 0; zalvy < 4; zalvy++) {
                            zalvp[zalvs * 4 + zalvy] = zalvu[zalvy] ? zalvu[zalvy].joint : 0;
                            zalvq[zalvs * 4 + zalvy] = zalvu[zalvy] ? zalvu[zalvy].weight : 0;
                            zalvx += zalvq[zalvs * 4 + zalvy];
                        }
                        if (zalvx) for (var zalvz = 0; zalvz < 4; zalvz++) zalvq[zalvs * 4 + zalvz] /= zalvx;
                    }
                    zalve.geometry.setAttribute("skinIndex", zalvp, 4);
                    zalve.geometry.setAttribute("skinWeight", zalvq, 4);
                    var zalvaa = new SkinnedMesh(zalve.geometry, zalvf);
                    zalvaa.bind(zalvn, zalva.matrixWorld);
                    zalvg = zalvaa;
                }
            }
            zalva.add(zalvg);
        };
        var zalvbz = function(zalva, zalvb) {
            var zalvc = new Node;
            zalvc.name = zalva.getAttribute("name") || zalva.getAttribute("id") || "node";
            zalvbr[zalva.getAttribute("id")] = zalvc;
            zalvbs[zalvc.name] = zalvc;
            zalvbu(zalva, zalvc);
            zalvb.add(zalvc);
            var zalvd = zalve(zalva, "instance_geometry");
            for (var zalvf = 0; zalvf < zalvd.length; zalvf++) zalvby(zalvc, zalvd[zalvf], null);
            var zalvg = zalve(zalva, "instance_controller");
            for (var zalvh = 0; zalvh < zalvg.length; zalvh++) zalvby(zalvc, zalvg[zalvh], (zalvg[zalvh].getAttribute("url") || "").replace(/^#/, ""));
            var zalvi = zalve(zalva, "node");
            for (var zalvj = 0; zalvj < zalvi.length; zalvj++) zalvbz(zalvi[zalvj], zalvc);
            return zalvc;
        };
        if (zalvbw) {
            var zalvca = zalve(zalvbw, "node");
            for (var zalvcb = 0; zalvcb < zalvca.length; zalvcb++) zalvbz(zalvca[zalvcb], zalvbt);
        }
        var zalvcc = [];
        var zalvcd = zalvc.getElementsByTagName("library_animations")[0];
        if (zalvcd) {
            var zalvce = zalve(zalvcd, "animation");
            for (var zalvcf = 0; zalvcf < zalvce.length; zalvcf++) {
                var zalvcg = zalvce[zalvcf];
                var zalvch = {};
                var zalvci = zalvcg.getElementsByTagName("sampler");
                for (var zalvcj = 0; zalvcj < zalvci.length; zalvcj++) {
                    var zalvck = zalvci[zalvcj], zalvcl = {};
                    var zalvcm = zalve(zalvck, "input");
                    for (var zalvcn = 0; zalvcn < zalvcm.length; zalvcn++) zalvcl[zalvcm[zalvcn].getAttribute("semantic")] = zalvn(zalvck, zalvcm[zalvcn].getAttribute("source"));
                    zalvch[zalvck.getAttribute("id")] = zalvcl;
                }
                var zalvco = [];
                var zalvcp = zalvcg.getElementsByTagName("channel");
                for (var zalvcq = 0; zalvcq < zalvcp.length; zalvcq++) {
                    var zalvcr = zalvcp[zalvcq], zalvx = zalvch[(zalvcr.getAttribute("source") || "").replace(/^#/, "")], zalvcs = (zalvcr.getAttribute("target") || "").split("/"), zalvct = zalvbr[zalvcs[0]] || zalvbs[zalvcs[0]];
                    if (!zalvx || !zalvct) continue;
                    var zalvcu = zalvx.OUTPUT || {
                        array: [],
                        stride: 1
                    }, zalvcv = zalvx.INPUT || {
                        array: [],
                        stride: 1
                    }, zalvag = zalvcs[1] || "", zalvcw = [], zalvcx = "vector3", zalvcy = zalvag;
                    if (zalvag.indexOf("rotate") === 0 || zalvag.indexOf("rotation") === 0) {
                        zalvcx = "quaternion";
                        var zalvcz = zalvcu.array;
                        var zalvda = zalvag.indexOf("X") >= 0 ? new Vector3(1, 0, 0) : zalvag.indexOf("Y") >= 0 ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
                        for (var zalvdb = 0; zalvdb < zalvcv.array.length; zalvdb++) {
                            var zalvdc = zalvcz[zalvdb * zalvcu.stride] || 0;
                            if (zalvag.indexOf("ANGLE") >= 0) zalvdc *= Math.PI / 180;
                            zalvcw.push.apply(zalvcw, [ 0, 0, 0, 1 ]);
                            var zalvdd = (new Quaternion).setFromAxisAngle(zalvda, zalvdc);
                            zalvcw.splice(zalvcw.length - 4, 4, zalvdd.x, zalvdd.y, zalvdd.z, zalvdd.w);
                        }
                        zalvcy = "quaternion";
                    } else {
                        var zalvde = zalvag.slice(-2);
                        var zalvdf = zalvde === ".X" || zalvde === ".Y" || zalvde === ".Z";
                        for (var zalvdg = 0; zalvdg < zalvcv.array.length; zalvdg++) {
                            var zalvdh = zalvag.indexOf("scale") === 0 ? zalvct.scale.clone() : zalvct.position.clone();
                            var zalvdi = zalvcu.stride;
                            if (zalvdi >= 3) {
                                zalvdh.x = zalvcu.array[zalvdg * zalvdi] || 0;
                                zalvdh.y = zalvcu.array[zalvdg * zalvdi + 1] || 0;
                                zalvdh.z = zalvcu.array[zalvdg * zalvdi + 2] || 0;
                            } else if (zalvdf) {
                                var zalvdj = zalvcu.array[zalvdg * zalvdi] || 0;
                                if (zalvde === ".X") zalvdh.x = zalvdj; else if (zalvde === ".Y") zalvdh.y = zalvdj; else zalvdh.z = zalvdj;
                            }
                            zalvcw.push(zalvdh.x, zalvdh.y, zalvdh.z);
                        }
                        zalvcy = zalvag.indexOf("scale") === 0 ? "scale" : "position";
                    }
                    zalvco.push(new AnimationTrack(zalvct.name + "." + zalvcy, zalvcv.array, zalvcw, zalvcx));
                }
                if (zalvco.length) zalvcc.push(new AnimationClip(zalvcg.getAttribute("id") || "animation" + zalvcf, undefined, zalvco));
            }
        }
        zalvbt.userData.animations = zalvcc;
        zalvbt.userData.materials = zalvai;
        zalvbt.userData.controllers = zalvas;
        return zalvbt;
    }
    parsePLY(zalva) {
        var zalvb = faoxomdecodeply(zalva);
        return new Mesh(zalvb, new StandardMaterial(zalvb.attributes.color ? {
            vertexColors: true
        } : {}));
    }
    parseSVG(zalva) {
        return (new SVGLoader).parse(zalva);
    }
    parseSTL(zalva) {
        if (zalva instanceof ArrayBuffer && zalva.byteLength >= 84 && 84 + new DataView(zalva).getUint32(80, true) * 50 !== zalva.byteLength) return this.parseSTL(faoxombytestotext(new Uint8Array(zalva)));
        if (typeof zalva === "string") {
            var zalvb = [], zalvc = [], zalvd = [], zalve = new Vector3(0, 1, 0), zalvf = zalva.split(/\r?\n/);
            for (var zalvg = 0; zalvg < zalvf.length; zalvg++) {
                var zalvh = zalvf[zalvg].trim();
                if (zalvh.indexOf("facet normal") === 0) {
                    var zalvi = zalvh.split(/\s+/);
                    zalve.set(parseFloat(zalvi[2]), parseFloat(zalvi[3]), parseFloat(zalvi[4]));
                }
                if (zalvh.indexOf("vertex") === 0) {
                    var zalvj = zalvh.split(/\s+/);
                    zalvb.push(parseFloat(zalvj[1]), parseFloat(zalvj[2]), parseFloat(zalvj[3]));
                    zalvc.push(zalve.x, zalve.y, zalve.z);
                    zalvd.push(zalvd.length);
                }
            }
            return new Mesh(faoxomgeometry(zalvb, zalvc, null, zalvd), new StandardMaterial);
        }
        if (!(zalva instanceof ArrayBuffer) || zalva.byteLength < 84) throw new Error("Invalid STL");
        var zalvk = new DataView(zalva);
        var zalvl = zalvk.getUint32(80, true);
        var zalvm = [], zalvn = [], zalvo = [];
        for (var zalvp = 0; zalvp < zalvl; zalvp++) {
            var zalvq = 84 + zalvp * 50;
            var zalvr = zalvk.getFloat32(zalvq, true), zalvs = zalvk.getFloat32(zalvq + 4, true), zalvt = zalvk.getFloat32(zalvq + 8, true);
            for (var zalvu = 0; zalvu < 3; zalvu++) {
                var zalvv = zalvq + 12 + zalvu * 12;
                zalvm.push(zalvk.getFloat32(zalvv, true), zalvk.getFloat32(zalvv + 4, true), zalvk.getFloat32(zalvv + 8, true));
                zalvn.push(zalvr, zalvs, zalvt);
                zalvo.push(zalvo.length);
            }
        }
        return new Mesh(faoxomgeometry(zalvm, zalvn, null, zalvo), new StandardMaterial);
    }
    parseMTL(zalva, zalvb) {
        var zalvc = {};
        var zalvd = null;
        var zalve = zalvb && zalvb.slice(0, zalvb.lastIndexOf("/") + 1) || "";
        var zalvf = zalva.split(/\r?\n/);
        for (var zalvg = 0; zalvg < zalvf.length; zalvg++) {
            var zalvh = zalvf[zalvg].trim().split(/\s+/);
            var zalvi = zalvh.shift();
            if (zalvi === "newmtl") {
                zalvd = {
                    name: zalvh.join(" "),
                    options: {}
                };
                zalvc[zalvd.name] = zalvd;
            } else if (zalvd && zalvi === "Kd") zalvd.options.color = new Color(parseFloat(zalvh[0]), parseFloat(zalvh[1]), parseFloat(zalvh[2])); else if (zalvd && zalvi === "Ks") zalvd.options.specular = new Color(parseFloat(zalvh[0]), parseFloat(zalvh[1]), parseFloat(zalvh[2])); else if (zalvd && zalvi === "Ns") zalvd.options.shininess = parseFloat(zalvh[0]); else if (zalvd && (zalvi === "d" || zalvi === "Tr")) {
                zalvd.options.opacity = zalvi === "Tr" ? 1 - parseFloat(zalvh[0]) : parseFloat(zalvh[0]);
                zalvd.options.transparent = zalvd.options.opacity < 1;
            } else if (zalvd && (zalvi === "map_Kd" || zalvi === "map_Bump" || zalvi === "bump" || zalvi === "map_Pr" || zalvi === "map_Pm")) {
                var zalvj = zalve + zalvh.join(" ");
                if (zalvi === "map_Kd") zalvd.options.diffuseMap = new Texture(zalvj, {
                    flipY: false
                }); else if (zalvi === "map_Bump" || zalvi === "bump") zalvd.options.normalMap = new Texture(zalvj, {
                    flipY: false
                }); else if (zalvi === "map_Pr") zalvd.options.roughnessMap = new Texture(zalvj, {
                    flipY: false
                }); else zalvd.options.metalnessMap = new Texture(zalvj, {
                    flipY: false
                });
            }
        }
        return zalvc;
    }
    decodeDataUri(zalva) {
        var zalvb = zalva.indexOf(",");
        var zalvc = zalva.slice(0, zalvb);
        var zalvd = zalva.slice(zalvb + 1);
        if (zalvc.indexOf(";base64") !== -1) {
            var zalve = typeof atob === "function" ? atob(zalvd) : Buffer.from(zalvd, "base64").toString("binary");
            var zalvf = new Uint8Array(zalve.length);
            for (var zalvg = 0; zalvg < zalve.length; zalvg++) zalvf[zalvg] = zalve.charCodeAt(zalvg);
            return zalvf.buffer;
        }
        return (new TextEncoder).encode(decodeURIComponent(zalvd)).buffer;
    }
    parseGLB(zalva, zalvb) {
        var zalvc = new DataView(zalva);
        if (zalvc.getUint32(0, true) !== 1179937895) throw new Error("Invalid GLB");
        var zalvd = 12;
        var zalve = null;
        var zalvf = [];
        while (zalvd < zalvc.byteLength) {
            var zalvg = zalvc.getUint32(zalvd, true);
            var zalvh = zalvc.getUint32(zalvd + 4, true);
            var zalvi = zalva.slice(zalvd + 8, zalvd + 8 + zalvg);
            if (zalvh === 1313821514) zalve = JSON.parse((new TextDecoder).decode(new Uint8Array(zalvi)).replace(/[\u0000 ]+$/, "")); else if (zalvh === 5130562) zalvf.push(zalvi);
            zalvd += 8 + zalvg;
        }
        return this.parseGLTF(zalve, zalvb, zalvf);
    }
    async parseGLTF(zalva, zalvb, zalvc) {
        var zalvd = zalvb.slice(0, zalvb.lastIndexOf("/") + 1);
        var zalve = [];
        for (var zalvf = 0; zalvf < (zalva.buffers || []).length; zalvf++) {
            var zalvg = zalva.buffers[zalvf].uri;
            if (!zalvg && zalvc && zalvc[zalvf]) zalve.push(zalvc[zalvf]); else if (zalvg && zalvg.indexOf("data:") === 0) zalve.push(this.decodeDataUri(zalvg)); else if (zalvg) zalve.push(await fetch(zalvd + zalvg).then(function(zalva) {
                return zalva.arrayBuffer();
            })); else zalve.push(new ArrayBuffer(0));
        }
        await this.prepareMeshopt(zalva, zalve);
        await this.prepareDraco(zalva, zalve);
        var zalvh = {
            5120: Int8Array,
            5121: Uint8Array,
            5122: Int16Array,
            5123: Uint16Array,
            5125: Uint32Array,
            5126: Float32Array
        };
        var zalvi = {
            SCALAR: 1,
            VEC2: 2,
            VEC3: 3,
            VEC4: 4,
            MAT2: 4,
            MAT3: 9,
            MAT4: 16
        };
        var zalvj = function(zalvb) {
            var zalvc = zalva.accessors[zalvb];
            var zalvd = zalva.bufferViews[zalvc.bufferView];
            var zalvf = zalve[zalvd.buffer];
            var zalvg = zalvc.count;
            var zalvj = zalvi[zalvc.type];
            var zalvk = zalvh[zalvc.componentType];
            var zalvl = (zalvd.byteOffset || 0) + (zalvc.byteOffset || 0);
            var zalvm = zalvd.byteStride || zalvk.BYTES_PER_ELEMENT * zalvj;
            var zalvn;
            if (zalvm === zalvk.BYTES_PER_ELEMENT * zalvj) zalvn = new zalvk(zalvf, zalvl, zalvg * zalvj); else {
                zalvn = new zalvk(zalvg * zalvj);
                var zalvo = new DataView(zalvf);
                for (var zalvp = 0; zalvp < zalvg; zalvp++) for (var zalvq = 0; zalvq < zalvj; zalvq++) {
                    var zalvr = zalvl + zalvp * zalvm + zalvq * zalvk.BYTES_PER_ELEMENT;
                    zalvn[zalvp * zalvj + zalvq] = zalvk === Float32Array ? zalvo.getFloat32(zalvr, true) : zalvk === Uint32Array ? zalvo.getUint32(zalvr, true) : zalvk === Uint16Array ? zalvo.getUint16(zalvr, true) : zalvk === Int16Array ? zalvo.getInt16(zalvr, true) : zalvk === Uint8Array ? zalvo.getUint8(zalvr) : zalvk === Int8Array ? zalvo.getInt8(zalvr) : 0;
                }
            }
            return {
                array: zalvn,
                itemSize: zalvj,
                normalized: !!zalvc.normalized,
                count: zalvg
            };
        };
        var zalvk = function(zalvb) {
            if (!zalvb) return null;
            if (zalvb.uri) return zalvb.uri.indexOf("data:") === 0 ? zalvb.uri : zalvd + zalvb.uri;
            if (zalvb.bufferView !== undefined) {
                var zalvc = zalva.bufferViews[zalvb.bufferView];
                var zalvf = zalve[zalvc.buffer].slice(zalvc.byteOffset || 0, (zalvc.byteOffset || 0) + zalvc.byteLength);
                if (typeof URL !== "undefined" && URL.createObjectURL) return URL.createObjectURL(new Blob([ zalvf ], {
                    type: zalvb.mimeType || "application/octet-stream"
                }));
            }
            return null;
        };
        var zalvl = function(zalva) {
            if (zalva === "POSITION") return "position";
            if (zalva === "NORMAL") return "normal";
            if (zalva === "TANGENT") return "tangent";
            if (zalva === "TEXCOORD_0") return "uv";
            if (zalva.indexOf("TEXCOORD_") === 0) return "uv" + zalva.slice(9);
            if (zalva === "COLOR_0") return "color";
            if (zalva.indexOf("COLOR_") === 0) return "color" + zalva.slice(6);
            if (zalva === "JOINTS_0") return "skinIndex";
            if (zalva === "WEIGHTS_0") return "skinWeight";
            return zalva.toLowerCase().replace(/[^a-z0-9_$]/g, "_");
        };
        var zalvm = function(zalva, zalvb) {
            var zalvc = Object.assign({
                flipY: false
            }, zalvb || {}), zalvd = zalva && zalva.extensions && zalva.extensions.KHR_texture_transform;
            zalvc.channel = zalva && zalva.texCoord !== undefined ? zalva.texCoord : 0;
            if (zalvd) {
                if (zalvd.texCoord !== undefined) zalvc.channel = zalvd.texCoord;
                if (zalvd.offset) zalvc.offset = new Vector2(zalvd.offset[0] || 0, zalvd.offset[1] || 0);
                if (zalvd.scale) zalvc.repeat = new Vector2(zalvd.scale[0] === undefined ? 1 : zalvd.scale[0], zalvd.scale[1] === undefined ? 1 : zalvd.scale[1]);
                if (zalvd.rotation !== undefined) zalvc.rotation = zalvd.rotation;
            }
            return zalvc;
        };
        var zalvn = function(zalvb) {
            var zalvc = zalva.materials && zalva.materials[zalvb];
            if (!zalvc) return new StandardMaterial({
                color: 16777215,
                vertexColors: true
            });
            var zalvd = zalvc.extensions || {};
            var zalve = zalvc.pbrMetallicRoughness || {};
            var zalvf = zalvd.KHR_materials_pbrSpecularGlossiness || {};
            var zalvg = zalve.baseColorFactor || zalvf.diffuseFactor || [ 1, 1, 1, 1 ];
            var zalvh = zalvc.alphaMode || "OPAQUE";
            var zalvi = zalvc.alphaCutoff === undefined ? .5 : zalvc.alphaCutoff;
            var zalvj = {
                color: new Color(zalvg[0], zalvg[1], zalvg[2]),
                opacity: zalvg[3],
                transparent: zalvh === "BLEND" || zalvg[3] < 1,
                alphaTest: zalvh === "MASK" ? zalvi : 0,
                side: zalvc.doubleSided ? DoubleSide : FrontSide,
                vertexColors: true,
                metalness: zalve.metallicFactor === undefined ? 0 : zalve.metallicFactor,
                roughness: zalve.roughnessFactor === undefined ? zalvf.glossinessFactor === undefined ? .5 : 1 - zalvf.glossinessFactor : zalve.roughnessFactor
            };
            var zalvl = function(zalvb, zalvc) {
                if (!zalvb || !zalva.images || !zalva.textures || !zalva.textures[zalvb.index]) return null;
                var zalvd = zalva.textures[zalvb.index];
                var zalve = zalvd.extensions && zalvd.extensions.KHR_texture_basisu;
                var zalvf = zalve && zalve.source !== undefined ? zalve.source : zalvd.source;
                var zalvg = zalva.images[zalvf];
                var zalvh = zalvg ? new Texture(zalvk(zalvg), zalvm(zalvb, zalvc)) : null;
                if (zalvh && zalve) {
                    zalvh.compressedSource = zalvk(zalvg);
                    zalvh.compressedTexture = true;
                    zalvh.colorSpace = zalvc && zalvc.colorSpace ? zalvc.colorSpace : "srgb";
                }
                return zalvh;
            };
            if (zalve.baseColorTexture) zalvj.diffuseMap = zalvl(zalve.baseColorTexture, {
                flipY: false,
                colorSpace: "srgb"
            });
            if (zalve.metallicRoughnessTexture) {
                var zalvn = zalvl(zalve.metallicRoughnessTexture, {
                    flipY: false,
                    colorSpace: "linear"
                });
                zalvj.roughnessMap = zalvn;
                zalvj.metalnessMap = zalvn;
            }
            if (zalvc.normalTexture) {
                zalvj.normalMap = zalvl(zalvc.normalTexture, {
                    flipY: false,
                    colorSpace: "linear"
                });
                zalvj.normalScale = new Vector2(zalvc.normalTexture.scale === undefined ? 1 : zalvc.normalTexture.scale, zalvc.normalTexture.scale === undefined ? 1 : zalvc.normalTexture.scale);
            }
            if (zalvc.occlusionTexture) zalvj.aoMap = zalvl(zalvc.occlusionTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvc.emissiveTexture) zalvj.emissiveMap = zalvl(zalvc.emissiveTexture, {
                flipY: false,
                colorSpace: "srgb"
            });
            if (zalvc.emissiveFactor) zalvj.emissive = new Color(zalvc.emissiveFactor[0] || 0, zalvc.emissiveFactor[1] || 0, zalvc.emissiveFactor[2] || 0);
            if (zalvf.specularFactor) zalvj.specular = new Color(zalvf.specularFactor[0] || 0, zalvf.specularFactor[1] || 0, zalvf.specularFactor[2] || 0);
            var zalvo = zalvc.unlit || zalvd.KHR_materials_unlit ? new BasicMaterial(zalvj) : new StandardMaterial(zalvj);
            var zalvp = zalvd.KHR_materials_clearcoat || {};
            var zalvq = zalvd.KHR_materials_sheen || {};
            var zalvr = zalvd.KHR_materials_transmission || {};
            var zalvs = zalvd.KHR_materials_iridescence || {};
            var zalvt = zalvd.KHR_materials_anisotropy || {};
            zalvo.name = zalvc.name || "material" + (zalvb === undefined ? "" : zalvb);
            zalvo.alphaMode = zalvh;
            zalvo.alphaCutoff = zalvi;
            zalvo.doubleSided = !!zalvc.doubleSided;
            zalvo.clearcoat = zalvp.clearcoatFactor || 0;
            zalvo.clearcoatRoughness = zalvp.clearcoatRoughnessFactor === undefined ? .03 : zalvp.clearcoatRoughnessFactor;
            zalvo.sheen = zalvq.sheenRoughnessFactor || 0;
            zalvo.sheenColor = zalvq.sheenColorFactor || [ 0, 0, 0 ];
            zalvo.transmission = zalvr.transmissionFactor || 0;
            zalvo.ior = zalvd.KHR_materials_ior && zalvd.KHR_materials_ior.ior ? zalvd.KHR_materials_ior.ior : 1.5;
            zalvo.iridescence = zalvs.iridescenceFactor || 0;
            zalvo.iridescenceIor = zalvs.iridescenceIor || 1.3;
            zalvo.iridescenceThicknessMinimum = zalvs.iridescenceThicknessMinimum || 100;
            zalvo.iridescenceThicknessMaximum = zalvs.iridescenceThicknessMaximum || 400;
            zalvo.anisotropy = zalvt.anisotropyStrength || 0;
            zalvo.anisotropyRotation = zalvt.anisotropyRotation || 0;
            var zalvu = zalvd.KHR_materials_specular || {};
            zalvo.specularIntensity = zalvu.specularFactor === undefined ? 1 : zalvu.specularFactor;
            zalvo.specularColor = zalvu.specularColorFactor ? new Color(zalvu.specularColorFactor[0], zalvu.specularColorFactor[1], zalvu.specularColorFactor[2]) : new Color(16777215);
            zalvo.emissiveStrength = zalvd.KHR_materials_emissive_strength && zalvd.KHR_materials_emissive_strength.emissiveStrength !== undefined ? zalvd.KHR_materials_emissive_strength.emissiveStrength : 1;
            zalvo.occlusionStrength = zalvc.occlusionTexture && zalvc.occlusionTexture.strength !== undefined ? zalvc.occlusionTexture.strength : 1;
            if (zalvo.emissiveStrength !== 1) zalvo.emissive.multiplyScalar(zalvo.emissiveStrength);
            if (zalvp.clearcoatTexture) zalvo.clearcoatMap = zalvl(zalvp.clearcoatTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvp.clearcoatRoughnessTexture) zalvo.clearcoatRoughnessMap = zalvl(zalvp.clearcoatRoughnessTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvp.clearcoatNormalTexture) zalvo.clearcoatNormalMap = zalvl(zalvp.clearcoatNormalTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvq.sheenColorTexture) zalvo.sheenColorMap = zalvl(zalvq.sheenColorTexture, {
                flipY: false,
                colorSpace: "srgb"
            });
            if (zalvq.sheenRoughnessTexture) zalvo.sheenRoughnessMap = zalvl(zalvq.sheenRoughnessTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvr.transmissionTexture) zalvo.transmissionMap = zalvl(zalvr.transmissionTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvs.iridescenceTexture) zalvo.iridescenceMap = zalvl(zalvs.iridescenceTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            if (zalvt.anisotropyTexture) zalvo.anisotropyMap = zalvl(zalvt.anisotropyTexture, {
                flipY: false,
                colorSpace: "linear"
            });
            zalvo.volume = zalvd.KHR_materials_volume || null;
            zalvo.thickness = zalvo.volume && zalvo.volume.thicknessFactor !== undefined ? zalvo.volume.thicknessFactor : 0;
            zalvo.attenuationDistance = zalvo.volume && zalvo.volume.attenuationDistance !== undefined ? zalvo.volume.attenuationDistance : Infinity;
            zalvo.attenuationColor = zalvo.volume && zalvo.volume.attenuationColor ? new Color(zalvo.volume.attenuationColor[0], zalvo.volume.attenuationColor[1], zalvo.volume.attenuationColor[2]) : new Color(16777215);
            zalvo.dispersion = zalvd.KHR_materials_dispersion && zalvd.KHR_materials_dispersion.dispersion !== undefined ? zalvd.KHR_materials_dispersion.dispersion : 0;
            zalvo.variants = zalvd.KHR_materials_variants || null;
            zalvo.extras = zalvc.extras || null;
            return zalvo;
        };
        var zalvo = function(zalva) {
            var zalvb = new Geometry;
            var zalvc = zalva.attributes || {};
            if (zalva._decoded) {
                for (var zalvd in zalva._decoded.attributes) zalvb.setAttribute(zalvl(zalvd), zalva._decoded.attributes[zalvd]);
                zalvb.setIndex(zalva._decoded.index);
                zalvb.computeBounds();
                zalvb.userData.gltfPrimitive = zalva;
                return zalvb;
            }
            for (var zalve in zalvc) zalvb.setAttribute(zalvl(zalve), zalvj(zalvc[zalve]));
            var zalvf = zalvb.attributes.position;
            var zalvg = zalvf ? zalvf.array.length / zalvf.itemSize : 0;
            if (zalva.targets) {
                var zalvh = [ "position", "normal", "tangent" ];
                for (var zalvi = 0; zalvi < zalvh.length; zalvi++) {
                    var zalvk = zalvh[zalvi], zalvm = [], zalvn = zalvk === "position" || zalvk === "normal" ? 3 : 4;
                    for (var zalvo = 0; zalvo < zalva.targets.length; zalvo++) {
                        var zalvp = zalva.targets[zalvo] || {}, zalvq = zalvp[zalvk === "position" ? "POSITION" : zalvk === "normal" ? "NORMAL" : "TANGENT"];
                        zalvm.push(zalvq === undefined ? {
                            array: new Float32Array(zalvg * zalvn),
                            itemSize: zalvn,
                            normalized: false
                        } : zalvj(zalvq));
                    }
                    if (zalvm.length) zalvb.setMorphAttribute(zalvk, zalvm);
                }
                zalvb.morphTargetsRelative = true;
            }
            if (zalva.indices !== undefined) zalvb.setIndex(zalvj(zalva.indices));
            if (!zalvb.attributes.normal) zalvb.computeVertexNormals();
            if (!zalvb.attributes.tangent && zalvb.attributes.normal && zalvb.attributes.uv) zalvb.computeTangents();
            zalvb.computeBounds();
            zalvb.userData.gltfPrimitive = zalva;
            zalvb.userData.morphTargetsRelative = !!zalva.targets;
            return zalvb;
        };
        var zalvp = (zalva.meshes || []).map(function(zalva, zalvb) {
            return (zalva.primitives || []).map(function(zalva, zalvc) {
                return {
                    geometry: zalvo(zalva),
                    material: zalvn(zalva.material),
                    materialIndex: zalva.material === undefined ? 0 : zalva.material,
                    mode: zalva.mode || 4,
                    meshIndex: zalvb,
                    primitiveIndex: zalvc,
                    primitive: zalva
                };
            });
        });
        var zalvq = {};
        var zalvr = {};
        var zalvs = {};
        for (var zalvt = 0; zalvt < (zalva.skins || []).length; zalvt++) for (var zalvu = 0; zalvu < zalva.skins[zalvt].joints.length; zalvu++) zalvs[zalva.skins[zalvt].joints[zalvu]] = true;
        var zalvv = zalva.nodes || [];
        var zalvw = new Array(zalvv.length);
        for (var zalvx = 0; zalvx < zalvv.length; zalvx++) {
            var zalvy = zalvv[zalvx], zalvz = zalvs[zalvx] ? new Bone : new Node;
            zalvz.name = zalvy.name || "node" + zalvx;
            zalvz.userData.gltfNode = zalvy;
            if (zalvy.matrix) zalvz.matrix.fromArray(zalvy.matrix); else {
                if (zalvy.translation) zalvz.position.fromArray(zalvy.translation);
                if (zalvy.rotation) zalvz.quaternion.fromArray(zalvy.rotation);
                if (zalvy.scale) zalvz.scale.fromArray(zalvy.scale);
            }
            if (zalvy.mesh !== undefined) {
                var zalvaa = zalvp[zalvy.mesh] || [], zalvab = [], zalvac = [], zalvad = zalvy.weights || zalva.meshes[zalvy.mesh] && zalva.meshes[zalvy.mesh].weights || [];
                for (var zalvae = 0; zalvae < zalvaa.length; zalvae++) {
                    var zalvaf = zalvaa[zalvae], zalvag = zalvy.skin !== undefined ? new SkinnedMesh(zalvaf.geometry, zalvaf.material) : new Mesh(zalvaf.geometry, zalvaf.material);
                    zalvag.name = zalvz.name + (zalvaa.length > 1 ? ":primitive" + zalvae : "");
                    zalvag.userData.gltfMesh = zalvaf.meshIndex;
                    zalvag.userData.gltfPrimitive = zalvaf.primitiveIndex;
                    zalvag.materialIndex = zalvaf.materialIndex;
                    if (zalvaf.geometry.morphAttributes && zalvaf.geometry.morphAttributes.position) {
                        zalvag.morphTargetInfluences = new Array(zalvaf.geometry.morphAttributes.position.length).fill(0);
                        for (var zalvah = 0; zalvah < zalvag.morphTargetInfluences.length; zalvah++) zalvag.morphTargetInfluences[zalvah] = zalvad[zalvah] || 0;
                        zalvag.morphTargetDictionary = {};
                        var zalvai = zalva.meshes[zalvy.mesh] && zalva.meshes[zalvy.mesh].extras && zalva.meshes[zalvy.mesh].extras.targetNames;
                        if (zalvai) for (var zalvaj = 0; zalvaj < zalvai.length; zalvaj++) zalvag.morphTargetDictionary[zalvai[zalvaj]] = zalvaj;
                    }
                    var zalvak = zalva.extensions && zalva.extensions.KHR_materials_variants && zalva.extensions.KHR_materials_variants.variants || [];
                    var zalval = zalvaf.primitive && zalvaf.primitive.extensions && zalvaf.primitive.extensions.KHR_materials_variants;
                    if (zalval && zalval.mappings) {
                        zalvag.userData.materialVariants = {
                            default: zalvaf.material
                        };
                        for (var zalvam = 0; zalvam < zalval.mappings.length; zalvam++) {
                            var zalvan = zalval.mappings[zalvam];
                            var zalvao = zalvn(zalvan.material);
                            for (var zalvap = 0; zalvap < (zalvan.variants || []).length; zalvap++) {
                                var zalvaq = zalvak[zalvan.variants[zalvap]] && zalvak[zalvan.variants[zalvap]].name;
                                if (zalvaq) zalvag.userData.materialVariants[zalvaq] = zalvao;
                            }
                        }
                    }
                    zalvab.push(zalvag);
                    zalvac.push(zalvaf.material);
                    if (zalvaf.materialIndex !== undefined && zalvr[zalvaf.materialIndex] === undefined) zalvr[zalvaf.materialIndex] = zalvaf.material;
                }
                zalvz.userData.meshes = zalvab;
                zalvz.userData.materials = zalvac;
                zalvz.userData.weights = zalvad.slice ? zalvad.slice() : zalvad;
            }
            if (zalvy.camera !== undefined && zalva.cameras && zalva.cameras[zalvy.camera]) {
                var zalvar = zalva.cameras[zalvy.camera];
                var zalvas = null;
                if (zalvar.type === "perspective" && zalvar.perspective) {
                    var zalvat = zalvar.perspective;
                    var zalvau = (zalvat.yfov || .6) * 180 / Math.PI;
                    zalvas = new PerspectiveCamera(zalvau, zalvat.aspectRatio || 1, zalvat.znear || .1, zalvat.zfar || 1e3);
                } else if (zalvar.type === "orthographic" && zalvar.orthographic) {
                    var zalvav = zalvar.orthographic;
                    zalvas = new OrthographicCamera(-zalvav.xmag || -1, zalvav.xmag || 1, zalvav.ymag || 1, -zalvav.ymag || -1, zalvav.znear || .1, zalvav.zfar || 1e3);
                }
                if (zalvas) {
                    zalvas.name = zalvar.name || zalvz.name + "_Camera";
                    zalvz.add(zalvas);
                    zalvz.userData.camera = zalvas;
                }
            }
            var zalvaw = zalva.extensions && zalva.extensions.KHR_lights_punctual && zalva.extensions.KHR_lights_punctual.lights;
            var zalvax = zalvy.extensions && zalvy.extensions.KHR_lights_punctual;
            if (zalvaw && zalvax && zalvax.light !== undefined) {
                var zalvay = zalvaw[zalvax.light];
                if (zalvay) {
                    var zalvaz = zalvay.color ? new Color(zalvay.color[0], zalvay.color[1], zalvay.color[2]) : new Color(16777215);
                    var zalvba = zalvay.intensity !== undefined ? zalvay.intensity : 1;
                    var zalvbb = zalvba > 100 ? zalvba / 1e3 : zalvba;
                    var zalvbc = null;
                    if (zalvay.type === "directional") zalvbc = new DirectionalLight(zalvaz, zalvbb); else if (zalvay.type === "point") zalvbc = new PointLight(zalvaz, zalvbb, zalvay.range || 0); else if (zalvay.type === "spot") {
                        var zalvbd = zalvay.spot || {};
                        zalvbc = new SpotLight(zalvaz, zalvbb, zalvay.range || 0, zalvbd.outerConeAngle || Math.PI / 4, zalvbd.innerConeAngle ? 1 - zalvbd.innerConeAngle / (zalvbd.outerConeAngle || 1) : 0);
                    }
                    if (zalvbc) {
                        zalvbc.name = zalvay.name || zalvz.name + "_Light";
                        zalvz.add(zalvbc);
                        zalvz.userData.light = zalvbc;
                        zalvq["light" + zalvax.light] = zalvbc;
                    }
                }
            }
            zalvw[zalvx] = zalvz;
        }
        for (var zalvbe = 0; zalvbe < zalvv.length; zalvbe++) {
            var zalvbf = zalvw[zalvbe], zalvbg = zalvv[zalvbe].children || [];
            for (var zalvbh = 0; zalvbh < zalvbg.length; zalvbh++) if (zalvw[zalvbg[zalvbh]]) zalvbf.add(zalvw[zalvbg[zalvbh]]);
            var zalvbi = zalvbf.userData.meshes || [];
            for (var zalvae = 0; zalvae < zalvbi.length; zalvae++) zalvbf.add(zalvbi[zalvae]);
        }
        var zalvbj = new Group;
        zalvbj.name = zalva.asset && zalva.asset.generator ? zalva.asset.generator : "gltf";
        zalvbj.userData.gltfAsset = zalva.asset || {};
        zalvbj.userData.gltf = zalva;
        var zalvbk = zalva.scenes && zalva.scenes[zalva.scene || 0];
        var zalvbl = zalvbk ? zalvbk.nodes : [];
        for (var zalvbm = 0; zalvbm < zalvbl.length; zalvbm++) if (zalvw[zalvbl[zalvbm]]) zalvbj.add(zalvw[zalvbl[zalvbm]]);
        zalvbj.updateMatrixWorld(true);
        for (var zalvbn = 0; zalvbn < (zalva.skins || []).length; zalvbn++) {
            var zalvbo = zalva.skins[zalvbn], zalvbp = zalvbo.joints.map(function(zalva) {
                return zalvw[zalva];
            }), zalvbq = [];
            if (zalvbo.inverseBindMatrices !== undefined) {
                var zalvbr = zalvj(zalvbo.inverseBindMatrices);
                for (var zalvbs = 0; zalvbs < zalvbo.joints.length; zalvbs++) zalvbq.push((new Matrix4).fromArray(zalvbr.array, zalvbs * 16));
            }
            var zalvbt = new Skeleton(zalvbp, zalvbq);
            zalvbt.name = zalvbo.name || "skeleton" + zalvbn;
            for (var zalvbu = 0; zalvbu < zalvw.length; zalvbu++) {
                var zalvbv = zalvw[zalvbu] && zalvw[zalvbu].userData.meshes || [];
                for (var zalvae = 0; zalvae < zalvbv.length; zalvae++) if (zalvbv[zalvae] instanceof SkinnedMesh && zalvv[zalvbu].skin === zalvbn) {
                    zalvbv[zalvae].bind(zalvbt, zalvw[zalvbu].matrixWorld);
                    zalvbv[zalvae].userData.gltfSkin = zalvbn;
                }
            }
        }
        var zalvbw = [];
        for (var zalvbx = 0; zalvbx < (zalva.animations || []).length; zalvbx++) {
            var zalvby = zalva.animations[zalvbx], zalvbz = [];
            for (var zalvca = 0; zalvca < zalvby.channels.length; zalvca++) {
                var zalvcb = zalvby.channels[zalvca], zalvcc = zalvby.samplers[zalvcb.sampler], zalvcd = zalvj(zalvcc.input).array, zalvce = zalvj(zalvcc.output).array, zalvcf = zalvcb.target.path, zalvcg = zalvw[zalvcb.target.node], zalvch = zalvcf === "rotation" ? "quaternion" : zalvcf === "weights" ? "array" : "vector3";
                var zalvci = zalvcb.target.extensions && zalvcb.target.extensions.KHR_animation_pointer;
                if (zalvci && zalvci.pointer) {
                    var zalvcj = zalvci.pointer.split("/"), zalvck = [];
                    for (var zalvcl = 0; zalvcl < zalvcj.length; zalvcl++) if (zalvcj[zalvcl]) zalvck.push(zalvcj[zalvcl]);
                    if (zalvck[0] === "nodes" && zalvck.length >= 3 && (zalvck[2] === "translation" || zalvck[2] === "rotation" || zalvck[2] === "scale" || zalvck[2] === "weights")) {
                        var zalvcm = null;
                        if (/^[0-9]+$/.test(zalvck[1])) zalvcm = zalvw[Number(zalvck[1])]; else {
                            for (var zalvcn = 0; zalvcn < zalvv.length; zalvcn++) if (zalvv[zalvcn] && zalvv[zalvcn].name === zalvck[1]) {
                                zalvcm = zalvw[zalvcn];
                                break;
                            }
                        }
                        if (zalvcm) {
                            var zalvco = zalvck[2];
                            zalvbz.push(new AnimationTrack((zalvcm.name || "node") + "." + (zalvco === "translation" ? "position" : zalvco), zalvcd, zalvce, zalvco === "rotation" ? "quaternion" : zalvco === "weights" ? "array" : "vector3", zalvcc.interpolation || "LINEAR"));
                        }
                        continue;
                    }
                    if (zalvck[0] === "materials" && zalvck.length >= 3) {
                        var zalvcp = null;
                        if (/^[0-9]+$/.test(zalvck[1])) zalvcp = Number(zalvck[1]); else {
                            for (var zalvcq = 0; zalvcq < (zalva.materials || []).length; zalvcq++) if (zalva.materials[zalvcq] && zalva.materials[zalvcq].name === zalvck[1]) {
                                zalvcp = zalvcq;
                                break;
                            }
                        }
                        if (zalvcp !== null) {
                            if (zalvr[zalvcp] === undefined) zalvr[zalvcp] = zalvn(zalvcp);
                            if (zalvq["material" + zalvcp] === undefined) zalvq["material" + zalvcp] = zalvr[zalvcp];
                            var zalvcr = "userData.pointerTargets.material" + zalvcp + ".", zalvcs = zalvck[zalvck.length - 1];
                            if (zalvcs === "baseColorFactor" && zalvce.length >= zalvcd.length * 4) {
                                var zalvct = new Array(zalvcd.length * 3), zalvcu = new Array(zalvcd.length);
                                for (var zalvcv = 0; zalvcv < zalvcd.length; zalvcv++) {
                                    zalvct[zalvcv * 3] = zalvce[zalvcv * 4];
                                    zalvct[zalvcv * 3 + 1] = zalvce[zalvcv * 4 + 1];
                                    zalvct[zalvcv * 3 + 2] = zalvce[zalvcv * 4 + 2];
                                    zalvcu[zalvcv] = zalvce[zalvcv * 4 + 3];
                                }
                                zalvbz.push(new AnimationTrack(zalvcr + "color", zalvcd, zalvct, "color", zalvcc.interpolation || "LINEAR"));
                                zalvbz.push(new AnimationTrack(zalvcr + "opacity", zalvcd, zalvcu, "number", zalvcc.interpolation || "LINEAR"));
                            } else if (zalvcs === "metallicFactor" || zalvcs === "roughnessFactor" || zalvcs === "alphaCutoff") zalvbz.push(new AnimationTrack(zalvcr + (zalvcs === "metallicFactor" ? "metalness" : zalvcs === "roughnessFactor" ? "roughness" : "alphaCutoff"), zalvcd, zalvce, "number", zalvcc.interpolation || "LINEAR")); else if (zalvcs === "emissiveFactor") zalvbz.push(new AnimationTrack(zalvcr + "emissive", zalvcd, zalvce, "color", zalvcc.interpolation || "LINEAR"));
                        }
                        continue;
                    }
                    if (zalvck[0] === "extensions" && zalvck[1] === "KHR_lights_punctual" && zalvck[2] === "lights" && zalvck.length >= 5) {
                        var zalvcw = zalvq["light" + zalvck[3]], zalvcx = zalvck[zalvck.length - 1];
                        if (zalvcw && (zalvcx === "intensity" || zalvcx === "color")) zalvbz.push(new AnimationTrack("userData.pointerTargets.light" + zalvck[3] + "." + (zalvcx === "color" ? "color" : "intensity"), zalvcd, zalvce, zalvcx === "color" ? "color" : "number", zalvcc.interpolation || "LINEAR"));
                        continue;
                    }
                    continue;
                }
                if (!zalvcg) continue;
                zalvbz.push(new AnimationTrack((zalvcg.name || "node" + zalvcb.target.node) + "." + (zalvcf === "translation" ? "position" : zalvcf), zalvcd, zalvce, zalvch, zalvcc.interpolation || "LINEAR"));
            }
            zalvbw.push(new AnimationClip(zalvby.name || "animation" + zalvbx, undefined, zalvbz));
        }
        zalvbj.userData.animations = zalvbw;
        zalvbj.userData.pointerTargets = zalvq;
        var zalvcy = zalva.extensions && zalva.extensions.EXT_lights_image_based;
        if (zalvcy && zalvcy.lights && zalvcy.lights.length) {
            var zalvcz = zalvcy.lights[0];
            var zalvda = zalvcz.radianceCube && zalvcz.radianceCube.indices;
            if (zalvda && zalvda.length === 6) {
                var zalvdb = [];
                for (var zalvdc = 0; zalvdc < 6; zalvdc++) {
                    var zalvdd = zalva.textures[zalvda[zalvdc]];
                    var zalvde = zalvdd && zalva.images[zalvdd.source];
                    zalvdb.push(zalvk(zalvde));
                }
                var zalvdf = new CubeTexture(zalvdb);
                zalvbj.userData.environmentCube = zalvdf;
                var zalvdg = zalvdf.promise.catch(function() {
                    return zalvdf;
                });
                var zalvdh = await zalvdg;
                if (this.options && this.options.renderer && this.options.renderer.resourceManager && this.options.renderer.device) {
                    try {
                        zalvbj.userData.environment = await new PMREMGenerator(this.options.renderer).generate(zalvdh);
                    } catch (zalva) {
                        zalvbj.userData.environment = zalvdh;
                    }
                } else zalvbj.userData.environment = zalvdh;
                zalvbj.environment = zalvbj.userData.environment;
            }
        }
        return zalvbj;
    }
    parseOBJ(zalva) {
        var zalvb = [], zalvc = [], zalvd = [], zalve = [], zalvf = [], zalvg = [], zalvh = [], zalvi = {};
        var zalvj = zalva.split(/\r?\n/);
        for (var zalvk = 0; zalvk < zalvj.length; zalvk++) {
            var zalvl = zalvj[zalvk].trim();
            var zalvm = zalvl.split(/\s+/);
            if (zalvm[0] === "v") zalvb.push(new Vector3(parseFloat(zalvm[1]), parseFloat(zalvm[2]), parseFloat(zalvm[3]))); else if (zalvm[0] === "vn") zalvc.push(new Vector3(parseFloat(zalvm[1]), parseFloat(zalvm[2]), parseFloat(zalvm[3]))); else if (zalvm[0] === "vt") zalvd.push(new Vector2(parseFloat(zalvm[1]), parseFloat(zalvm[2]))); else if (zalvm[0] === "f") {
                var zalvn = [];
                for (var zalvo = 1; zalvo < zalvm.length; zalvo++) {
                    var zalvp = zalvm[zalvo];
                    if (zalvi[zalvp] === undefined) {
                        var zalvq = zalvp.split("/");
                        var zalvr = parseInt(zalvq[0], 10);
                        var zalvs = parseInt(zalvq[1] || 0, 10);
                        var zalvt = parseInt(zalvq[2] || 0, 10);
                        var zalvu = zalvb[zalvr < 0 ? zalvb.length + zalvr : zalvr - 1] || new Vector3;
                        var zalvv = zalvd[zalvs < 0 ? zalvd.length + zalvs : zalvs - 1] || new Vector2;
                        var zalvw = zalvc[zalvt < 0 ? zalvc.length + zalvt : zalvt - 1] || new Vector3(0, 1, 0);
                        zalve.push(zalvu.x, zalvu.y, zalvu.z);
                        zalvg.push(zalvv.x, zalvv.y);
                        zalvf.push(zalvw.x, zalvw.y, zalvw.z);
                        zalvi[zalvp] = zalve.length / 3 - 1;
                    }
                    zalvn.push(zalvi[zalvp]);
                }
                for (var zalvx = 1; zalvx < zalvn.length - 1; zalvx++) zalvh.push(zalvn[0], zalvn[zalvx], zalvn[zalvx + 1]);
            }
        }
        return new Mesh(faoxomgeometry(zalve, zalvf, zalvg, zalvh), new StandardMaterial);
    }
    loadModelInWorker(zalva, zalvb) {
        zalvb = zalvb || {};
        if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) return this.loadModel(zalva, zalvb);
        var zalvc = "self.onmessage=async function(event){try{var response=await fetch(event.data.url,event.data.request||{});if(!response.ok)throw new Error('Asset request failed: '+response.status);var buffer=await response.arrayBuffer();var view=new DataView(buffer);if(buffer.byteLength<20||view.getUint32(0,true)!==0x46546c67)throw new Error('Background worker currently requires GLB input');var jsonLength=view.getUint32(12,true),jsonStart=20,jsonBytes=new Uint8Array(buffer,jsonStart,jsonLength),json=JSON.parse(new TextDecoder().decode(jsonBytes));self.postMessage({buffer:buffer,json:json,bytes:buffer.byteLength},[buffer]);}catch(error){self.postMessage({error:String(error&&error.message?error.message:error)});}};";
        var zalvd = new Worker(URL.createObjectURL(new Blob([ zalvc ], {
            type: "application/javascript"
        }))), zalve = this;
        return new Promise(function(zalvc, zalvf) {
            zalvd.onmessage = function(zalvb) {
                var zalvg = zalvb.data || {};
                zalvd.terminate();
                if (zalvg.error) {
                    zalvf(new Error(zalvg.error));
                    return;
                }
                try {
                    var zalvh = zalve.parseGLB(zalvg.buffer, zalva);
                    Promise.resolve(zalve.prepareCompressedTextures(zalvh)).then(zalvc, zalvf);
                } catch (zalva) {
                    zalvf(zalva);
                }
            };
            zalvd.onerror = function(zalva) {
                zalvd.terminate();
                zalvf(zalva);
            };
            var zalvg = zalva;
            if (typeof document !== "undefined" && typeof URL !== "undefined") zalvg = new URL(zalva, document.baseURI).href;
            zalvd.postMessage({
                url: zalvg,
                request: {
                    headers: zalvb.headers || {}
                }
            });
        });
    }
}

AssetLoader.prototype.parseFBX = async function(zalva, zalvb, zalvc) {
    zalvc = zalvc || {};
    if (!(zalva instanceof ArrayBuffer)) zalva = zalva.buffer.slice(zalva.byteOffset, zalva.byteOffset + zalva.byteLength);
    var zalvd = new Uint8Array(zalva);
    var zalve = "Kaydara FBX Binary  ";
    var zalvf = faoxomfbxtext(zalvd.slice(0, 21));
    if (zalvf.indexOf(zalve) !== 0) throw new Error("Invalid FBX binary header");
    var zalvg = new DataView(zalva);
    var zalvh = zalvg.getUint32(23, true);
    var zalvi = {
        offset: 27
    };
    var zalvj = [];
    while (zalvi.offset < zalvg.byteLength) {
        if (zalvg.byteLength - zalvi.offset < 13) break;
        var zalvk = faoxomfbxparsenode(zalvg, zalvi, zalva, zalvh, zalvg.byteLength);
        if (zalvk) zalvj.push(zalvk); else if (zalvi.offset >= zalvg.byteLength) break;
    }
    var zalvl = {
        name: "Root",
        children: zalvj,
        properties: []
    };
    await faoxomfbxresolvenode(zalvl, zalvg, zalva);
    var zalvm = faoxomfbxchild(zalvl, "Objects");
    var zalvn = faoxomfbxchild(zalvl, "Connections");
    var zalvo = {};
    var zalvp = [], zalvq = [], zalvr = [], zalvs = [], zalvt = [];
    var zalvu = faoxomfbxchildren(zalvm);
    for (var zalvv = 0; zalvv < zalvu.length; zalvv++) {
        var zalvw = zalvu[zalvv];
        var zalvx = zalvw.properties.length ? String(zalvw.properties[0]) : "";
        if (!zalvx) continue;
        zalvw.id = zalvx;
        zalvo[zalvx] = zalvw;
        if (zalvw.name === "Model") zalvp.push(zalvw); else if (zalvw.name === "Geometry") zalvq.push(zalvw); else if (zalvw.name === "Material") zalvr.push(zalvw); else if (zalvw.name === "Texture") zalvs.push(zalvw); else if (zalvw.name === "Deformer") zalvt.push(zalvw);
    }
    var zalvy = [];
    var zalvz = faoxomfbxchildren(zalvn, "C");
    for (var zalvaa = 0; zalvaa < zalvz.length; zalvaa++) {
        var zalvab = zalvz[zalvaa].properties;
        if (zalvab.length >= 3) zalvy.push({
            type: String(zalvab[0]),
            child: String(zalvab[1]),
            parent: String(zalvab[2]),
            property: zalvab.length > 3 ? String(zalvab[3]) : ""
        });
    }
    var zalvac = {}, zalvad = {};
    for (var zalvae = 0; zalvae < zalvy.length; zalvae++) {
        var zalvaf = zalvy[zalvae];
        if (!zalvad[zalvaf.parent]) zalvad[zalvaf.parent] = [];
        zalvad[zalvaf.parent].push(zalvaf);
        if (zalvaf.type === "OO") zalvac[zalvaf.child] = zalvaf.parent;
    }
    var zalvag = new Group;
    zalvag.name = zalvc.name || "FBX";
    zalvag.userData.fbxVersion = zalvh;
    zalvag.userData.fbxRecords = zalvo;
    var zalvah = {};
    for (var zalvai = 0; zalvai < zalvt.length; zalvai++) if (String(zalvt[zalvai].properties[2] || "") === "Cluster") for (var zalvaj = 0; zalvaj < zalvy.length; zalvaj++) if (zalvy[zalvaj].child === zalvt[zalvai].id && zalvo[zalvy[zalvaj].parent] && zalvo[zalvy[zalvaj].parent].name === "Model") zalvah[zalvy[zalvaj].parent] = true;
    var zalvak = {};
    for (var zalval = 0; zalval < zalvp.length; zalval++) {
        var zalvam = zalvp[zalval];
        var zalvan = zalvah[zalvam.id] ? new Bone : new Group;
        zalvan.name = faoxomfbxname(zalvam.properties[1] || zalvam.properties[0]);
        zalvan.userData.fbxId = zalvam.id;
        var zalvao = faoxomfbxproperty(zalvam, "Lcl Translation", [ 0, 0, 0 ]);
        var zalvap = faoxomfbxproperty(zalvam, "Lcl Rotation", [ 0, 0, 0 ]);
        var zalvaq = faoxomfbxproperty(zalvam, "Lcl Scaling", [ 1, 1, 1 ]);
        zalvan.position.set(faoxomfbxnumber(zalvao[0]), faoxomfbxnumber(zalvao[1]), faoxomfbxnumber(zalvao[2]));
        zalvan.rotation.set(faoxomfbxnumber(zalvap[0]) * Math.PI / 180, faoxomfbxnumber(zalvap[1]) * Math.PI / 180, faoxomfbxnumber(zalvap[2]) * Math.PI / 180, "XYZ");
        zalvan.scale.set(faoxomfbxnumber(zalvaq[0]) || 1, faoxomfbxnumber(zalvaq[1]) || 1, faoxomfbxnumber(zalvaq[2]) || 1);
        zalvak[zalvam.id] = zalvan;
    }
    for (var zalvar = 0; zalvar < zalvp.length; zalvar++) {
        var zalvas = zalvp[zalvar], zalvat = zalvak[zalvas.id], zalvau = zalvac[zalvas.id], zalvav = zalvak[zalvau];
        if (zalvav) zalvav.add(zalvat); else zalvag.add(zalvat);
    }
    var zalvaw = {};
    for (var zalvax = 0; zalvax < zalvr.length; zalvax++) {
        var zalvay = zalvr[zalvax], zalvaz = String(zalvay.properties[2] || "");
        var zalvba = {
            color: faoxomfbxcolor(faoxomfbxproperty(zalvay, "DiffuseColor", [ .8, .8, .8 ])),
            diffuse: faoxomfbxcolor(faoxomfbxproperty(zalvay, "DiffuseColor", [ .8, .8, .8 ])),
            emissive: faoxomfbxcolor(faoxomfbxproperty(zalvay, "EmissiveColor", [ 0, 0, 0 ])),
            specular: faoxomfbxcolor(faoxomfbxproperty(zalvay, "SpecularColor", [ .2, .2, .2 ])),
            shininess: faoxomfbxnumber(faoxomfbxproperty(zalvay, "Shininess", [ 30 ])[0]),
            opacity: 1 - faoxomfbxnumber(faoxomfbxproperty(zalvay, "TransparencyFactor", [ 0 ])[0])
        };
        var zalvbb = zalvaz.indexOf("Phong") >= 0 ? new PhongMaterial(zalvba) : new StandardMaterial(zalvba);
        zalvbb.name = faoxomfbxname(zalvay.properties[1] || zalvay.id);
        zalvbb.userData = {
            fbxId: zalvay.id
        };
        zalvaw[zalvay.id] = zalvbb;
    }
    var zalvbc = {};
    var zalvbd = zalvb || "";
    for (var zalvbe = 0; zalvbe < zalvs.length; zalvbe++) {
        var zalvbf = zalvs[zalvbe], zalvbg = faoxomfbxchild(zalvbf, "FileName"), zalvbh = faoxomfbxchild(zalvbf, "RelativeFileName"), zalvbi = zalvbg ? zalvbg.properties[0] : zalvbh ? zalvbh.properties[0] : "";
        zalvbi = String(zalvbi || "").replace(/\\/g, "/");
        var zalvbj = zalvbi;
        if (zalvbd && zalvbi && typeof URL !== "undefined") try {
            zalvbj = new URL(zalvbi, zalvbd).href;
        } catch (zalva) {}
        zalvbc[zalvbf.id] = new Texture(zalvbj, {
            flipY: false
        });
    }
    for (var zalvbk = 0; zalvbk < zalvy.length; zalvbk++) {
        var zalvbl = zalvy[zalvbk];
        if (!zalvbc[zalvbl.child] || !zalvaw[zalvbl.parent]) continue;
        var zalvbm = zalvaw[zalvbl.parent];
        var zalvbn = zalvbc[zalvbl.child];
        if (zalvbl.property.indexOf("Normal") >= 0 || zalvbl.property.indexOf("Bump") >= 0) zalvbm.normalMap = zalvbn; else if (zalvbl.property.indexOf("Specular") >= 0) zalvbm.specularMap = zalvbn; else if (zalvbl.property.indexOf("Emissive") >= 0) zalvbm.emissiveMap = zalvbn; else zalvbm.diffuseMap = zalvbn;
        zalvbm.needsUpdate = true;
    }
    var zalvbo = {};
    var zalvbp = [];
    for (var zalvbq = 0; zalvbq < zalvq.length; zalvbq++) {
        var zalvbr = zalvq[zalvbq];
        var zalvbs = faoxomfbxgeometry(zalvbr);
        zalvbo[zalvbr.id] = zalvbs;
        var zalvbt = [];
        for (var zalvbu = 0; zalvbu < zalvy.length; zalvbu++) if (zalvy[zalvbu].child === zalvbr.id && zalvak[zalvy[zalvbu].parent]) zalvbt.push(zalvak[zalvy[zalvbu].parent]);
        if (!zalvbt.length) zalvbt.push(zalvag);
        for (var zalvbv = 0; zalvbv < zalvbt.length; zalvbv++) zalvbp.push({
            geometry: zalvbs,
            model: zalvbt[zalvbv],
            geometryId: zalvbr.id
        });
    }
    var zalvbw = {};
    for (var zalvbx = 0; zalvbx < zalvt.length; zalvbx++) {
        var zalvby = zalvt[zalvbx];
        if (String(zalvby.properties[2] || "") !== "Cluster") continue;
        var zalvbz = null, zalvca = null, zalvcb = null;
        for (var zalvcc = 0; zalvcc < zalvy.length; zalvcc++) {
            var zalvcd = zalvy[zalvcc];
            if (zalvcd.child === zalvby.id) {
                if (zalvo[zalvcd.parent] && zalvo[zalvcd.parent].name === "Model") zalvca = zalvak[zalvcd.parent];
                if (zalvo[zalvcd.parent] && zalvo[zalvcd.parent].name === "Deformer" && String(zalvo[zalvcd.parent].properties[2] || "") === "Skin") zalvcb = zalvcd.parent;
            }
            if (zalvcb && zalvcd.child === zalvcb && zalvo[zalvcd.parent] && zalvo[zalvcd.parent].name === "Geometry") zalvbz = zalvcd.parent;
        }
        if (!zalvbz) for (var zalvce = 0; zalvce < zalvy.length; zalvce++) if (zalvy[zalvce].child === zalvby.id && zalvo[zalvy[zalvce].parent] && zalvo[zalvy[zalvce].parent].name === "Deformer") {
            zalvcb = zalvy[zalvce].parent;
            for (var zalvcf = 0; zalvcf < zalvy.length; zalvcf++) if (zalvy[zalvcf].child === zalvcb && zalvo[zalvy[zalvcf].parent] && zalvo[zalvy[zalvcf].parent].name === "Geometry") zalvbz = zalvy[zalvcf].parent;
        }
        if (zalvbz && zalvca) zalvbw[zalvbz] = (zalvbw[zalvbz] || []).concat([ {
            bone: zalvca,
            indices: faoxomfbxarray(zalvby, "Indexes") || [],
            weights: faoxomfbxarray(zalvby, "Weights") || [],
            inverse: faoxomfbxarray(zalvby, "TransformLink") || []
        } ]);
    }
    var zalvcg = [];
    for (var zalvch = 0; zalvch < zalvbp.length; zalvch++) {
        var zalvci = zalvbp[zalvch], zalvcj = [];
        for (var zalvck = 0; zalvck < zalvy.length; zalvck++) if (zalvy[zalvck].parent === zalvci.model.userData.fbxId && zalvaw[zalvy[zalvck].child]) zalvcj.push(zalvaw[zalvy[zalvck].child]);
        var zalvcl = zalvbw[zalvci.geometryId] || [];
        var zalvcm = zalvcl.length ? new SkinnedMesh(zalvci.geometry, zalvcj.length ? zalvcj : new StandardMaterial({
            color: 13421772
        })) : new Mesh(zalvci.geometry, zalvcj.length ? zalvcj : new StandardMaterial({
            color: 13421772
        }));
        zalvcm.name = zalvci.model.name || "FBXMesh";
        zalvcm.userData.fbxGeometryId = zalvci.geometryId;
        if (zalvcj.length) zalvcm.material = zalvcj.length === 1 ? zalvcj[0] : zalvcj;
        if (zalvcl.length) {
            var zalvcn = zalvci.geometry.userData && zalvci.geometry.userData.originalVertex ? zalvci.geometry.userData.originalVertex : [];
            var zalvco = new Uint16Array(zalvcn.length * 4), zalvcp = new Float32Array(zalvcn.length * 4);
            var zalvcq = [], zalvcr = [];
            for (var zalvcs = 0; zalvcs < zalvcl.length; zalvcs++) {
                var zalvct = zalvcl[zalvcs];
                zalvcr.push(zalvct.bone);
                var zalvcu = zalvct.inverse && zalvct.inverse.length >= 16 ? (new Matrix4).fromArray(zalvct.inverse) : zalvct.bone.matrixWorld.clone().invert();
                zalvcq.push(zalvcu);
                for (var zalvcv = 0; zalvcv < zalvct.indices.length; zalvcv++) {
                    var zalvcw = faoxomfbxnumber(zalvct.indices[zalvcv]);
                    var zalvcx = faoxomfbxnumber(zalvct.weights[zalvcv]);
                    for (var zalvcy = 0; zalvcy < zalvcn.length; zalvcy++) if (zalvcn[zalvcy] === zalvcw) {
                        var zalvcz = zalvcy * 4, zalvda = 0;
                        while (zalvda < 4 && zalvcp[zalvcz + zalvda] > zalvcx) zalvda++;
                        if (zalvda < 4) {
                            for (var zalvdb = 3; zalvdb > zalvda; zalvdb--) {
                                zalvcp[zalvcz + zalvdb] = zalvcp[zalvcz + zalvdb - 1];
                                zalvco[zalvcz + zalvdb] = zalvco[zalvcz + zalvdb - 1];
                            }
                            zalvcp[zalvcz + zalvda] = zalvcx;
                            zalvco[zalvcz + zalvda] = zalvcs;
                        }
                    }
                }
            }
            zalvci.geometry.setAttribute("skinIndex", zalvco, 4);
            zalvci.geometry.setAttribute("skinWeight", zalvcp, 4);
            var zalvdc = new Skeleton(zalvcr, zalvcq);
            zalvcm.bind(zalvdc, zalvci.model.matrixWorld);
            zalvcm.userData.fbxSkeleton = zalvdc;
        }
        if (zalvcm.skeleton) {
            zalvcm.userData.fbxBindModel = zalvci.model;
            for (var zalvdd = 0; zalvdd < zalvcp.length; zalvdd += 4) {
                var zalvde = zalvcp[zalvdd] + zalvcp[zalvdd + 1] + zalvcp[zalvdd + 2] + zalvcp[zalvdd + 3];
                if (zalvde > 0) {
                    zalvcp[zalvdd] /= zalvde;
                    zalvcp[zalvdd + 1] /= zalvde;
                    zalvcp[zalvdd + 2] /= zalvde;
                    zalvcp[zalvdd + 3] /= zalvde;
                }
            }
        }
        zalvci.model.add(zalvcm);
        zalvcg.push(zalvcm);
    }
    zalvag.updateMatrixWorld(true);
    for (var zalvdf = 0; zalvdf < zalvcg.length; zalvdf++) {
        if (zalvcg[zalvdf].skeleton) {
            zalvcg[zalvdf].bind(zalvcg[zalvdf].skeleton, zalvcg[zalvdf].userData.fbxBindModel ? zalvcg[zalvdf].userData.fbxBindModel.matrixWorld : zalvcg[zalvdf].matrixWorld);
            zalvcg[zalvdf].skeleton.update();
        }
    }
    var zalvdg = [];
    for (var zalvdh in zalvo) if (zalvo[zalvdh].name === "AnimationStack") zalvdg.push(zalvo[zalvdh]);
    var zalvdi = {};
    var zalvdj = {};
    for (var zalvdk in zalvo) {
        if (zalvo[zalvdk].name === "AnimationCurveNode") zalvdi[zalvdk] = {
            record: zalvo[zalvdk],
            curves: {}
        };
        if (zalvo[zalvdk].name === "AnimationCurve") zalvdj[zalvdk] = zalvo[zalvdk];
    }
    var zalvdl = {};
    for (var zalvdm = 0; zalvdm < zalvy.length; zalvdm++) {
        var zalvdn = zalvy[zalvdm];
        if (zalvdj[zalvdn.child] && zalvdi[zalvdn.parent]) zalvdi[zalvdn.parent].curves[zalvdn.property.split("|").pop().toUpperCase()] = zalvdj[zalvdn.child];
        if (zalvdi[zalvdn.child] && zalvak[zalvdn.parent]) zalvdl[zalvdn.child] = {
            model: zalvak[zalvdn.parent],
            property: zalvdn.property.split("|").pop()
        };
    }
    var zalvdo = [];
    for (var zalvdp = 0; zalvdp < zalvdg.length; zalvdp++) {
        var zalvdq = zalvdg[zalvdp], zalvdr = {};
        for (var zalvds = 0; zalvds < zalvy.length; zalvds++) if (zalvy[zalvds].parent === zalvdq.id && zalvo[zalvy[zalvds].child] && zalvo[zalvy[zalvds].child].name === "AnimationLayer") zalvdr[zalvy[zalvds].child] = true;
        var zalvdt = [];
        for (var zalvdu in zalvdi) {
            var zalvdv = zalvdl[zalvdu];
            if (!zalvdv) continue;
            var zalvdw = false;
            for (var zalvdx = 0; zalvdx < zalvy.length; zalvdx++) if (zalvy[zalvdx].child === zalvdu && zalvdr[zalvy[zalvdx].parent]) zalvdw = true;
            if (!zalvdw) continue;
            var zalvdy = zalvdi[zalvdu].curves, zalvdz = [ "X", "Y", "Z" ], zalvea = {}, zalveb = {
                X: {},
                Y: {},
                Z: {}
            };
            for (var zalvec = 0; zalvec < zalvdz.length; zalvec++) {
                var zalved = zalvdy[zalvdz[zalvec]];
                if (!zalved) continue;
                var zalvee = faoxomfbxarray(zalved, "KeyTime") || [], zalvef = faoxomfbxarray(zalved, "KeyValueFloat") || [];
                for (var zalveg = 0; zalveg < zalvee.length; zalveg++) {
                    var zalveh = faoxomfbxnumber(zalvee[zalveg]) / 46186158e3;
                    zalvea[zalveh] = true;
                    zalveb[zalvdz[zalvec]][zalveh] = faoxomfbxnumber(zalvef[zalveg]);
                }
            }
            var zalvei = Object.keys(zalvea).map(Number).sort(function(zalva, zalvb) {
                return zalva - zalvb;
            });
            if (!zalvei.length) continue;
            var zalvej = zalvdv.property, zalvek = zalvej.toLowerCase();
            if (zalvek.indexOf("translation") >= 0 || zalvek.indexOf("scaling") >= 0) {
                var zalvel = zalvek.indexOf("scaling") >= 0 ? zalvdv.model.scale : zalvdv.model.position;
                var zalvem = [];
                for (var zalven = 0; zalven < zalvei.length; zalven++) zalvem.push(zalveb.X[zalvei[zalven]] === undefined ? zalvel.x : zalveb.X[zalvei[zalven]], zalveb.Y[zalvei[zalven]] === undefined ? zalvel.y : zalveb.Y[zalvei[zalven]], zalveb.Z[zalvei[zalven]] === undefined ? zalvel.z : zalveb.Z[zalvei[zalven]]);
                zalvdt.push(new AnimationTrack(zalvdv.model.name + "." + (zalvek.indexOf("scaling") >= 0 ? "scale" : "position"), zalvei, zalvem, "vector3"));
            } else if (zalvek.indexOf("rotation") >= 0) {
                var zalveo = [];
                for (var zalvep = 0; zalvep < zalvei.length; zalvep++) {
                    var zalveq = zalveb.X[zalvei[zalvep]] === undefined ? zalvdv.model.rotation.x * 180 / Math.PI : zalveb.X[zalvei[zalvep]], zalver = zalveb.Y[zalvei[zalvep]] === undefined ? zalvdv.model.rotation.y * 180 / Math.PI : zalveb.Y[zalvei[zalvep]], zalves = zalveb.Z[zalvei[zalvep]] === undefined ? zalvdv.model.rotation.z * 180 / Math.PI : zalveb.Z[zalvei[zalvep]];
                    var zalvet = (new Quaternion).setFromEuler(new Euler(zalveq * Math.PI / 180, zalver * Math.PI / 180, zalves * Math.PI / 180, "XYZ"));
                    zalveo.push(zalvet.x, zalvet.y, zalvet.z, zalvet.w);
                }
                zalvdt.push(new AnimationTrack(zalvdv.model.name + ".quaternion", zalvei, zalveo, "quaternion"));
            }
        }
        if (zalvdt.length) zalvdo.push(new AnimationClip(faoxomfbxname(zalvdq.properties[1] || zalvdq.id), undefined, zalvdt));
    }
    zalvag.userData.meshes = zalvcg;
    zalvag.userData.materials = zalvaw;
    zalvag.userData.textures = zalvbc;
    zalvag.userData.animations = zalvdo;
    zalvag.userData.animationsByName = {};
    for (var zalveu = 0; zalveu < zalvdo.length; zalveu++) zalvag.userData.animationsByName[zalvdo[zalveu].name] = zalvdo[zalveu];
    return zalvag;
};

AssetLoader.prototype.parsePCD = function(zalva) {
    return faoxomdecodepcd(zalva);
};

AssetLoader.prototype.parseVTK = function(zalva) {
    var zalvb = (new VTKLoader).parse(zalva);
    if (!zalvb.attributes.normal) zalvb.computeVertexNormals();
    return new Mesh(zalvb, new StandardMaterial(zalvb.attributes.color ? {
        vertexColors: true
    } : {}));
};

AssetLoader.prototype.parseGCode = function(zalva) {
    return (new GCodeLoader).parse(zalva);
};

AssetLoader.prototype.parseMD2 = function(zalva) {
    var zalvb = (new MD2Loader).parse(zalva);
    var zalvc = new Mesh(zalvb, new StandardMaterial({
        side: DoubleSide
    }));
    var zalvd = zalvb.morphAttributes.position.length;
    zalvc.morphTargetInfluences = new Array(zalvd).fill(0);
    zalvc.morphTargetDictionary = zalvb.userData.morphTargetDictionary || {};
    zalvc.userData.animations = zalvb.animations || [];
    return zalvc;
};

AssetLoader.prototype.parseMDD = function(zalva) {
    return (new MDDLoader).parse(zalva);
};

AssetLoader.prototype.parseBVH = function(zalva) {
    var zalvb = zalva.split(/\r?\n/).map(function(zalva) {
        return zalva.trim();
    }).filter(function(zalva) {
        return zalva.length > 0;
    });
    var zalvc = new Group;
    zalvc.name = "BVH";
    var zalvd = [], zalve = [], zalvf = [], zalvg = null, zalvh = -1, zalvi = 0, zalvj = 1 / 30;
    for (var zalvk = 0; zalvk < zalvb.length; zalvk++) {
        var zalvl = zalvb[zalvk];
        if (zalvl === "MOTION") {
            zalvh = zalvk;
            break;
        }
        var zalvm = zalvl.split(/\s+/);
        if (zalvm[0] === "ROOT" || zalvm[0] === "JOINT") {
            var zalvn = new Bone;
            zalvn.name = zalvm.slice(1).join(" ");
            if (zalvd.length) zalvd[zalvd.length - 1].add(zalvn); else zalvc.add(zalvn);
            zalve.push(zalvn);
            zalvg = zalvn;
        } else if (zalvm[0] === "End" && zalvm[1] === "Site") {
            var zalvo = new Bone;
            zalvo.name = (zalvg ? zalvg.name : "bone") + "_end";
            if (zalvg) zalvg.add(zalvo);
            zalvg = zalvo;
        } else if (zalvm[0] === "OFFSET" && zalvg) zalvg.position.set(Number(zalvm[1]) || 0, Number(zalvm[2]) || 0, Number(zalvm[3]) || 0); else if (zalvm[0] === "CHANNELS" && zalvg) {
            var zalvp = Number(zalvm[1]) || 0;
            zalvf.push({
                bone: zalvg,
                names: zalvm.slice(2, 2 + zalvp)
            });
        } else if (zalvl === "{") zalvd.push(zalvg); else if (zalvl === "}") {
            zalvg = zalvd.pop() || null;
        }
    }
    if (zalvh < 0) return zalvc;
    for (var zalvq = zalvh + 1; zalvq < zalvb.length; zalvq++) {
        if (zalvb[zalvq].indexOf("Frames:") === 0) zalvi = Number(zalvb[zalvq].split(/\s+/)[1]) || 0; else if (zalvb[zalvq].indexOf("Frame Time:") === 0) zalvj = Number(zalvb[zalvq].split(/\s+/)[2]) || zalvj; else if (zalvq > zalvh + 1) break;
    }
    var zalvr = [];
    for (var zalvs = zalvh + 1; zalvs < zalvb.length; zalvs++) {
        if (zalvb[zalvs].indexOf("Frames:") === 0 || zalvb[zalvs].indexOf("Frame Time:") === 0) continue;
        var zalvt = zalvb[zalvs].split(/\s+/).map(Number);
        if (zalvt.length) zalvr.push(zalvt);
    }
    var zalvu = [];
    var zalvv = 0;
    for (var zalvw = 0; zalvw < zalvf.length; zalvw++) {
        var zalvx = zalvf[zalvw], zalvy = [], zalvz = [], zalvaa = [], zalvab = [];
        for (var zalvac = 0; zalvac < Math.min(zalvi || zalvr.length, zalvr.length); zalvac++) {
            var zalvad = zalvr[zalvac];
            var zalvae = zalvx.bone.position.x, zalvaf = zalvx.bone.position.y, zalvag = zalvx.bone.position.z, zalvah = new Quaternion;
            for (var zalvai = 0; zalvai < zalvx.names.length; zalvai++) {
                var zalvaj = zalvx.names[zalvai], zalvak = Number(zalvad[zalvv + zalvai]) || 0;
                if (zalvaj === "Xposition") zalvae = zalvak; else if (zalvaj === "Yposition") zalvaf = zalvak; else if (zalvaj === "Zposition") zalvag = zalvak; else if (zalvaj === "Xrotation") zalvah.multiply((new Quaternion).setFromAxisAngle(new Vector3(1, 0, 0), zalvak * Math.PI / 180)); else if (zalvaj === "Yrotation") zalvah.multiply((new Quaternion).setFromAxisAngle(new Vector3(0, 1, 0), zalvak * Math.PI / 180)); else if (zalvaj === "Zrotation") zalvah.multiply((new Quaternion).setFromAxisAngle(new Vector3(0, 0, 1), zalvak * Math.PI / 180));
            }
            zalvv += zalvx.names.length;
            zalvaa.push(zalvac * zalvj);
            zalvy.push(zalvae, zalvaf, zalvag);
            zalvab.push(zalvac * zalvj);
            zalvz.push(zalvah.x, zalvah.y, zalvah.z, zalvah.w);
        }
        if (zalvx.names.some(function(zalva) {
            return zalva.indexOf("position") >= 0;
        })) zalvu.push(new AnimationTrack(zalvx.bone.name + ".position", zalvaa, zalvy, "vector3"));
        zalvu.push(new AnimationTrack(zalvx.bone.name + ".quaternion", zalvab, zalvz, "quaternion"));
    }
    zalvc.userData.animations = [ new AnimationClip("BVH", zalvi * zalvj, zalvu) ];
    zalvc.userData.bones = zalve;
    return zalvc;
};

AssetLoader.prototype.loadTGA = function(zalva) {
    var zalvb = this;
    return this.loadBinary(zalva).then(function(zalva) {
        return (new TGALoader).parse(zalva);
    });
};

AssetLoader.prototype.loadDDS = function(zalva) {
    var zalvb = this;
    return this.loadBinary(zalva).then(function(zalva) {
        return (new DDSLoader).parse(zalva);
    });
};

AssetLoader.prototype.loadEXR = function(zalva) {
    var zalvb = this;
    return this.loadBinary(zalva).then(function(zalva) {
        return (new EXRLoader).parse(zalva);
    });
};

AssetLoader.prototype.loadBinary = function(zalva) {
    return fetch(zalva).then(function(zalva) {
        if (!zalva.ok) throw new Error("Asset request failed: " + zalva.status);
        return zalva.arrayBuffer();
    });
};

export { AssetLoader };
