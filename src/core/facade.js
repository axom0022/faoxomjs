import { Scene } from "../scenes/index.js";
import { BloomPass, ColorGradePass, FXAAPass, GBufferTarget, GPUCompute, PostProcessingComposer, RenderTarget, SSAOPass, SSRPass, VignettePass, WebGLRenderer, WebGPUBloomPass, WebGPUCompute, WebGPUFXAAPass, WebGPUPostProcessingComposer, WebGPURenderer, WebGPUToneMappingPass } from "../renderers/index.js";
import { CubeTexture, PMREMGenerator, Texture, TextureFormatSelector, TextureStreamer } from "../textures/index.js";
import { CharacterController, Cloth, CollisionShape, CompoundCollisionShape, ConvexCollisionShape, CylinderCollisionShape, Decal, DestructionBody, Fluid, HeadlessRenderer, HeightfieldShape, JointLimit, MeshCollisionShape, Navmesh, NavmeshManager, OffscreenEngine, Pathfinder, PerfGovernor, PhysicsWorld, PNGCodec, Ragdoll, ReflectionProbe, RigidBody, Rope, SoftBody, TaskPool, Terrain, TerrainManager, Vehicle, WebXRAR, WebXRManager, WorldStreamer } from "../extras/index.js";
import { DeviceLossManager, FrameProfiler, ResourceLedger } from "../renderers/index.js";
import { AnimationClip, AnimationCompressor, AnimationController, AnimationManager, AnimationMixer, AnimationRetargeter, AnimationStateMachine, AnimationTrack, BlendTree, FacialAnimation, MotionMatcher, RootMotionExtractor, TwoBoneIKSolver } from "../animation/index.js";
import { AssetLoader, DRACOLoader, FBXLoader, GLTFLoader, KTX2Loader, SceneExporter } from "../loaders/index.js";
import { Camera, InputManager, OrbitControls, OrthographicCamera, PerspectiveCamera, TransformControls } from "../camera/index.js";
import { StatsPanel } from "../helpers/index.js";
import { AmbientLight, DirectionalLight, HemisphereLight, PointLight, RectAreaLight, SpotLight } from "../lights/index.js";
import { Bone, Group, InstancedMesh, LOD, Mesh, MeshPool, ObjectPool, ParticleSystem, Skeleton, SkinnedMesh, WideLine } from "../objects/index.js";
import { BasicMaterial, LambertMaterial, Material, PhongMaterial, StandardMaterial } from "../materials/index.js";
import { Node, faoxomscripttag } from "./index.js";
import { Shape, Vector3, faoxomclamp } from "../math/index.js";
import { BoxGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, ExtrudeGeometry, Geometry, GeometryFactory, IcosahedronGeometry, LatheGeometry, OctahedronGeometry, PlaneGeometry, RingGeometry, SphereGeometry, TetrahedronGeometry, TorusGeometry, TorusKnotGeometry } from "../geometries/index.js";

function faoxommodelmodule(name, base64, meta) { var accessor = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? "." + name : "[" + JSON.stringify(name) + "]"; var chunks = base64.match(/.{1,8192}/g) || []; var body = "var store = global.FaoxomJsModels || (global.FaoxomJsModels = {});\nstore" + accessor + " = { format: \"glb\", data: [\n" + chunks.map(function(chunk) { return JSON.stringify(chunk); }).join(",\n") + "\n].join(\"\") };"; var banner = "/*! FaoxomJS" + (typeof FaoxomJs !== "undefined" && FaoxomJs.VERSION ? " " + FaoxomJs.VERSION : "") + " embedded model: " + name + (meta && meta.byteLength ? " | " + meta.byteLength + " bytes" : "") + " */"; var code = banner + "\n(function (global) {\n" + body + "\n})(globalThis);\n"; return { code: code, html: faoxomscripttag(false) + "\n" + code + faoxomscripttag(true) + "\n" }; }
class FaoxomJs {
    constructor(options) { this.options = options || {}; this.scenes = {}; this.activeScene = null; this.renderer = null; this.physics = new PhysicsWorld(this.options.physics); this.input = null; this.animationManager = new AnimationManager(); this.animationMixers = []; this.ikSolvers = []; this.worldStreamers = []; this.facialAnimations = []; this.navmeshManager = new NavmeshManager(); this.terrainManager = new TerrainManager(); this.assetLoader = new AssetLoader(this.options.assets); this.running = false; this.frameHandle = null; this.time = 0; this.deltaTime = 0; this.fps = 0; this.lastTime = 0; this.readyCallbacks = []; this.frameCallbacks = []; this.background = null; this.initialized = false; }
    init(options) { if (options) for (var key in options) this.options[key] = options[key]; this.renderer = new WebGLRenderer(this.options.renderer || this.options); this.assetLoader.options.renderer = this.renderer; this.input = new InputManager(this.options.inputElement || (this.renderer && this.renderer.canvas)); if (this.options.width && this.options.height) this.renderer.setSize(this.options.width, this.options.height); this.createScene("main"); this.initialized = true; for (var i = 0; i < this.readyCallbacks.length; i++) this.readyCallbacks[i](this); this.readyCallbacks = []; return this; }
    start() { if (!this.initialized) this.init(); if (this.running) return this; this.running = true; this.lastTime = typeof performance !== "undefined" ? performance.now() : Date.now(); var self = this; var loop = function(now) { if (!self.running) return; self.update(((now || Date.now()) - self.lastTime) / 1000); self.lastTime = now || Date.now(); self.render(); if (typeof requestAnimationFrame !== "undefined") self.frameHandle = requestAnimationFrame(loop); else self.frameHandle = setTimeout(function() { loop(typeof performance !== "undefined" ? performance.now() : Date.now()); }, 16); }; if (typeof requestAnimationFrame !== "undefined") this.frameHandle = requestAnimationFrame(loop); else this.frameHandle = setTimeout(function() { loop(typeof performance !== "undefined" ? performance.now() : Date.now()); }, 16); return this; }
    stop() { this.running = false; if (this.frameHandle !== null) { if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this.frameHandle); else clearTimeout(this.frameHandle); this.frameHandle = null; } return this; }
    update(delta) { this.deltaTime = Math.max(0, Math.min(delta || 0, 0.25)); this.time += this.deltaTime; this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0; if (this.input) this.input.update(); this.physics.step(this.deltaTime); this.animationManager.update(this.deltaTime); for (var mixerIndex = 0; mixerIndex < this.animationMixers.length; mixerIndex++) this.animationMixers[mixerIndex].update(this.deltaTime); for (var ikIndex = 0; ikIndex < this.ikSolvers.length; ikIndex++) this.ikSolvers[ikIndex].solve(); var streamCamera = this.activeScene && (this.activeScene.activeCamera || this.activeScene.camera); for (var streamerIndex = 0; streamerIndex < this.worldStreamers.length; streamerIndex++) if (streamCamera) this.worldStreamers[streamerIndex].update(streamCamera.position, new Vector3(0, 0, -1).applyQuaternion(streamCamera.quaternion)); for (var facialIndex = 0; facialIndex < this.facialAnimations.length; facialIndex++) this.facialAnimations[facialIndex].update(this.deltaTime); if (this.activeScene) this.activeScene.traverse(function(object) { if (object instanceof ParticleSystem && object.autoUpdate) object.update(this.deltaTime); }.bind(this)); for (var frameCallbackIndex = 0; frameCallbackIndex < this.frameCallbacks.length; frameCallbackIndex++) { try { this.frameCallbacks[frameCallbackIndex](this.deltaTime, this); } catch (frameCallbackError) { if (typeof console !== "undefined" && console.warn) console.warn("frame callback error:", frameCallbackError); } } return this; }
    render() { if (this.renderer && this.activeScene) { var camera = this.activeScene.activeCamera || this.activeScene.camera; if (!camera) { this.activeScene.traverse(function(o) { if (!camera && o instanceof Camera) camera = o; }); } if (camera) this.renderer.render(this.activeScene, camera); } return this; }
    createScene(name) { var scene = new Scene(); scene.name = name || "scene" + Object.keys(this.scenes).length; this.scenes[scene.name] = scene; if (!this.activeScene) this.activeScene = scene; return scene; }
    setActiveScene(scene) { this.activeScene = typeof scene === "string" ? this.scenes[scene] : scene; return this; }
    getScene(name) { return this.scenes[name]; }
    removeScene(name) { var scene = typeof name === "string" ? this.scenes[name] : name; if (!scene) return this; delete this.scenes[scene.name]; if (this.activeScene === scene) this.activeScene = null; scene.destroy(); return this; }
    createMesh(geometry, material) { return new Mesh(geometry, material); }
    createGeometryFactory(options) { return new GeometryFactory(options); }
    createObjectPool(factory, options) { return new ObjectPool(factory, options); }
    createMeshPool(geometry, material, options) { return new MeshPool(geometry, material, options); }
    freezeScene(scene) { scene = scene || this.activeScene; if (scene && scene.freeze) scene.freeze(); return scene; }
    unfreezeScene(scene) { scene = scene || this.activeScene; if (scene && scene.unfreeze) scene.unfreeze(); return scene; }
    mergeGeometries(geometries, options) { return Geometry.merge(geometries, options); }
    createSkyDome(radius, material) { var domeMaterial = material || new BasicMaterial({ color: 0xffffff, side: "back", depthWrite: false }); domeMaterial.side = domeMaterial.side || "back"; var dome = new Mesh(new SphereGeometry(radius || 100, 32, 16), domeMaterial); dome.frustumCulled = false; dome.userData.skyDome = true; return dome; }
    createParticleSystem(options) { return new ParticleSystem(options); }
    createWideLine(points, options) { return new WideLine(points, options); }
    createInstancedMesh(geometry, material, count) { return new InstancedMesh(geometry, material, count); }
    createBox(width, height, depth, material) { return new Mesh(new BoxGeometry(width, height, depth), material || new StandardMaterial()); }
    createSphere(radius, widthSegments, heightSegments, material) { return new Mesh(new SphereGeometry(radius, widthSegments, heightSegments), material || new StandardMaterial()); }
    createPlane(width, height, material) { return new Mesh(new PlaneGeometry(width, height), material || new StandardMaterial()); }
    createCylinder(radiusTop, radiusBottom, height, material) { return new Mesh(new CylinderGeometry(radiusTop, radiusBottom, height), material || new StandardMaterial()); }
    createCone(radius, height, material) { return new Mesh(new ConeGeometry(radius, height), material || new StandardMaterial()); }
    createTorus(radius, tube, material) { return new Mesh(new TorusGeometry(radius, tube), material || new StandardMaterial()); }
    createTorusKnot(radius, tube, material) { return new Mesh(new TorusKnotGeometry(radius, tube), material || new StandardMaterial()); }
    createIcosahedron(radius, detail, material) { return new Mesh(new IcosahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createDodecahedron(radius, detail, material) { return new Mesh(new DodecahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createOctahedron(radius, detail, material) { return new Mesh(new OctahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createTetrahedron(radius, detail, material) { return new Mesh(new TetrahedronGeometry(radius, detail), material || new StandardMaterial()); }
    createRing(innerRadius, outerRadius, material) { return new Mesh(new RingGeometry(innerRadius, outerRadius), material || new StandardMaterial()); }
    createLathe(points, segments, material) { return new Mesh(new LatheGeometry(points, segments), material || new StandardMaterial()); }
    createExtrude(shape, depth, material) { return new Mesh(new ExtrudeGeometry(shape, depth), material || new StandardMaterial()); }
    createShape(points) { return new Shape(points); }
    createMaterial(options) { return new Material(options); }
    createStandardMaterial(options) { return new StandardMaterial(options); }
    createPhongMaterial(options) { return new PhongMaterial(options); }
    createLambertMaterial(options) { return new LambertMaterial(options); }
    createBasicMaterial(options) { return new BasicMaterial(options); }
    createTexture(source, options) { return new Texture(source, options); }
    createCubeTexture(sources, options) { return new CubeTexture(sources, options); }
    createAmbientLight(color, intensity) { return new AmbientLight(color, intensity); }
    createDirectionalLight(color, intensity) { return new DirectionalLight(color, intensity); }
    createPointLight(color, intensity, distance, decay) { return new PointLight(color, intensity, distance, decay); }
    createSpotLight(color, intensity, distance, angle, penumbra, decay) { return new SpotLight(color, intensity, distance, angle, penumbra, decay); }
    createHemisphereLight(skyColor, groundColor, intensity) { return new HemisphereLight(skyColor, groundColor, intensity); }
    createRectAreaLight(color, intensity, width, height) { return new RectAreaLight(color, intensity, width, height); }
    createCamera(options) { options = options || {}; return new PerspectiveCamera(options.fov, options.aspect, options.near, options.far); }
    createOrthographicCamera(left, right, top, bottom, near, far) { return new OrthographicCamera(left, right, top, bottom, near, far); }
    createPerspectiveCamera(fov, aspect, near, far) { return new PerspectiveCamera(fov, aspect, near, far); }
    createNode() { return new Node(); }
    createGroup() { return new Group(); }
    createLOD() { return new LOD(); }
    createWorldStreamer(options) { var streamer = new WorldStreamer(this.assetLoader, options); this.worldStreamers.push(streamer); if (this.activeScene) this.activeScene.add(streamer); return streamer; }
    createSkeleton(bones, inverses) { return new Skeleton(bones, inverses); }
    createBone() { return new Bone(); }
    createSkinnedMesh(geometry, material) { return new SkinnedMesh(geometry, material); }
    createAnimationClip(name, duration, tracks, events) { return new AnimationClip(name, duration, tracks, events); }
    createAnimationTrack(name, times, values, type, interpolation) { return new AnimationTrack(name, times, values, type, interpolation); }
    createAnimationController(target) { var controller = new AnimationController(target); this.animationManager.add(controller); return controller; }
    createAnimationMixer(target) { var mixer = new AnimationMixer(target); this.animationMixers.push(mixer); return mixer; }
    createAnimationStateMachine(mixer) { return new AnimationStateMachine(mixer); }
    createBlendTree(mixer) { return new BlendTree(mixer); }
    createTwoBoneIK(root, middle, end, target, options) { var solver = new TwoBoneIKSolver(root, middle, end, target, options); this.ikSolvers.push(solver); return solver; }
    createMotionMatcher(mixer) { return new MotionMatcher(mixer); }
    createFacialAnimation(target, options) { var animation = new FacialAnimation(target, options); this.facialAnimations.push(animation); return animation; }
    addFrameCallback(callback) { if (typeof callback === "function") this.frameCallbacks.push(callback); return this; }
    removeFrameCallback(callback) { var index = this.frameCallbacks.indexOf(callback); if (index !== -1) this.frameCallbacks.splice(index, 1); return this; }
    createPerfGovernor(options) { options = options || {}; if (!options.renderer) options.renderer = this.renderer; if (!options.app) options.app = this; return new PerfGovernor(options); }
    createDeviceLossManager(options) { return new DeviceLossManager(this.renderer, options); }
    createProfiler(options) { return new FrameProfiler(this.renderer, options); }
    createHeadlessRenderer(options) { return new HeadlessRenderer(options); }
    createResourceLedger(options) { return new ResourceLedger(options); }
    createTaskPool(options) { return new TaskPool(options); }
    createWebXRAR(options) { return new WebXRAR(options); }
    createOffscreenEngine(options) { return new OffscreenEngine(options); }
    createRigidBody(options) { var body = new RigidBody(options); this.physics.addBody(body); return body; }
    createConvexCollisionShape(points, options) { return new ConvexCollisionShape(points, options); }
    createMeshCollisionShape(vertices, indices, options) { return new MeshCollisionShape(vertices, indices, options); }
    createCompoundCollisionShape(children, options) { return new CompoundCollisionShape(children, options); }
    createCylinderCollisionShape(radius, height, options) { return new CylinderCollisionShape(radius, height, options); }
    createHeightfieldShape(width, depth, segmentsX, segmentsZ, heights, options) { return new HeightfieldShape(width, depth, segmentsX, segmentsZ, heights, options); }
    createVehicle(body, options) { options = options || {}; if (!options.world) options.world = this.physics; return new Vehicle(body, options); }
    createRagdoll(definition, options) { options = options || {}; if (!options.world) options.world = this.physics; return new Ragdoll(definition, options); }
    createDestructionBody(pieces, options) { options = options || {}; return new DestructionBody(options.world || this.physics, pieces, options); }
    createSoftBody(options) { options = options || {}; if (!options.world) options.world = this.physics; var softBody = new SoftBody(options); this.physics.addSoftBody(softBody); return softBody; }
    createCloth(width, height, segmentsX, segmentsY, options) { options = options || {}; if (!options.world) options.world = this.physics; var cloth = new Cloth(width, height, segmentsX, segmentsY, options); this.physics.addSoftBody(cloth); return cloth; }
    createRope(start, end, segments, options) { options = options || {}; if (!options.world) options.world = this.physics; var rope = new Rope(start, end, segments, options); this.physics.addSoftBody(rope); return rope; }
    createFluid(options) { options = options || {}; if (!options.world) options.world = this.physics; var fluid = new Fluid(options); this.physics.addFluid(fluid); return fluid; }
    createCharacterController(options) { options = options || {}; if (!options.world) options.world = this.physics; return new CharacterController(options); }
    createCollisionShape(type, options) { return new CollisionShape(type, options); }
    createTerrain(width, depth, segmentsX, segmentsZ, options) { var terrain = new Terrain(width, depth, segmentsX, segmentsZ, options); this.terrainManager.add(terrain); return terrain; }
    createNavmesh(geometry, options) { var navmesh = new Navmesh(geometry, options); this.navmeshManager.add(navmesh); return navmesh; }
    createPathfinder(navmesh) { return new Pathfinder(navmesh || this.navmeshManager.navmeshes[0]); }
    loadModel(url, options) { return this.assetLoader.loadModel(url, options); }
    loadModelInWorker(url, options) { return this.assetLoader.loadModelInWorker(url, options); }
    registerModel(name, data, options) { FaoxomJs.registerModel(name, data, options); return this; }
    loadEmbeddedModel(name, options) { return this.assetLoader.load("embedded:" + name, "model", options); }
    embedModel(source, options) { return FaoxomJs.embedModel(source, options); }
    parseCollada(text, url) { return this.assetLoader.parseCollada(text, url); }
    loadTexture(url, options) { return this.assetLoader.loadTexture(url, options); }
    loadAudio(url) { return this.assetLoader.loadAudio(url); }
    getTime() { return this.time; }
    getDeltaTime() { return this.deltaTime; }
    getFPS() { return this.fps; }
    resize(width, height) { if (this.renderer) { if (width === undefined && typeof window !== "undefined") width = window.innerWidth; if (height === undefined && typeof window !== "undefined") height = window.innerHeight; this.renderer.resize(width, height); } return this; }
    setClearColor(color, alpha) { if (this.renderer) this.renderer.setClearColor(color, alpha); return this; }
    setBackground(background) { this.background = background; if (this.activeScene) this.activeScene.background = background; return this; }
    setFog(fog) { if (this.activeScene) this.activeScene.fog = fog; return this; }
    enableShadows(enabled) { if (this.renderer) this.renderer.shadowMap.enabled = enabled !== false; return this; }
    setShadowCascades(light, count, splitLambda) { if (light && light.shadow) { light.shadow.cascades = Math.max(1, Math.min(4, Math.floor(count || 4))); if (splitLambda !== undefined) light.shadow.splitLambda = faoxomclamp(splitLambda, 0, 1); } return this; }
    enableOcclusionCulling(enabled) { if (this.renderer) this.renderer.createOcclusionCuller().enabled = enabled !== false; return this; }
    enableAutoBatching(enabled) { if (this.renderer) this.renderer.autoBatch = enabled !== false; return this; }
    setToneMapping(mode) { if (this.renderer) this.renderer.toneMapping = mode === "aces" || mode === 2 ? 2 : mode === "reinhard" || mode === 1 ? 1 : 0; return this; }
    setExposure(value) { if (this.renderer) this.renderer.exposure = Math.max(0, value); return this; }
    setGamma(value) { if (this.renderer) this.renderer.gamma = Math.max(0.1, value); return this; }
    createPostProcessing(options) { return this.renderer instanceof WebGPURenderer ? new WebGPUPostProcessingComposer(this.renderer, options) : new PostProcessingComposer(this.renderer, options); }
    createWebGPUToneMappingPass(options) { return new WebGPUToneMappingPass(options); }
    createGPUFXAAPass(options) { return new WebGPUFXAAPass(options); }
    createGPUBloomPass(options) { return new WebGPUBloomPass(options); }
    createBloomPass(options) { return new BloomPass(options); }
    createVignettePass(options) { return new VignettePass(options); }
    createFXAAPass(options) { return new FXAAPass(options); }
    createColorGradePass(options) { return new ColorGradePass(options); }
    createSSAOPass(options) { return new SSAOPass(options); }
    createSSRPass(options) { return new SSRPass(options); }
    createGBufferTarget(width, height, options) { return new GBufferTarget(this.renderer, width, height, options); }
    createRenderTarget(width, height, options) { return new RenderTarget(this.renderer, width, height, options); }
    createGPUCompute() { return new GPUCompute(this.renderer); }
    createDecal(position, normal, size, material) { return new Decal(position, normal, size, material); }
    createSceneExporter() { return new SceneExporter(); }
    exportScene(scene) { return new SceneExporter().toJSON(scene || this.activeScene); }
    setShadowMapSize(size) { if (this.renderer) this.renderer.shadowMap.size = size; return this; }
    getRenderer() { return this.renderer; }
    getGPUCapabilities() { return this.renderer ? this.renderer.getCapabilities() : { webgl2: false, maxTextureSize: 0, maxTextureUnits: 0, compressedTextureFormats: [], extensions: {} }; }
    getPhysics() { return this.physics; }
    getInput() { return this.input; }
    getAnimationManager() { return this.animationManager; }
    getNavmeshManager() { return this.navmeshManager; }
    getTerrainManager() { return this.terrainManager; }
    onReady(callback) { if (this.initialized) callback(this); else this.readyCallbacks.push(callback); return this; }
    destroy() { this.stop(); if (this.input) this.input.destroy(); for (var key in this.scenes) this.scenes[key].destroy(); this.scenes = {}; if (this.renderer) this.renderer.dispose(); this.renderer = null; this.activeScene = null; }
}
FaoxomJs.prototype.initWebGPU = async function(options) { options = options || this.options.renderer || this.options; if (options.canvas === undefined && this.renderer) options.canvas = this.renderer.canvas; this.stop(); this.renderer = new WebGPURenderer(options); await this.renderer.init(); this.assetLoader.options.renderer = this.renderer; if (!this.activeScene) this.createScene("main"); this.initialized = true; return this; };
FaoxomJs.prototype.createWebGPUCompute = function() { return new WebGPUCompute(this.renderer); };
FaoxomJs.prototype.createPMREMGenerator = function() { return new PMREMGenerator(this.renderer); };
FaoxomJs.prototype.createReflectionProbe = function(options) { return new ReflectionProbe(this.renderer, options); };
FaoxomJs.prototype.createGLTFLoader = function() { return new GLTFLoader(this.assetLoader); };
FaoxomJs.prototype.createFBXLoader = function() { return new FBXLoader(this.assetLoader); };
FaoxomJs.prototype.createKTX2Loader = function() { return new KTX2Loader(this.assetLoader, this.renderer); };
FaoxomJs.prototype.createDRACOLoader = function() { return new DRACOLoader(this.assetLoader); };
FaoxomJs.prototype.createXRManager = function() { return new WebXRManager(this); };
FaoxomJs.prototype.createXRInputVisualizer = function(scene, options) { var manager = this.xrManager || (this.xrManager = new WebXRManager(this)); return manager.createInputVisualizer(scene || this.activeScene, options); };
FaoxomJs.prototype.setPhysicsBroadphase = function(mode, cellSize) { this.physics.broadphase = mode === "grid" ? "grid" : "aabb"; if (cellSize !== undefined) this.physics.broadphaseCellSize = Math.max(0.1, cellSize); return this; };
FaoxomJs.prototype.createAnimationRetargeter = function(mapping, options) { return new AnimationRetargeter(mapping, options); };
FaoxomJs.prototype.createRootMotionExtractor = function(target, root, options) { return new RootMotionExtractor(target, root, options); };
FaoxomJs.prototype.createJointLimit = function(bone, options) { return new JointLimit(bone, options); };
FaoxomJs.prototype.compressAnimation = function(clip, tolerance) { return AnimationCompressor.compress(clip, tolerance); };
FaoxomJs.prototype.createTextureFormatSelector = function() { return new TextureFormatSelector(this.renderer); };
FaoxomJs.prototype.createTextureStreamer = function(options) { return new TextureStreamer(this.assetLoader, this.renderer, options); };
FaoxomJs.prototype.createOrbitControls = function(camera, dom) { return new OrbitControls(camera || this.activeScene.camera, dom || this.renderer.canvas); };
FaoxomJs.prototype.createTransformControls = function(camera, dom) { return new TransformControls(camera || this.activeScene.camera, dom || this.renderer.canvas); };
FaoxomJs.prototype.createStatsPanel = function(options) { return new StatsPanel(options); };
if (typeof module !== "undefined" && module.exports) {
    module.exports = FaoxomJs;
}

export { FaoxomJs, faoxommodelmodule };
