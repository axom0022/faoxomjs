import { DoubleSide, faoxombase64bytes, faoxombase64text } from "../core/index.js";

import { DirectionalLight, PointLight, SpotLight } from "../lights/index.js";

import { BasicMaterial } from "../materials/index.js";

import { Mesh, SkinnedMesh } from "../objects/index.js";

class GLTFExporter {
    parse(zamfa, zamfb, zamfc, zamfd) {
        try {
            var zamfe = this.process(zamfa, zamfd || {});
            if (zamfb) zamfb(zamfe);
            return zamfe;
        } catch (zamfa) {
            if (zamfc) zamfc(zamfa);
            return null;
        }
    }
    process(zamfa, zamfb) {
        var zamfc = this;
        var zamfd = {
            asset: {
                generator: "FaoxomJS GLTFExporter",
                version: "2.0"
            },
            scene: 0,
            scenes: [ {
                nodes: []
            } ],
            extensionsUsed: [],
            nodes: [],
            meshes: [],
            materials: [],
            accessors: [],
            bufferViews: [],
            buffers: [],
            images: [],
            textures: [],
            samplers: [],
            cameras: [],
            animations: [],
            skins: []
        };
        var zamfe = [], zamff = 0, zamfg = new Map, zamfh = new Map, zamfi = new Map, zamfj = new Map, zamfk = new Map, zamfl = null;
        var zamfm = {
            SCALAR: 1,
            VEC2: 2,
            VEC3: 3,
            VEC4: 4,
            MAT2: 4,
            MAT3: 9,
            MAT4: 16
        };
        var zamfn = function(zamfa) {
            if (zamfd.extensionsUsed.indexOf(zamfa) === -1) zamfd.extensionsUsed.push(zamfa);
        };
        var zamfo = function() {
            while (zamff % 4 !== 0) {
                zamfe.push(0);
                zamff++;
            }
        };
        var zamfp = function(zamfa, zamfb) {
            zamfo();
            var zamfc = {
                buffer: 0,
                byteOffset: zamff,
                byteLength: zamfa.byteLength
            };
            if (zamfb) zamfc.target = zamfb;
            for (var zamfg = 0; zamfg < zamfa.length; zamfg++) zamfe.push(zamfa[zamfg]);
            zamff += zamfa.length;
            zamfd.bufferViews.push(zamfc);
            return zamfd.bufferViews.length - 1;
        };
        var zamfq = function(zamfa, zamfb, zamfc, zamfe, zamff) {
            var zamfg = new Uint8Array(zamfa.buffer instanceof ArrayBuffer ? zamfa.buffer.slice(zamfa.byteOffset, zamfa.byteOffset + zamfa.byteLength) : zamfa.buffer);
            var zamfh = zamfp(zamfg, zamfb === 5125 ? 34963 : 34962);
            var zamfi = {
                bufferView: zamfh,
                byteOffset: 0,
                componentType: zamfb,
                count: zamfe,
                type: zamfc
            };
            if (zamff) {
                var zamfj = zamfm[zamfc], zamfk = [], zamfl = [];
                for (var zamfn = 0; zamfn < zamfj; zamfn++) {
                    zamfk.push(Infinity);
                    zamfl.push(-Infinity);
                }
                for (var zamfo = 0; zamfo < zamfe; zamfo++) for (var zamfq = 0; zamfq < zamfj; zamfq++) {
                    var zamfr = zamfa[zamfo * zamfj + zamfq];
                    if (zamfr < zamfk[zamfq]) zamfk[zamfq] = zamfr;
                    if (zamfr > zamfl[zamfq]) zamfl[zamfq] = zamfr;
                }
                zamfi.min = zamfk;
                zamfi.max = zamfl;
            }
            zamfd.accessors.push(zamfi);
            return zamfd.accessors.length - 1;
        };
        var zamfr = function(zamfa) {
            if (!zamfa) return null;
            var zamfc = null, zamfe = "image/png";
            var zamff = zamfa.image;
            if (zamff && (zamff.width || zamff.height) && typeof document !== "undefined" && document.createElement) {
                var zamfg = zamff.videoWidth || zamff.width || 4, zamfh = zamff.videoHeight || zamff.height || 4;
                var zamfi = document.createElement("canvas");
                zamfi.width = zamfg;
                zamfi.height = zamfh;
                var zamfj = zamfi.getContext("2d");
                if (zamfa.flipY !== false) {
                    zamfj.translate(0, zamfh);
                    zamfj.scale(1, -1);
                }
                zamfj.drawImage(zamff, 0, 0, zamfg, zamfh);
                var zamfk = zamfi.toDataURL("image/png");
                zamfc = faoxombase64bytes(zamfk.slice(zamfk.indexOf(",") + 1));
            } else if (typeof zamfa.source === "string" && zamfa.source.indexOf("data:") === 0) {
                var zamfl = zamfa.source.slice(5, zamfa.source.indexOf(","));
                if (zamfl.indexOf("image/jpeg") !== -1) zamfe = "image/jpeg";
                zamfc = faoxombase64bytes(zamfa.source.slice(zamfa.source.indexOf(",") + 1));
            }
            if (!zamfc || !zamfc.byteLength) return null;
            if (zamfb.binary) {
                zamfd.images.push({
                    bufferView: zamfp(new Uint8Array(zamfc), undefined),
                    mimeType: zamfe
                });
            } else {
                zamfd.images.push({
                    uri: "data:" + zamfe + ";base64," + faoxombase64text(zamfc)
                });
            }
            return zamfd.images.length - 1;
        };
        var zamfs = function(zamfa) {
            var zamfb = function(zamfa) {
                return zamfa === "clamp" ? 33071 : zamfa === "mirror" ? 33648 : 10497;
            };
            var zamfc = function(zamfa, zamfb) {
                return zamfa === "nearest" ? zamfb ? 9728 : 9728 : zamfb && zamfa === "linearMipmapLinear" ? 9987 : zamfb && zamfa === "linear" ? 9986 : 9729;
            };
            var zamfe = zamfb(zamfa.wrapS) + ":" + zamfb(zamfa.wrapT) + ":" + zamfc(zamfa.minFilter, true) + ":" + zamfc(zamfa.magFilter, false);
            if (zamfi.has(zamfe)) return zamfi.get(zamfe);
            zamfd.samplers.push({
                wrapS: zamfb(zamfa.wrapS),
                wrapT: zamfb(zamfa.wrapT),
                minFilter: zamfc(zamfa.minFilter, true),
                magFilter: zamfc(zamfa.magFilter, false)
            });
            zamfi.set(zamfe, zamfd.samplers.length - 1);
            return zamfd.samplers.length - 1;
        };
        var zamft = function(zamfa) {
            if (!zamfa) return null;
            if (zamfh.has(zamfa)) return zamfh.get(zamfa);
            var zamfb = zamfr(zamfa);
            if (zamfb === null) return null;
            zamfd.textures.push({
                sampler: zamfs(zamfa),
                source: zamfb
            });
            zamfh.set(zamfa, zamfd.textures.length - 1);
            return zamfd.textures.length - 1;
        };
        var zamfu = function(zamfa, zamfb) {
            var zamfc = zamft(zamfa);
            if (zamfc === null) return null;
            var zamfd = {
                index: zamfc
            };
            if (zamfb) for (var zamfe in zamfb) zamfd[zamfe] = zamfb[zamfe];
            if (zamfa.offset && (zamfa.offset.x !== 0 || zamfa.offset.y !== 0) || zamfa.repeat && (zamfa.repeat.x !== 1 || zamfa.repeat.y !== 1) || zamfa.rotation) {
                var zamff = {};
                if (zamfa.offset && (zamfa.offset.x !== 0 || zamfa.offset.y !== 0)) zamff.offset = [ zamfa.offset.x, zamfa.offset.y ];
                if (zamfa.repeat && (zamfa.repeat.x !== 1 || zamfa.repeat.y !== 1)) zamff.scale = [ zamfa.repeat.x, zamfa.repeat.y ];
                if (zamfa.rotation) zamff.rotation = zamfa.rotation;
                zamfd.extensions = {
                    KHR_texture_transform: zamff
                };
                zamfn("KHR_texture_transform");
            }
            return zamfd;
        };
        var zamfv = function(zamfa) {
            if (!zamfa) return null;
            if (zamfg.has(zamfa)) return zamfg.get(zamfa);
            var zamfb = zamfa instanceof BasicMaterial;
            var zamfc = zamfa.color || {
                r: 1,
                g: 1,
                b: 1
            };
            var zamfe = zamfa.opacity === undefined ? 1 : zamfa.opacity;
            var zamff = zamfa.emissiveStrength === undefined ? 1 : zamfa.emissiveStrength;
            var zamfh = {
                name: zamfa.name || undefined,
                pbrMetallicRoughness: {
                    baseColorFactor: [ zamfc.r, zamfc.g, zamfc.b, zamfe ],
                    metallicFactor: zamfb ? 0 : zamfa.metalness === undefined ? 0 : zamfa.metalness,
                    roughnessFactor: zamfb ? 1 : zamfa.roughness === undefined ? .5 : zamfa.roughness
                }
            };
            var zamfi = zamfa.diffuseMap || zamfa.map;
            var zamfj = zamfu(zamfi);
            if (zamfj) zamfh.pbrMetallicRoughness.baseColorTexture = zamfj;
            var zamfk = zamfa.roughnessMap || zamfa.metalnessMap;
            var zamfl = zamfu(zamfk);
            if (zamfl) zamfh.pbrMetallicRoughness.metallicRoughnessTexture = zamfl;
            var zamfm = zamfu(zamfa.normalMap);
            if (zamfm) {
                zamfm.scale = zamfa.normalScale ? zamfa.normalScale.x : 1;
                zamfh.normalTexture = zamfm;
            }
            var zamfo = zamfu(zamfa.aoMap);
            if (zamfo) {
                zamfo.strength = zamfa.occlusionStrength === undefined ? 1 : zamfa.occlusionStrength;
                zamfh.occlusionTexture = zamfo;
            }
            var zamfp = zamfu(zamfa.emissiveMap);
            if (zamfp) zamfh.emissiveTexture = zamfp;
            if (zamfa.emissive && (zamfa.emissive.r || zamfa.emissive.g || zamfa.emissive.b)) zamfh.emissiveFactor = [ zamfa.emissive.r / zamff, zamfa.emissive.g / zamff, zamfa.emissive.b / zamff ];
            var zamfq = zamfa.alphaMode || (zamfa.transparent || zamfe < 1 ? "BLEND" : "OPAQUE");
            zamfh.alphaMode = zamfq;
            if (zamfq === "MASK") zamfh.alphaCutoff = zamfa.alphaCutoff === undefined ? .5 : zamfa.alphaCutoff;
            if (zamfa.doubleSided || zamfa.side === DoubleSide) zamfh.doubleSided = true;
            var zamfr = {};
            if (zamfb) {
                zamfr.KHR_materials_unlit = {};
                zamfn("KHR_materials_unlit");
            }
            if (!zamfb) {
                if (zamfa.clearcoat) {
                    zamfr.KHR_materials_clearcoat = {
                        clearcoatFactor: zamfa.clearcoat,
                        clearcoatRoughnessFactor: zamfa.clearcoatRoughness === undefined ? .03 : zamfa.clearcoatRoughness
                    };
                    zamfn("KHR_materials_clearcoat");
                }
                if (zamfa.sheen) {
                    zamfr.KHR_materials_sheen = {
                        sheenRoughnessFactor: zamfa.sheen,
                        sheenColorFactor: zamfa.sheenColor ? zamfa.sheenColor.r !== undefined ? [ zamfa.sheenColor.r, zamfa.sheenColor.g, zamfa.sheenColor.b ] : zamfa.sheenColor : [ 0, 0, 0 ]
                    };
                    zamfn("KHR_materials_sheen");
                }
                if (zamfa.transmission) {
                    zamfr.KHR_materials_transmission = {
                        transmissionFactor: zamfa.transmission
                    };
                    zamfn("KHR_materials_transmission");
                }
                if (zamfa.ior !== undefined && zamfa.ior !== 1.5) {
                    zamfr.KHR_materials_ior = {
                        ior: zamfa.ior
                    };
                    zamfn("KHR_materials_ior");
                }
                if (zamfa.iridescence) {
                    zamfr.KHR_materials_iridescence = {
                        iridescenceFactor: zamfa.iridescence,
                        iridescenceIor: zamfa.iridescenceIor === undefined ? 1.3 : zamfa.iridescenceIor,
                        iridescenceThicknessMinimum: zamfa.iridescenceThicknessMinimum === undefined ? 100 : zamfa.iridescenceThicknessMinimum,
                        iridescenceThicknessMaximum: zamfa.iridescenceThicknessMaximum === undefined ? 400 : zamfa.iridescenceThicknessMaximum
                    };
                    zamfn("KHR_materials_iridescence");
                }
                if (zamfa.anisotropy) {
                    zamfr.KHR_materials_anisotropy = {
                        anisotropyStrength: zamfa.anisotropy,
                        anisotropyRotation: zamfa.anisotropyRotation || 0
                    };
                    zamfn("KHR_materials_anisotropy");
                }
                if (zamff !== 1) {
                    zamfr.KHR_materials_emissive_strength = {
                        emissiveStrength: zamff
                    };
                    zamfn("KHR_materials_emissive_strength");
                }
            }
            for (var zamfs in zamfr) {
                if (!zamfh.extensions) zamfh.extensions = {};
                zamfh.extensions[zamfs] = zamfr[zamfs];
            }
            zamfd.materials.push(zamfh);
            zamfg.set(zamfa, zamfd.materials.length - 1);
            return zamfd.materials.length - 1;
        };
        var zamfw = function(zamfa) {
            if (!zamfl) {
                zamfl = [];
                zamfn("KHR_lights_punctual");
            }
            var zamfb = null;
            if (zamfa instanceof DirectionalLight) zamfb = {
                type: "directional"
            }; else if (zamfa instanceof PointLight) zamfb = {
                type: "point",
                range: zamfa.distance || 0
            }; else if (zamfa instanceof SpotLight) zamfb = {
                type: "spot",
                range: zamfa.distance || 0,
                spot: {
                    innerConeAngle: zamfa.angle * (1 - (zamfa.penumbra === undefined ? 0 : zamfa.penumbra)),
                    outerConeAngle: zamfa.angle
                }
            };
            if (!zamfb) return null;
            zamfb.color = [ zamfa.color.r, zamfa.color.g, zamfa.color.b ];
            zamfb.intensity = zamfa.intensity > 100 ? zamfa.intensity * 1e3 : zamfa.intensity;
            if (zamfa.name) zamfb.name = zamfa.name;
            zamfl.push(zamfb);
            return zamfl.length - 1;
        };
        var zamfx = function(zamfa, zamfb) {
            var zamfc = zamfa.attributes || {};
            var zamfe = {};
            var zamff = [ [ "position", "POSITION", 5126, true ], [ "normal", "NORMAL", 5126, false ], [ "tangent", "TANGENT", 5126, false ], [ "uv", "TEXCOORD_0", 5126, false ], [ "uv1", "TEXCOORD_1", 5126, false ], [ "uv2", "TEXCOORD_2", 5126, false ], [ "color", "COLOR_0", 5126, false ], [ "skinIndex", "JOINTS_0", 5123, false ], [ "skinWeight", "WEIGHTS_0", 5126, false ] ];
            for (var zamfg = 0; zamfg < zamff.length; zamfg++) {
                var zamfh = zamff[zamfg][0], zamfi = zamff[zamfg][1], zamfj = zamff[zamfg][2], zamfk = zamff[zamfg][3];
                var zamfl = zamfc[zamfh];
                if (!zamfl || !zamfl.array || !zamfl.array.length) continue;
                var zamfm = zamfl.array;
                var zamfn = zamfl.itemSize || (zamfi === "POSITION" || zamfi === "NORMAL" ? 3 : 2);
                var zamfo = zamfn === 1 ? "SCALAR" : zamfn === 2 ? "VEC2" : zamfn === 3 ? "VEC3" : "VEC4";
                var zamfp = zamfm;
                if (zamfj === 5126 && !(zamfm instanceof Float32Array)) zamfp = new Float32Array(zamfm); else if (zamfj === 5123 && !(zamfm instanceof Uint16Array)) zamfp = new Uint16Array(zamfm);
                zamfe[zamfi] = zamfq(zamfp, zamfj, zamfo, zamfp.length / zamfn, zamfk);
            }
            if (zamfe.POSITION === undefined) return null;
            var zamfr = {
                attributes: zamfe
            };
            var zamfs = zamfa.index && zamfa.index.array ? zamfa.index.array : zamfa.index;
            if (zamfs && zamfs.length) {
                var zamft = zamfs, zamfu = 0;
                for (var zamfv = 0; zamfv < zamft.length; zamfv++) if (zamft[zamfv] > zamfu) zamfu = zamft[zamfv];
                if (zamfu <= 65535) {
                    var zamfw = zamft instanceof Uint16Array ? zamft : new Uint16Array(zamft);
                    zamfr.indices = zamfq(zamfw, 5123, "SCALAR", zamfw.length, false);
                } else {
                    var zamfx = zamft instanceof Uint32Array ? zamft : new Uint32Array(zamft);
                    zamfr.indices = zamfq(zamfx, 5125, "SCALAR", zamfx.length, false);
                }
            }
            var zamfy = zamfa.morphAttributes || {};
            var zamfz = zamfy.position || [];
            if (zamfz.length) {
                var zamfaa = [];
                for (var zamfab = 0; zamfab < zamfz.length; zamfab++) {
                    var zamfac = {};
                    var zamfad = zamfz[zamfab].array instanceof Float32Array ? zamfz[zamfab].array : new Float32Array(zamfz[zamfab].array);
                    zamfac.POSITION = zamfq(zamfad, 5126, "VEC3", zamfad.length / 3, true);
                    var zamfae = zamfy.normal && zamfy.normal[zamfab];
                    if (zamfae && zamfae.array && zamfae.array.length) {
                        var zamfaf = zamfae.array instanceof Float32Array ? zamfae.array : new Float32Array(zamfae.array);
                        zamfac.NORMAL = zamfq(zamfaf, 5126, "VEC3", zamfaf.length / 3, false);
                    }
                    zamfaa.push(zamfac);
                }
                zamfr.targets = zamfaa;
            }
            var zamfag = {
                primitives: [ zamfr ]
            };
            if (zamfz.length) {
                if (zamfb && zamfb.morphTargetDictionary) {
                    var zamfah = new Array(zamfz.length);
                    for (var zamfai in zamfb.morphTargetDictionary) zamfah[zamfb.morphTargetDictionary[zamfai]] = zamfai;
                    zamfag.extras = {
                        targetNames: zamfah
                    };
                }
                if (zamfb && zamfb.morphTargetInfluences && zamfb.morphTargetInfluences.length) zamfag.weights = zamfb.morphTargetInfluences.slice();
            }
            zamfd.meshes.push(zamfag);
            return zamfd.meshes.length - 1;
        };
        var zamfy = function(zamfa) {
            return (zamfa instanceof Mesh || zamfa instanceof SkinnedMesh) && zamfa.geometry && zamfa.geometry.attributes && zamfa.geometry.attributes.position && zamfa.geometry.attributes.position.array && zamfa.geometry.attributes.position.array.length > 0 || zamfa.isPerspectiveCamera || zamfa.isOrthographicCamera || zamfa instanceof DirectionalLight || zamfa instanceof PointLight || zamfa instanceof SpotLight;
        };
        var zamfz = function(zamfa) {
            var zamfb = [];
            for (var zamfc = 0; zamfc < zamfa.children.length; zamfc++) {
                var zamfd = zamfz(zamfa.children[zamfc]);
                if (zamfd) zamfb.push(zamfd);
            }
            if (!zamfy(zamfa) && !zamfb.length && !zamfa.name) return null;
            return {
                object: zamfa,
                children: zamfb
            };
        };
        var zamfaa = function(zamfa, zamfb) {
            zamfb.push(zamfa.object);
            zamfk.set(zamfa.object, zamfa);
            for (var zamfc = 0; zamfc < zamfa.children.length; zamfc++) zamfaa(zamfa.children[zamfc], zamfb);
        };
        var zamfab = [];
        var zamfac = [];
        var zamfad = zamfa ? zamfa.children : [];
        for (var zamfae = 0; zamfae < zamfad.length; zamfae++) {
            var zamfaf = zamfz(zamfad[zamfae]);
            if (zamfaf) {
                zamfac.push(zamfaf);
                zamfaa(zamfaf, zamfab);
            }
        }
        for (var zamfag = 0; zamfag < zamfab.length; zamfag++) {
            zamfd.nodes.push({});
            zamfj.set(zamfab[zamfag], zamfag);
        }
        var zamfah = function(zamfa, zamfb, zamfc) {
            if (zamfa.name) zamfb.name = zamfa.name;
            var zamfe = zamfa.position, zamff = zamfa.quaternion, zamfg = zamfa.scale;
            if (zamfe && (zamfe.x !== 0 || zamfe.y !== 0 || zamfe.z !== 0)) zamfb.translation = [ zamfe.x, zamfe.y, zamfe.z ];
            if (zamff && (zamff.x !== 0 || zamff.y !== 0 || zamff.z !== 0 || zamff.w !== 1)) zamfb.rotation = [ zamff.x, zamff.y, zamff.z, zamff.w ];
            if (zamfg && (zamfg.x !== 1 || zamfg.y !== 1 || zamfg.z !== 1)) zamfb.scale = [ zamfg.x, zamfg.y, zamfg.z ];
            if ((zamfa instanceof Mesh || zamfa instanceof SkinnedMesh) && zamfa.geometry && zamfa.geometry.attributes && zamfa.geometry.attributes.position) {
                var zamfh = zamfx(zamfa.geometry, zamfa);
                if (zamfh !== null) {
                    zamfb.mesh = zamfh;
                    var zamfi = zamfv(zamfa.material);
                    if (zamfi !== null) zamfd.meshes[zamfh].primitives[0].material = zamfi;
                    if (zamfa instanceof SkinnedMesh && zamfa.skeleton && zamfa.skeleton.bones && zamfa.skeleton.bones.length) {
                        var zamfk = [], zamfl = true;
                        for (var zamfm = 0; zamfm < zamfa.skeleton.bones.length; zamfm++) {
                            var zamfn = zamfj.get(zamfa.skeleton.bones[zamfm]);
                            if (zamfn === undefined) {
                                zamfl = false;
                                break;
                            }
                            zamfk.push(zamfn);
                        }
                        if (zamfl) {
                            var zamfo = zamfa.skeleton.boneInverses && zamfa.skeleton.boneInverses.length ? zamfa.skeleton.boneInverses : null;
                            var zamfp = new Float32Array(zamfa.skeleton.bones.length * 16);
                            for (var zamfr = 0; zamfr < zamfa.skeleton.bones.length; zamfr++) {
                                var zamfs = zamfo ? zamfo[zamfr] : zamfa.skeleton.bones[zamfr].matrixWorld;
                                if (zamfs && zamfs.elements) zamfp.set(zamfs.elements, zamfr * 16);
                            }
                            var zamft = zamfq(zamfp, 5126, "MAT4", zamfa.skeleton.bones.length, false);
                            zamfd.skins.push({
                                joints: zamfk,
                                inverseBindMatrices: zamft
                            });
                            zamfb.skin = zamfd.skins.length - 1;
                        }
                    }
                }
            }
            if (zamfa.isPerspectiveCamera) {
                zamfd.cameras.push({
                    type: "perspective",
                    perspective: {
                        yfov: (zamfa.fov || 50) * Math.PI / 180,
                        aspectRatio: zamfa.aspect || 1,
                        znear: zamfa.near || .1,
                        zfar: zamfa.far || 2e3
                    }
                });
                zamfb.camera = zamfd.cameras.length - 1;
            } else if (zamfa.isOrthographicCamera) {
                zamfd.cameras.push({
                    type: "orthographic",
                    orthographic: {
                        xmag: Math.abs(zamfa.right || 1),
                        ymag: Math.abs(zamfa.top || 1),
                        znear: zamfa.near || .1,
                        zfar: zamfa.far || 2e3
                    }
                });
                zamfb.camera = zamfd.cameras.length - 1;
            }
            if (zamfa instanceof DirectionalLight || zamfa instanceof PointLight || zamfa instanceof SpotLight) {
                var zamfu = zamfw(zamfa);
                if (zamfu !== null) {
                    zamfb.extensions = {
                        KHR_lights_punctual: {
                            light: zamfu
                        }
                    };
                }
            }
            var zamfy = [];
            for (var zamfz = 0; zamfz < zamfc.children.length; zamfz++) zamfy.push(zamfj.get(zamfc.children[zamfz].object));
            if (zamfy.length) zamfb.children = zamfy;
        };
        for (var zamfai = 0; zamfai < zamfab.length; zamfai++) zamfah(zamfab[zamfai], zamfd.nodes[zamfai], zamfk.get(zamfab[zamfai]));
        for (var zamfaj = 0; zamfaj < zamfac.length; zamfaj++) zamfd.scenes[0].nodes.push(zamfj.get(zamfac[zamfaj].object));
        if (zamfl) zamfd.extensions = {
            KHR_lights_punctual: {
                lights: zamfl
            }
        };
        var zamfak = zamfb.animations || zamfa && zamfa.userData && zamfa.userData.animations || [];
        if (zamfak && zamfak.length) zamfc.processAnimations(zamfak, zamfd, zamfj, zamfq, zamfn);
        if (!zamfd.extensionsUsed.length) delete zamfd.extensionsUsed;
        if (!zamfd.images.length) delete zamfd.images;
        if (!zamfd.textures.length) delete zamfd.textures;
        if (!zamfd.samplers.length) delete zamfd.samplers;
        if (!zamfd.cameras.length) delete zamfd.cameras;
        if (!zamfd.animations.length) delete zamfd.animations;
        if (!zamfd.skins.length) delete zamfd.skins;
        if (!zamfd.materials.length) delete zamfd.materials;
        if (!zamfd.meshes.length) delete zamfd.meshes;
        var zamfal = new Uint8Array(zamfe);
        if (zamfb.binary) {
            if (zamfal.byteLength) zamfd.buffers.push({
                byteLength: zamfal.byteLength
            }); else delete zamfd.buffers;
            var zamfam = JSON.stringify(zamfd);
            var zamfan = (new TextEncoder).encode(zamfam);
            var zamfao = (4 - zamfan.byteLength % 4) % 4;
            var zamfap = (4 - zamfal.byteLength % 4) % 4;
            var zamfaq = zamfal.byteLength > 0;
            var zamfar = 12 + 8 + zamfan.byteLength + zamfao + (zamfaq ? 8 + zamfal.byteLength + zamfap : 0);
            var zamfas = new ArrayBuffer(zamfar);
            var zamfat = new DataView(zamfas);
            zamfat.setUint32(0, 1179937895, true);
            zamfat.setUint32(4, 2, true);
            zamfat.setUint32(8, zamfar, true);
            var zamfau = 12;
            zamfat.setUint32(zamfau, zamfan.byteLength + zamfao, true);
            zamfat.setUint32(zamfau + 4, 1313821514, true);
            zamfau += 8;
            new Uint8Array(zamfas, zamfau, zamfan.byteLength).set(zamfan);
            for (var zamfav = 0; zamfav < zamfao; zamfav++) zamfat.setUint8(zamfau + zamfan.byteLength + zamfav, 32);
            zamfau += zamfan.byteLength + zamfao;
            if (zamfaq) {
                zamfat.setUint32(zamfau, zamfal.byteLength + zamfap, true);
                zamfat.setUint32(zamfau + 4, 5130562, true);
                zamfau += 8;
                new Uint8Array(zamfas, zamfau, zamfal.byteLength).set(zamfal);
            }
            return zamfas;
        }
        if (zamfal.byteLength) {
            var zamfaw = faoxombase64text(zamfal);
            zamfd.buffers.push({
                byteLength: zamfal.byteLength,
                uri: "data:application/octet-stream;base64," + zamfaw
            });
        } else delete zamfd.buffers;
        return zamfd;
    }
    processAnimations(zamfa, zamfb, zamfc, zamfd, zamfe) {
        var zamff = {};
        zamfc.forEach(function(zamfa, zamfb) {
            if (zamfb.name && zamff[zamfb.name] === undefined) zamff[zamfb.name] = zamfa;
        });
        var zamfg = function(zamfa, zamfb) {
            if (!zamfa || !zamfb || zamfa.length !== zamfb.length) return false;
            for (var zamfc = 0; zamfc < zamfa.length; zamfc++) if (zamfa[zamfc] !== zamfb[zamfc]) return false;
            return true;
        };
        for (var zamfh = 0; zamfh < zamfa.length; zamfh++) {
            var zamfi = zamfa[zamfh];
            var zamfj = [], zamfk = [];
            var zamfl = {}, zamfm = {}, zamfn = {};
            for (var zamfo = 0; zamfo < zamfi.tracks.length; zamfo++) {
                var zamfp = zamfi.tracks[zamfo];
                var zamfq = zamfp.name || "";
                var zamfr = "userData.pointerTargets.";
                if (zamfq.indexOf(zamfr) === 0) {
                    var zamfs = zamfq.slice(zamfr.length);
                    var zamft = zamfs.indexOf(".");
                    if (zamft === -1) continue;
                    var zamfu = zamfs.slice(0, zamft), zamfv = zamfs.slice(zamft + 1);
                    var zamfw = /^(material|light)([0-9]+)$/.exec(zamfu);
                    if (!zamfw) continue;
                    if (zamfv === "color") zamfl[zamfw[1] + zamfw[2]] = zamfp; else if (zamfv === "opacity") zamfm[zamfw[1] + zamfw[2]] = zamfp; else zamfn[zamfu + "." + zamfv] = zamfp;
                    continue;
                }
                var zamfx = zamfq.lastIndexOf(".");
                if (zamfx === -1) continue;
                var zamfy = zamfq.slice(0, zamfx), zamfv = zamfq.slice(zamfx + 1);
                var zamfz = zamff[zamfy];
                if (zamfz === undefined) continue;
                var zamfaa = null, zamfab = null;
                if (zamfv === "position") {
                    zamfaa = "translation";
                    zamfab = "VEC3";
                } else if (zamfv === "scale") {
                    zamfaa = "scale";
                    zamfab = "VEC3";
                } else if (zamfv === "rotation" || zamfv === "quaternion") {
                    zamfaa = "rotation";
                    zamfab = "VEC4";
                } else if (zamfv === "weights") {
                    zamfaa = "weights";
                    zamfab = "SCALAR";
                }
                if (!zamfaa || !zamfp.times || !zamfp.times.length) continue;
                var zamfac = zamfd(new Float32Array(zamfp.times), 5126, "SCALAR", zamfp.times.length, false);
                var zamfad = zamfp.values && zamfp.values.length ? zamfp.values : [];
                var zamfae = zamfaa === "weights" ? zamfad.length : zamfad.length / (zamfab === "VEC4" ? 4 : zamfab === "VEC3" ? 3 : zamfab === "VEC2" ? 2 : 1);
                var zamfaf = zamfd(new Float32Array(zamfad), 5126, zamfab, zamfae, false);
                zamfk.push({
                    input: zamfac,
                    output: zamfaf,
                    interpolation: zamfp.interpolation === "STEP" || zamfp.interpolation === "CUBICSPLINE" ? zamfp.interpolation : "LINEAR"
                });
                zamfj.push({
                    sampler: zamfk.length - 1,
                    target: {
                        node: zamfz,
                        path: zamfaa
                    }
                });
            }
            var zamfag = function(zamfa, zamfc, zamff, zamfg, zamfh, zamfi, zamfl) {
                var zamfm = /^(material|light)([0-9]+)$/.exec(zamfa);
                if (!zamfm) return;
                var zamfn = null;
                if (zamfm[1] === "material") {
                    var zamfo = Number(zamfm[2]);
                    if (zamfb.materials && zamfb.materials[zamfo]) {
                        if (zamfc === "baseColorFactor") zamfn = "/materials/" + zamfo + "/pbrMetallicRoughness/baseColorFactor"; else if (zamfc === "metallicFactor") zamfn = "/materials/" + zamfo + "/pbrMetallicRoughness/metallicFactor"; else if (zamfc === "roughnessFactor") zamfn = "/materials/" + zamfo + "/pbrMetallicRoughness/roughnessFactor"; else if (zamfc === "alphaCutoff") zamfn = "/materials/" + zamfo + "/alphaCutoff"; else if (zamfc === "emissiveFactor") zamfn = "/materials/" + zamfo + "/emissiveFactor";
                    }
                } else {
                    var zamfp = Number(zamfm[2]);
                    if (zamfb.extensions && zamfb.extensions.KHR_lights_punctual && zamfb.extensions.KHR_lights_punctual.lights[zamfp]) zamfn = "/extensions/KHR_lights_punctual/lights/" + zamfp + "/" + zamfc;
                }
                if (!zamfn || !zamfi || !zamfi.length) return;
                var zamfq = zamfd(new Float32Array(zamfi), 5126, "SCALAR", zamfi.length, false);
                var zamfr = zamfd(new Float32Array(zamff), 5126, zamfg, zamfh, false);
                zamfk.push({
                    input: zamfq,
                    output: zamfr,
                    interpolation: zamfl === "STEP" || zamfl === "CUBICSPLINE" ? zamfl : "LINEAR"
                });
                zamfj.push({
                    sampler: zamfk.length - 1,
                    target: {
                        extensions: {
                            KHR_animation_pointer: {
                                pointer: zamfn
                            }
                        }
                    }
                });
                zamfe("KHR_animation_pointer");
            };
            for (var zamfah in zamfl) {
                var zamfai = zamfl[zamfah], zamfaj = zamfm[zamfah];
                var zamfak = zamfb.materials && zamfb.materials[Number(/^[a-z]+([0-9]+)$/.exec(zamfah)[1])];
                var zamfal = zamfak && zamfak.pbrMetallicRoughness && zamfak.pbrMetallicRoughness.baseColorFactor || [ 1, 1, 1, 1 ];
                var zamfam = zamfai.times, zamfan = new Array(zamfam.length * 4);
                for (var zamfao = 0; zamfao < zamfam.length; zamfao++) {
                    zamfan[zamfao * 4] = zamfai.values[zamfao * 3];
                    zamfan[zamfao * 4 + 1] = zamfai.values[zamfao * 3 + 1];
                    zamfan[zamfao * 4 + 2] = zamfai.values[zamfao * 3 + 2];
                    zamfan[zamfao * 4 + 3] = zamfaj && zamfg(zamfaj.times, zamfam) ? zamfaj.values[zamfao] : zamfal[3];
                }
                zamfag(zamfah, "baseColorFactor", zamfan, "VEC4", zamfam.length, zamfam, zamfai.interpolation);
            }
            for (var zamfap in zamfm) {
                if (zamfl[zamfap]) continue;
                var zamfaq = zamfm[zamfap];
                var zamfar = zamfb.materials && zamfb.materials[Number(/^[a-z]+([0-9]+)$/.exec(zamfap)[1])];
                var zamfas = zamfar && zamfar.pbrMetallicRoughness && zamfar.pbrMetallicRoughness.baseColorFactor || [ 1, 1, 1, 1 ];
                var zamfat = zamfaq.times, zamfau = new Array(zamfat.length * 4);
                for (var zamfav = 0; zamfav < zamfat.length; zamfav++) {
                    zamfau[zamfav * 4] = zamfas[0];
                    zamfau[zamfav * 4 + 1] = zamfas[1];
                    zamfau[zamfav * 4 + 2] = zamfas[2];
                    zamfau[zamfav * 4 + 3] = zamfaq.values[zamfav];
                }
                zamfag(zamfap, "baseColorFactor", zamfau, "VEC4", zamfat.length, zamfat, zamfaq.interpolation);
            }
            for (var zamfaw in zamfn) {
                var zamfax = zamfn[zamfaw];
                var zamfay = zamfaw.indexOf(".");
                var zamfaz = zamfaw.slice(0, zamfay), zamfba = zamfaw.slice(zamfay + 1);
                var zamfbb = zamfba === "metalness" ? "metallicFactor" : zamfba === "roughness" ? "roughnessFactor" : zamfba === "emissive" ? "emissiveFactor" : zamfba === "intensity" ? "intensity" : zamfba === "color" ? "color" : zamfba === "alphaCutoff" ? "alphaCutoff" : null;
                if (!zamfbb) continue;
                var zamfbc = zamfbb === "emissiveFactor" || zamfbb === "color" ? "VEC3" : "SCALAR";
                var zamfbd = zamfbc === "VEC3" ? 3 : 1;
                zamfag(zamfaz, zamfbb, zamfax.values, zamfbc, zamfax.values.length / zamfbd, zamfax.times, zamfax.interpolation);
            }
            if (zamfj.length) zamfb.animations.push({
                name: zamfi.name || "animation" + zamfh,
                channels: zamfj,
                samplers: zamfk
            });
        }
    }
}

export { GLTFExporter };
