import { DoubleSide, faoxombase64bytes, faoxombase64text } from "../core/index.js";
import { DirectionalLight, PointLight, SpotLight } from "../lights/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Mesh, SkinnedMesh } from "../objects/index.js";

class GLTFExporter {
    parse(scene, onDone, onError, options) {
        try {
            var result = this.process(scene, options || {});
            if (onDone) onDone(result);
            return result;
        } catch (error) {
            if (onError) onError(error);
            return null;
        }
    }
    process(scene, options) {
        var self = this;
        var json = { asset: { generator: "FaoxomJS GLTFExporter", version: "2.0" }, scene: 0, scenes: [{ nodes: [] }], extensionsUsed: [], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [], images: [], textures: [], samplers: [], cameras: [], animations: [], skins: [] };
        var chunks = [], byteLength = 0, materialCache = new Map(), textureCache = new Map(), samplerCache = new Map(), nodeMap = new Map(), treeMap = new Map(), lights = null;
        var componentSizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
        var useExtension = function(name) { if (json.extensionsUsed.indexOf(name) === -1) json.extensionsUsed.push(name); };
        var pad4 = function() { while (byteLength % 4 !== 0) { chunks.push(0); byteLength++; } };
        var addView = function(bytes, target) {
            pad4();
            var view = { buffer: 0, byteOffset: byteLength, byteLength: bytes.byteLength };
            if (target) view.target = target;
            for (var i = 0; i < bytes.length; i++) chunks.push(bytes[i]);
            byteLength += bytes.length;
            json.bufferViews.push(view);
            return json.bufferViews.length - 1;
        };
        var addAccessor = function(array, componentType, type, count, bounds) {
            var bytes = new Uint8Array(array.buffer instanceof ArrayBuffer ? array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength) : array.buffer);
            var view = addView(bytes, componentType === 5125 ? 34963 : 34962);
            var accessor = { bufferView: view, byteOffset: 0, componentType: componentType, count: count, type: type };
            if (bounds) {
                var size = componentSizes[type], min = [], max = [];
                for (var c = 0; c < size; c++) { min.push(Infinity); max.push(-Infinity); }
                for (var i = 0; i < count; i++) for (var c2 = 0; c2 < size; c2++) { var v = array[i * size + c2]; if (v < min[c2]) min[c2] = v; if (v > max[c2]) max[c2] = v; }
                accessor.min = min;
                accessor.max = max;
            }
            json.accessors.push(accessor);
            return json.accessors.length - 1;
        };
        var imageFromTexture = function(texture) {
            if (!texture) return null;
            var bytes = null, mimeType = "image/png";
            var image = texture.image;
            if (image && (image.width || image.height) && typeof document !== "undefined" && document.createElement) {
                var width = image.videoWidth || image.width || 4, height = image.videoHeight || image.height || 4;
                var canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                var ctx = canvas.getContext("2d");
                if (texture.flipY !== false) { ctx.translate(0, height); ctx.scale(1, -1); }
                ctx.drawImage(image, 0, 0, width, height);
                var uri = canvas.toDataURL("image/png");
                bytes = faoxombase64bytes(uri.slice(uri.indexOf(",") + 1));
            } else if (typeof texture.source === "string" && texture.source.indexOf("data:") === 0) {
                var header = texture.source.slice(5, texture.source.indexOf(","));
                if (header.indexOf("image/jpeg") !== -1) mimeType = "image/jpeg";
                bytes = faoxombase64bytes(texture.source.slice(texture.source.indexOf(",") + 1));
            }
            if (!bytes || !bytes.byteLength) return null;
            if (options.binary) {
                json.images.push({ bufferView: addView(new Uint8Array(bytes), undefined), mimeType: mimeType });
            } else {
                json.images.push({ uri: "data:" + mimeType + ";base64," + faoxombase64text(bytes) });
            }
            return json.images.length - 1;
        };
        var samplerFor = function(texture) {
            var wrap = function(value) { return value === "clamp" ? 33071 : value === "mirror" ? 33648 : 10497; };
            var filter = function(value, mipmap) { return value === "nearest" ? (mipmap ? 9728 : 9728) : mipmap && value === "linearMipmapLinear" ? 9987 : mipmap && value === "linear" ? 9986 : 9729; };
            var key = wrap(texture.wrapS) + ":" + wrap(texture.wrapT) + ":" + filter(texture.minFilter, true) + ":" + filter(texture.magFilter, false);
            if (samplerCache.has(key)) return samplerCache.get(key);
            json.samplers.push({ wrapS: wrap(texture.wrapS), wrapT: wrap(texture.wrapT), minFilter: filter(texture.minFilter, true), magFilter: filter(texture.magFilter, false) });
            samplerCache.set(key, json.samplers.length - 1);
            return json.samplers.length - 1;
        };
        var textureFor = function(texture) {
            if (!texture) return null;
            if (textureCache.has(texture)) return textureCache.get(texture);
            var source = imageFromTexture(texture);
            if (source === null) return null;
            json.textures.push({ sampler: samplerFor(texture), source: source });
            textureCache.set(texture, json.textures.length - 1);
            return json.textures.length - 1;
        };
        var textureInfo = function(texture, extra) {
            var index = textureFor(texture);
            if (index === null) return null;
            var info = { index: index };
            if (extra) for (var key in extra) info[key] = extra[key];
            if (texture.offset && (texture.offset.x !== 0 || texture.offset.y !== 0) || texture.repeat && (texture.repeat.x !== 1 || texture.repeat.y !== 1) || texture.rotation) {
                var transform = {};
                if (texture.offset && (texture.offset.x !== 0 || texture.offset.y !== 0)) transform.offset = [texture.offset.x, texture.offset.y];
                if (texture.repeat && (texture.repeat.x !== 1 || texture.repeat.y !== 1)) transform.scale = [texture.repeat.x, texture.repeat.y];
                if (texture.rotation) transform.rotation = texture.rotation;
                info.extensions = { KHR_texture_transform: transform };
                useExtension("KHR_texture_transform");
            }
            return info;
        };
        var materialFor = function(material) {
            if (!material) return null;
            if (materialCache.has(material)) return materialCache.get(material);
            var isUnlit = material instanceof BasicMaterial;
            var color = material.color || { r: 1, g: 1, b: 1 };
            var opacity = material.opacity === undefined ? 1 : material.opacity;
            var emissiveStrength = material.emissiveStrength === undefined ? 1 : material.emissiveStrength;
            var definition = { name: material.name || undefined, pbrMetallicRoughness: { baseColorFactor: [color.r, color.g, color.b, opacity], metallicFactor: isUnlit ? 0 : (material.metalness === undefined ? 0 : material.metalness), roughnessFactor: isUnlit ? 1 : (material.roughness === undefined ? 0.5 : material.roughness) } };
            var baseMap = material.diffuseMap || material.map;
            var baseInfo = textureInfo(baseMap);
            if (baseInfo) definition.pbrMetallicRoughness.baseColorTexture = baseInfo;
            var roughnessMap = material.roughnessMap || material.metalnessMap;
            var roughnessInfo = textureInfo(roughnessMap);
            if (roughnessInfo) definition.pbrMetallicRoughness.metallicRoughnessTexture = roughnessInfo;
            var normalInfo = textureInfo(material.normalMap);
            if (normalInfo) { normalInfo.scale = material.normalScale ? material.normalScale.x : 1; definition.normalTexture = normalInfo; }
            var occlusionInfo = textureInfo(material.aoMap);
            if (occlusionInfo) { occlusionInfo.strength = material.occlusionStrength === undefined ? 1 : material.occlusionStrength; definition.occlusionTexture = occlusionInfo; }
            var emissiveInfo = textureInfo(material.emissiveMap);
            if (emissiveInfo) definition.emissiveTexture = emissiveInfo;
            if (material.emissive && (material.emissive.r || material.emissive.g || material.emissive.b)) definition.emissiveFactor = [material.emissive.r / emissiveStrength, material.emissive.g / emissiveStrength, material.emissive.b / emissiveStrength];
            var alphaMode = material.alphaMode || (material.transparent || opacity < 1 ? "BLEND" : "OPAQUE");
            definition.alphaMode = alphaMode;
            if (alphaMode === "MASK") definition.alphaCutoff = material.alphaCutoff === undefined ? 0.5 : material.alphaCutoff;
            if (material.doubleSided || material.side === DoubleSide) definition.doubleSided = true;
            var extensions = {};
            if (isUnlit) { extensions.KHR_materials_unlit = {}; useExtension("KHR_materials_unlit"); }
            if (!isUnlit) {
                if (material.clearcoat) { extensions.KHR_materials_clearcoat = { clearcoatFactor: material.clearcoat, clearcoatRoughnessFactor: material.clearcoatRoughness === undefined ? 0.03 : material.clearcoatRoughness }; useExtension("KHR_materials_clearcoat"); }
                if (material.sheen) { extensions.KHR_materials_sheen = { sheenRoughnessFactor: material.sheen, sheenColorFactor: material.sheenColor ? (material.sheenColor.r !== undefined ? [material.sheenColor.r, material.sheenColor.g, material.sheenColor.b] : material.sheenColor) : [0, 0, 0] }; useExtension("KHR_materials_sheen"); }
                if (material.transmission) { extensions.KHR_materials_transmission = { transmissionFactor: material.transmission }; useExtension("KHR_materials_transmission"); }
                if (material.ior !== undefined && material.ior !== 1.5) { extensions.KHR_materials_ior = { ior: material.ior }; useExtension("KHR_materials_ior"); }
                if (material.iridescence) { extensions.KHR_materials_iridescence = { iridescenceFactor: material.iridescence, iridescenceIor: material.iridescenceIor === undefined ? 1.3 : material.iridescenceIor, iridescenceThicknessMinimum: material.iridescenceThicknessMinimum === undefined ? 100 : material.iridescenceThicknessMinimum, iridescenceThicknessMaximum: material.iridescenceThicknessMaximum === undefined ? 400 : material.iridescenceThicknessMaximum }; useExtension("KHR_materials_iridescence"); }
                if (material.anisotropy) { extensions.KHR_materials_anisotropy = { anisotropyStrength: material.anisotropy, anisotropyRotation: material.anisotropyRotation || 0 }; useExtension("KHR_materials_anisotropy"); }
                if (emissiveStrength !== 1) { extensions.KHR_materials_emissive_strength = { emissiveStrength: emissiveStrength }; useExtension("KHR_materials_emissive_strength"); }
            }
            for (var extensionName in extensions) { if (!definition.extensions) definition.extensions = {}; definition.extensions[extensionName] = extensions[extensionName]; }
            json.materials.push(definition);
            materialCache.set(material, json.materials.length - 1);
            return json.materials.length - 1;
        };
        var lightIndexFor = function(light) {
            if (!lights) { lights = []; useExtension("KHR_lights_punctual"); }
            var definition = null;
            if (light instanceof DirectionalLight) definition = { type: "directional" };
            else if (light instanceof PointLight) definition = { type: "point", range: light.distance || 0 };
            else if (light instanceof SpotLight) definition = { type: "spot", range: light.distance || 0, spot: { innerConeAngle: light.angle * (1 - (light.penumbra === undefined ? 0 : light.penumbra)), outerConeAngle: light.angle } };
            if (!definition) return null;
            definition.color = [light.color.r, light.color.g, light.color.b];
            definition.intensity = light.intensity > 100 ? light.intensity * 1000 : light.intensity;
            if (light.name) definition.name = light.name;
            lights.push(definition);
            return lights.length - 1;
        };
        var processGeometry = function(geometry, meshObject) {
            var attributes = geometry.attributes || {};
            var attributeDefs = {};
            var attributeMap = [["position", "POSITION", 5126, true], ["normal", "NORMAL", 5126, false], ["tangent", "TANGENT", 5126, false], ["uv", "TEXCOORD_0", 5126, false], ["uv1", "TEXCOORD_1", 5126, false], ["uv2", "TEXCOORD_2", 5126, false], ["color", "COLOR_0", 5126, false], ["skinIndex", "JOINTS_0", 5123, false], ["skinWeight", "WEIGHTS_0", 5126, false]];
            for (var i = 0; i < attributeMap.length; i++) {
                var name = attributeMap[i][0], semantic = attributeMap[i][1], componentType = attributeMap[i][2], bounds = attributeMap[i][3];
                var attribute = attributes[name];
                if (!attribute || !attribute.array || !attribute.array.length) continue;
                var array = attribute.array;
                var itemSize = attribute.itemSize || (semantic === "POSITION" || semantic === "NORMAL" ? 3 : 2);
                var type = itemSize === 1 ? "SCALAR" : itemSize === 2 ? "VEC2" : itemSize === 3 ? "VEC3" : "VEC4";
                var exportArray = array;
                if (componentType === 5126 && !(array instanceof Float32Array)) exportArray = new Float32Array(array);
                else if (componentType === 5123 && !(array instanceof Uint16Array)) exportArray = new Uint16Array(array);
                attributeDefs[semantic] = addAccessor(exportArray, componentType, type, exportArray.length / itemSize, bounds);
            }
            if (attributeDefs.POSITION === undefined) return null;
            var primitive = { attributes: attributeDefs };
            var indexSource = geometry.index && geometry.index.array ? geometry.index.array : geometry.index;
            if (indexSource && indexSource.length) {
                var indexArray = indexSource, maxIndex = 0;
                for (var i2 = 0; i2 < indexArray.length; i2++) if (indexArray[i2] > maxIndex) maxIndex = indexArray[i2];
                if (maxIndex <= 65535) { var index16 = indexArray instanceof Uint16Array ? indexArray : new Uint16Array(indexArray); primitive.indices = addAccessor(index16, 5123, "SCALAR", index16.length, false); }
                else { var index32 = indexArray instanceof Uint32Array ? indexArray : new Uint32Array(indexArray); primitive.indices = addAccessor(index32, 5125, "SCALAR", index32.length, false); }
            }
            var morphAttributes = geometry.morphAttributes || {};
            var morphPosition = morphAttributes.position || [];
            if (morphPosition.length) {
                var targets = [];
                for (var t = 0; t < morphPosition.length; t++) {
                    var target = {};
                    var morphArray = morphPosition[t].array instanceof Float32Array ? morphPosition[t].array : new Float32Array(morphPosition[t].array);
                    target.POSITION = addAccessor(morphArray, 5126, "VEC3", morphArray.length / 3, true);
                    var morphNormal = morphAttributes.normal && morphAttributes.normal[t];
                    if (morphNormal && morphNormal.array && morphNormal.array.length) {
                        var morphNormalArray = morphNormal.array instanceof Float32Array ? morphNormal.array : new Float32Array(morphNormal.array);
                        target.NORMAL = addAccessor(morphNormalArray, 5126, "VEC3", morphNormalArray.length / 3, false);
                    }
                    targets.push(target);
                }
                primitive.targets = targets;
            }
            var meshDefinition = { primitives: [primitive] };
            if (morphPosition.length) {
                if (meshObject && meshObject.morphTargetDictionary) {
                    var names = new Array(morphPosition.length);
                    for (var dictName in meshObject.morphTargetDictionary) names[meshObject.morphTargetDictionary[dictName]] = dictName;
                    meshDefinition.extras = { targetNames: names };
                }
                if (meshObject && meshObject.morphTargetInfluences && meshObject.morphTargetInfluences.length) meshDefinition.weights = meshObject.morphTargetInfluences.slice();
            }
            json.meshes.push(meshDefinition);
            return json.meshes.length - 1;
        };
        var hasExportableContent = function(object) {
            return (object instanceof Mesh || object instanceof SkinnedMesh) && object.geometry && object.geometry.attributes && object.geometry.attributes.position && object.geometry.attributes.position.array && object.geometry.attributes.position.array.length > 0 || object.isPerspectiveCamera || object.isOrthographicCamera || object instanceof DirectionalLight || object instanceof PointLight || object instanceof SpotLight;
        };
        var buildTree = function(object) {
            var kids = [];
            for (var i = 0; i < object.children.length; i++) {
                var child = buildTree(object.children[i]);
                if (child) kids.push(child);
            }
            if (!hasExportableContent(object) && !kids.length && !object.name) return null;
            return { object: object, children: kids };
        };
        var flatten = function(tree, list) {
            list.push(tree.object);
            treeMap.set(tree.object, tree);
            for (var i = 0; i < tree.children.length; i++) flatten(tree.children[i], list);
        };
        var exportList = [];
        var trees = [];
        var rootChildren = scene ? scene.children : [];
        for (var r = 0; r < rootChildren.length; r++) {
            var tree = buildTree(rootChildren[r]);
            if (tree) { trees.push(tree); flatten(tree, exportList); }
        }
        for (var n = 0; n < exportList.length; n++) { json.nodes.push({}); nodeMap.set(exportList[n], n); }
        var fillNode = function(object, node, tree) {
            if (object.name) node.name = object.name;
            var position = object.position, quaternion = object.quaternion, scale = object.scale;
            if (position && (position.x !== 0 || position.y !== 0 || position.z !== 0)) node.translation = [position.x, position.y, position.z];
            if (quaternion && (quaternion.x !== 0 || quaternion.y !== 0 || quaternion.z !== 0 || quaternion.w !== 1)) node.rotation = [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
            if (scale && (scale.x !== 1 || scale.y !== 1 || scale.z !== 1)) node.scale = [scale.x, scale.y, scale.z];
            if ((object instanceof Mesh || object instanceof SkinnedMesh) && object.geometry && object.geometry.attributes && object.geometry.attributes.position) {
                var meshIndex = processGeometry(object.geometry, object);
                if (meshIndex !== null) {
                    node.mesh = meshIndex;
                    var materialIndex = materialFor(object.material);
                    if (materialIndex !== null) json.meshes[meshIndex].primitives[0].material = materialIndex;
                    if (object instanceof SkinnedMesh && object.skeleton && object.skeleton.bones && object.skeleton.bones.length) {
                        var joints = [], valid = true;
                        for (var b = 0; b < object.skeleton.bones.length; b++) {
                            var boneIndex = nodeMap.get(object.skeleton.bones[b]);
                            if (boneIndex === undefined) { valid = false; break; }
                            joints.push(boneIndex);
                        }
                        if (valid) {
                            var inverses = object.skeleton.boneInverses && object.skeleton.boneInverses.length ? object.skeleton.boneInverses : null;
                            var ibm = new Float32Array(object.skeleton.bones.length * 16);
                            for (var ib = 0; ib < object.skeleton.bones.length; ib++) {
                                var source = inverses ? inverses[ib] : object.skeleton.bones[ib].matrixWorld;
                                if (source && source.elements) ibm.set(source.elements, ib * 16);
                            }
                            var ibmAccessor = addAccessor(ibm, 5126, "MAT4", object.skeleton.bones.length, false);
                            json.skins.push({ joints: joints, inverseBindMatrices: ibmAccessor });
                            node.skin = json.skins.length - 1;
                        }
                    }
                }
            }
            if (object.isPerspectiveCamera) {
                json.cameras.push({ type: "perspective", perspective: { yfov: (object.fov || 50) * Math.PI / 180, aspectRatio: object.aspect || 1, znear: object.near || 0.1, zfar: object.far || 2000 } });
                node.camera = json.cameras.length - 1;
            } else if (object.isOrthographicCamera) {
                json.cameras.push({ type: "orthographic", orthographic: { xmag: Math.abs(object.right || 1), ymag: Math.abs(object.top || 1), znear: object.near || 0.1, zfar: object.far || 2000 } });
                node.camera = json.cameras.length - 1;
            }
            if (object instanceof DirectionalLight || object instanceof PointLight || object instanceof SpotLight) {
                var lightIndex = lightIndexFor(object);
                if (lightIndex !== null) { node.extensions = { KHR_lights_punctual: { light: lightIndex } }; }
            }
            var childNodes = [];
            for (var c = 0; c < tree.children.length; c++) childNodes.push(nodeMap.get(tree.children[c].object));
            if (childNodes.length) node.children = childNodes;
        };
        for (var f = 0; f < exportList.length; f++) fillNode(exportList[f], json.nodes[f], treeMap.get(exportList[f]));
        for (var t2 = 0; t2 < trees.length; t2++) json.scenes[0].nodes.push(nodeMap.get(trees[t2].object));
        if (lights) json.extensions = { KHR_lights_punctual: { lights: lights } };
        var clips = options.animations || scene && scene.userData && scene.userData.animations || [];
        if (clips && clips.length) self.processAnimations(clips, json, nodeMap, addAccessor, useExtension);
        if (!json.extensionsUsed.length) delete json.extensionsUsed;
        if (!json.images.length) delete json.images;
        if (!json.textures.length) delete json.textures;
        if (!json.samplers.length) delete json.samplers;
        if (!json.cameras.length) delete json.cameras;
        if (!json.animations.length) delete json.animations;
        if (!json.skins.length) delete json.skins;
        if (!json.materials.length) delete json.materials;
        if (!json.meshes.length) delete json.meshes;
        var binary = new Uint8Array(chunks);
        if (options.binary) {
            if (binary.byteLength) json.buffers.push({ byteLength: binary.byteLength });
            else delete json.buffers;
            var jsonText = JSON.stringify(json);
            var jsonBytes = new TextEncoder().encode(jsonText);
            var jsonPadding = (4 - (jsonBytes.byteLength % 4)) % 4;
            var binPadding = (4 - (binary.byteLength % 4)) % 4;
            var hasBin = binary.byteLength > 0;
            var totalGlbSize = 12 + 8 + jsonBytes.byteLength + jsonPadding + (hasBin ? 8 + binary.byteLength + binPadding : 0);
            var glb = new ArrayBuffer(totalGlbSize);
            var view = new DataView(glb);
            view.setUint32(0, 0x46546C67, true);
            view.setUint32(4, 2, true);
            view.setUint32(8, totalGlbSize, true);
            var cur = 12;
            view.setUint32(cur, jsonBytes.byteLength + jsonPadding, true);
            view.setUint32(cur + 4, 0x4E4F534A, true);
            cur += 8;
            new Uint8Array(glb, cur, jsonBytes.byteLength).set(jsonBytes);
            for (var jp = 0; jp < jsonPadding; jp++) view.setUint8(cur + jsonBytes.byteLength + jp, 32);
            cur += jsonBytes.byteLength + jsonPadding;
            if (hasBin) {
                view.setUint32(cur, binary.byteLength + binPadding, true);
                view.setUint32(cur + 4, 0x004E4942, true);
                cur += 8;
                new Uint8Array(glb, cur, binary.byteLength).set(binary);
            }
            return glb;
        }
        if (binary.byteLength) {
            var base64 = faoxombase64text(binary);
            json.buffers.push({ byteLength: binary.byteLength, uri: "data:application/octet-stream;base64," + base64 });
        } else delete json.buffers;
        return json;
    }
    processAnimations(clips, json, nodeMap, addAccessor, useExtension) {
        var nodeIndexByName = {};
        nodeMap.forEach(function(index, object) { if (object.name && nodeIndexByName[object.name] === undefined) nodeIndexByName[object.name] = index; });
        var timesEqual = function(a, b) {
            if (!a || !b || a.length !== b.length) return false;
            for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
            return true;
        };
        for (var c = 0; c < clips.length; c++) {
            var clip = clips[c];
            var channels = [], samplers = [];
            var pointerColor = {}, pointerOpacity = {}, pointerScalar = {};
            for (var t = 0; t < clip.tracks.length; t++) {
                var track = clip.tracks[t];
                var name = track.name || "";
                var pointerPrefix = "userData.pointerTargets.";
                if (name.indexOf(pointerPrefix) === 0) {
                    var remainder = name.slice(pointerPrefix.length);
                    var dot = remainder.indexOf(".");
                    if (dot === -1) continue;
                    var targetId = remainder.slice(0, dot), property = remainder.slice(dot + 1);
                    var numberMatch = /^(material|light)([0-9]+)$/.exec(targetId);
                    if (!numberMatch) continue;
                    if (property === "color") pointerColor[numberMatch[1] + numberMatch[2]] = track;
                    else if (property === "opacity") pointerOpacity[numberMatch[1] + numberMatch[2]] = track;
                    else pointerScalar[targetId + "." + property] = track;
                    continue;
                }
                var split = name.lastIndexOf(".");
                if (split === -1) continue;
                var nodeName = name.slice(0, split), property = name.slice(split + 1);
                var nodeIndex = nodeIndexByName[nodeName];
                if (nodeIndex === undefined) continue;
                var path = null, outputType = null;
                if (property === "position") { path = "translation"; outputType = "VEC3"; }
                else if (property === "scale") { path = "scale"; outputType = "VEC3"; }
                else if (property === "rotation" || property === "quaternion") { path = "rotation"; outputType = "VEC4"; }
                else if (property === "weights") { path = "weights"; outputType = "SCALAR"; }
                if (!path || !track.times || !track.times.length) continue;
                var inputAccessor = addAccessor(new Float32Array(track.times), 5126, "SCALAR", track.times.length, false);
                var values = track.values && track.values.length ? track.values : [];
                var outputCount = path === "weights" ? values.length : values.length / (outputType === "VEC4" ? 4 : outputType === "VEC3" ? 3 : outputType === "VEC2" ? 2 : 1);
                var outputAccessor = addAccessor(new Float32Array(values), 5126, outputType, outputCount, false);
                samplers.push({ input: inputAccessor, output: outputAccessor, interpolation: track.interpolation === "STEP" || track.interpolation === "CUBICSPLINE" ? track.interpolation : "LINEAR" });
                channels.push({ sampler: samplers.length - 1, target: { node: nodeIndex, path: path } });
            }
            var emitPointer = function(id, property, outputArray, outputType, count, times, interpolation) {
                var kindMatch = /^(material|light)([0-9]+)$/.exec(id);
                if (!kindMatch) return;
                var pointer = null;
                if (kindMatch[1] === "material") {
                    var materialIndex = Number(kindMatch[2]);
                    if (json.materials && json.materials[materialIndex]) {
                        if (property === "baseColorFactor") pointer = "/materials/" + materialIndex + "/pbrMetallicRoughness/baseColorFactor";
                        else if (property === "metallicFactor") pointer = "/materials/" + materialIndex + "/pbrMetallicRoughness/metallicFactor";
                        else if (property === "roughnessFactor") pointer = "/materials/" + materialIndex + "/pbrMetallicRoughness/roughnessFactor";
                        else if (property === "alphaCutoff") pointer = "/materials/" + materialIndex + "/alphaCutoff";
                        else if (property === "emissiveFactor") pointer = "/materials/" + materialIndex + "/emissiveFactor";
                    }
                } else {
                    var lightIndex = Number(kindMatch[2]);
                    if (json.extensions && json.extensions.KHR_lights_punctual && json.extensions.KHR_lights_punctual.lights[lightIndex]) pointer = "/extensions/KHR_lights_punctual/lights/" + lightIndex + "/" + property;
                }
                if (!pointer || !times || !times.length) return;
                var inputAccessor = addAccessor(new Float32Array(times), 5126, "SCALAR", times.length, false);
                var outputAccessor = addAccessor(new Float32Array(outputArray), 5126, outputType, count, false);
                samplers.push({ input: inputAccessor, output: outputAccessor, interpolation: interpolation === "STEP" || interpolation === "CUBICSPLINE" ? interpolation : "LINEAR" });
                channels.push({ sampler: samplers.length - 1, target: { extensions: { KHR_animation_pointer: { pointer: pointer } } } });
                useExtension("KHR_animation_pointer");
            };
            for (var colorId in pointerColor) {
                var colorTrack = pointerColor[colorId], opacityTrack = pointerOpacity[colorId];
                var materialDefinition = json.materials && json.materials[Number(/^[a-z]+([0-9]+)$/.exec(colorId)[1])];
                var baseFactor = materialDefinition && materialDefinition.pbrMetallicRoughness && materialDefinition.pbrMetallicRoughness.baseColorFactor || [1, 1, 1, 1];
                var times = colorTrack.times, merged = new Array(times.length * 4);
                for (var k = 0; k < times.length; k++) {
                    merged[k * 4] = colorTrack.values[k * 3];
                    merged[k * 4 + 1] = colorTrack.values[k * 3 + 1];
                    merged[k * 4 + 2] = colorTrack.values[k * 3 + 2];
                    merged[k * 4 + 3] = opacityTrack && timesEqual(opacityTrack.times, times) ? opacityTrack.values[k] : baseFactor[3];
                }
                emitPointer(colorId, "baseColorFactor", merged, "VEC4", times.length, times, colorTrack.interpolation);
            }
            for (var opacityId in pointerOpacity) {
                if (pointerColor[opacityId]) continue;
                var onlyOpacity = pointerOpacity[opacityId];
                var materialDef = json.materials && json.materials[Number(/^[a-z]+([0-9]+)$/.exec(opacityId)[1])];
                var factor = materialDef && materialDef.pbrMetallicRoughness && materialDef.pbrMetallicRoughness.baseColorFactor || [1, 1, 1, 1];
                var opacityTimes = onlyOpacity.times, opacityMerged = new Array(opacityTimes.length * 4);
                for (var k2 = 0; k2 < opacityTimes.length; k2++) { opacityMerged[k2 * 4] = factor[0]; opacityMerged[k2 * 4 + 1] = factor[1]; opacityMerged[k2 * 4 + 2] = factor[2]; opacityMerged[k2 * 4 + 3] = onlyOpacity.values[k2]; }
                emitPointer(opacityId, "baseColorFactor", opacityMerged, "VEC4", opacityTimes.length, opacityTimes, onlyOpacity.interpolation);
            }
            for (var scalarKey in pointerScalar) {
                var scalarTrack = pointerScalar[scalarKey];
                var keyDot = scalarKey.indexOf(".");
                var scalarId = scalarKey.slice(0, keyDot), scalarProperty = scalarKey.slice(keyDot + 1);
                var scalarPointerProperty = scalarProperty === "metalness" ? "metallicFactor" : scalarProperty === "roughness" ? "roughnessFactor" : scalarProperty === "emissive" ? "emissiveFactor" : scalarProperty === "intensity" ? "intensity" : scalarProperty === "color" ? "color" : scalarProperty === "alphaCutoff" ? "alphaCutoff" : null;
                if (!scalarPointerProperty) continue;
                var scalarType = scalarPointerProperty === "emissiveFactor" || scalarPointerProperty === "color" ? "VEC3" : "SCALAR";
                var scalarSize = scalarType === "VEC3" ? 3 : 1;
                emitPointer(scalarId, scalarPointerProperty, scalarTrack.values, scalarType, scalarTrack.values.length / scalarSize, scalarTrack.times, scalarTrack.interpolation);
            }
            if (channels.length) json.animations.push({ name: clip.name || "animation" + c, channels: channels, samplers: samplers });
        }
    }
}

export { GLTFExporter };
