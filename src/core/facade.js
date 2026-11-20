import { Scene } from "../scenes/index.js";

import { BloomPass, ColorGradePass, FXAAPass, GBufferTarget, GPUCompute, PostProcessingComposer, RenderTarget, SSAOPass, SSRPass, VignettePass, WebGLRenderer, WebGPUBloomPass, WebGPUCompute, WebGPUFXAAPass, WebGPUPostProcessingComposer, WebGPURenderer, WebGPUToneMappingPass } from "../renderers/index.js";

import { CubeTexture, PMREMGenerator, Texture, TextureFormatSelector, TextureStreamer } from "../textures/index.js";

import { AntiTamper, BlindedInt32, BoxCollider, CapsuleCollider, CharacterController, Cloth, CollisionShape, CompoundCollisionShape, ConvexCollisionShape, CylinderCollisionShape, Decal, DestructionBody, Fluid, GPUStateVault, HeadlessRenderer, HeightfieldShape, IntegrityVM, JointLimit, MeshCollisionShape, Navmesh, NavmeshManager, NetcodeSession, OffscreenEngine, Pathfinder, PerfGovernor, PhysicsDebugRenderer, PhysicsWorld, PlaneCollider, PNGCodec, ProtectedValue, Ragdoll, ReflectionProbe, ReplayRecorder, RigidBody, Rope, SharedCounter, SharedRingBuffer, SoftBody, SphereCollider, TaskPool, Terrain, TerrainManager, Vehicle, WebXRAR, WebXRManager, WorldStreamer } from "../extras/index.js";

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

function faoxommodelmodule(zadma, zadmb, zadmc) {
    var zadmd = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(zadma) ? "." + zadma : "[" + JSON.stringify(zadma) + "]";
    var zadme = zadmb.match(/.{1,8192}/g) || [];
    var zadmf = "var store = global.FaoxomJsModels || (global.FaoxomJsModels = {});\nstore" + zadmd + ' = { format: "glb", data: [\n' + zadme.map(function(zadma) {
        return JSON.stringify(zadma);
    }).join(",\n") + '\n].join("") };';
    var zadmg = "";
    var zadmh = zadmg + "\n(function (global) {\n" + zadmf + "\n})(globalThis);\n";
    return {
        code: zadmh,
        html: faoxomscripttag(false) + "\n" + zadmh + faoxomscripttag(true) + "\n"
    };
}

class FaoxomJs {
    constructor(zadma) {
        this.options = zadma || {};
        this.scenes = {};
        this.activeScene = null;
        this.renderer = null;
        this.physics = new PhysicsWorld(this.options.physics);
        this.input = null;
        this.animationManager = new AnimationManager;
        this.animationMixers = [];
        this.ikSolvers = [];
        this.worldStreamers = [];
        this.facialAnimations = [];
        this.navmeshManager = new NavmeshManager;
        this.terrainManager = new TerrainManager;
        this.assetLoader = new AssetLoader(this.options.assets);
        this.running = false;
        this.frameHandle = null;
        this.time = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.lastTime = 0;
        this.readyCallbacks = [];
        this.frameCallbacks = [];
        this.background = null;
        this.initialized = false;
    }
    init(zadma) {
        if (zadma) for (var zadmb in zadma) this.options[zadmb] = zadma[zadmb];
        this.renderer = new WebGLRenderer(this.options.renderer || this.options);
        this.assetLoader.options.renderer = this.renderer;
        this.input = new InputManager(this.options.inputElement || this.renderer && this.renderer.canvas);
        if (this.options.width && this.options.height) this.renderer.setSize(this.options.width, this.options.height);
        this.createScene("main");
        this.initialized = true;
        for (var zadmc = 0; zadmc < this.readyCallbacks.length; zadmc++) this.readyCallbacks[zadmc](this);
        this.readyCallbacks = [];
        return this;
    }
    start() {
        if (!this.initialized) this.init();
        if (this.running) return this;
        this.running = true;
        this.lastTime = typeof performance !== "undefined" ? performance.now() : Date.now();
        var zadma = this;
        var zadmb = function(zadmc) {
            if (!zadma.running) return;
            zadma.update(((zadmc || Date.now()) - zadma.lastTime) / 1e3);
            zadma.lastTime = zadmc || Date.now();
            zadma.render();
            if (typeof requestAnimationFrame !== "undefined") zadma.frameHandle = requestAnimationFrame(zadmb); else zadma.frameHandle = setTimeout(function() {
                zadmb(typeof performance !== "undefined" ? performance.now() : Date.now());
            }, 16);
        };
        if (typeof requestAnimationFrame !== "undefined") this.frameHandle = requestAnimationFrame(zadmb); else this.frameHandle = setTimeout(function() {
            zadmb(typeof performance !== "undefined" ? performance.now() : Date.now());
        }, 16);
        return this;
    }
    stop() {
        this.running = false;
        if (this.frameHandle !== null) {
            if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this.frameHandle); else clearTimeout(this.frameHandle);
            this.frameHandle = null;
        }
        return this;
    }
    update(zadma) {
        this.deltaTime = Math.max(0, Math.min(zadma || 0, .25));
        this.time += this.deltaTime;
        this.fps = this.deltaTime > 0 ? 1 / this.deltaTime : 0;
        if (this.input) this.input.update();
        this.physics.step(this.deltaTime);
        this.animationManager.update(this.deltaTime);
        for (var zadmb = 0; zadmb < this.animationMixers.length; zadmb++) this.animationMixers[zadmb].update(this.deltaTime);
        for (var zadmc = 0; zadmc < this.ikSolvers.length; zadmc++) this.ikSolvers[zadmc].solve();
        var zadmd = this.activeScene && (this.activeScene.activeCamera || this.activeScene.camera);
        for (var zadme = 0; zadme < this.worldStreamers.length; zadme++) if (zadmd) this.worldStreamers[zadme].update(zadmd.position, new Vector3(0, 0, -1).applyQuaternion(zadmd.quaternion));
        for (var zadmf = 0; zadmf < this.facialAnimations.length; zadmf++) this.facialAnimations[zadmf].update(this.deltaTime);
        if (this.activeScene) this.activeScene.traverse(function(zadma) {
            if (zadma instanceof ParticleSystem && zadma.autoUpdate) zadma.update(this.deltaTime);
        }.bind(this));
        for (var zadmg = 0; zadmg < this.frameCallbacks.length; zadmg++) {
            try {
                this.frameCallbacks[zadmg](this.deltaTime, this);
            } catch (zadma) {
                if (typeof console !== "undefined" && console.warn) console.warn("frame callback error:", zadma);
            }
        }
        return this;
    }
    render() {
        if (this.renderer && this.activeScene) {
            var zadma = this.activeScene.activeCamera || this.activeScene.camera;
            if (!zadma) {
                this.activeScene.traverse(function(zadmb) {
                    if (!zadma && zadmb instanceof Camera) zadma = zadmb;
                });
            }
            if (zadma) this.renderer.render(this.activeScene, zadma);
        }
        return this;
    }
    createScene(zadma) {
        var zadmb = new Scene;
        zadmb.name = zadma || "scene" + Object.keys(this.scenes).length;
        this.scenes[zadmb.name] = zadmb;
        if (!this.activeScene) this.activeScene = zadmb;
        return zadmb;
    }
    setActiveScene(zadma) {
        this.activeScene = typeof zadma === "string" ? this.scenes[zadma] : zadma;
        return this;
    }
    getScene(zadma) {
        return this.scenes[zadma];
    }
    removeScene(zadma) {
        var zadmb = typeof zadma === "string" ? this.scenes[zadma] : zadma;
        if (!zadmb) return this;
        delete this.scenes[zadmb.name];
        if (this.activeScene === zadmb) this.activeScene = null;
        zadmb.destroy();
        return this;
    }
    createMesh(zadma, zadmb) {
        return new Mesh(zadma, zadmb);
    }
    createGeometryFactory(zadma) {
        return new GeometryFactory(zadma);
    }
    createObjectPool(zadma, zadmb) {
        return new ObjectPool(zadma, zadmb);
    }
    createMeshPool(zadma, zadmb, zadmc) {
        return new MeshPool(zadma, zadmb, zadmc);
    }
    freezeScene(zadma) {
        zadma = zadma || this.activeScene;
        if (zadma && zadma.freeze) zadma.freeze();
        return zadma;
    }
    unfreezeScene(zadma) {
        zadma = zadma || this.activeScene;
        if (zadma && zadma.unfreeze) zadma.unfreeze();
        return zadma;
    }
    mergeGeometries(zadma, zadmb) {
        return Geometry.merge(zadma, zadmb);
    }
    createSkyDome(zadma, zadmb) {
        var zadmc = zadmb || new BasicMaterial({
            color: 16777215,
            side: "back",
            depthWrite: false
        });
        zadmc.side = zadmc.side || "back";
        var zadmd = new Mesh(new SphereGeometry(zadma || 100, 32, 16), zadmc);
        zadmd.frustumCulled = false;
        zadmd.userData.skyDome = true;
        return zadmd;
    }
    createParticleSystem(zadma) {
        return new ParticleSystem(zadma);
    }
    createWideLine(zadma, zadmb) {
        return new WideLine(zadma, zadmb);
    }
    createInstancedMesh(zadma, zadmb, zadmc) {
        return new InstancedMesh(zadma, zadmb, zadmc);
    }
    createBox(zadma, zadmb, zadmc, zadmd) {
        return new Mesh(new BoxGeometry(zadma, zadmb, zadmc), zadmd || new StandardMaterial);
    }
    createSphere(zadma, zadmb, zadmc, zadmd) {
        return new Mesh(new SphereGeometry(zadma, zadmb, zadmc), zadmd || new StandardMaterial);
    }
    createPlane(zadma, zadmb, zadmc) {
        return new Mesh(new PlaneGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createCylinder(zadma, zadmb, zadmc, zadmd) {
        return new Mesh(new CylinderGeometry(zadma, zadmb, zadmc), zadmd || new StandardMaterial);
    }
    createCone(zadma, zadmb, zadmc) {
        return new Mesh(new ConeGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createTorus(zadma, zadmb, zadmc) {
        return new Mesh(new TorusGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createTorusKnot(zadma, zadmb, zadmc) {
        return new Mesh(new TorusKnotGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createIcosahedron(zadma, zadmb, zadmc) {
        return new Mesh(new IcosahedronGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createDodecahedron(zadma, zadmb, zadmc) {
        return new Mesh(new DodecahedronGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createOctahedron(zadma, zadmb, zadmc) {
        return new Mesh(new OctahedronGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createTetrahedron(zadma, zadmb, zadmc) {
        return new Mesh(new TetrahedronGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createRing(zadma, zadmb, zadmc) {
        return new Mesh(new RingGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createLathe(zadma, zadmb, zadmc) {
        return new Mesh(new LatheGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createExtrude(zadma, zadmb, zadmc) {
        return new Mesh(new ExtrudeGeometry(zadma, zadmb), zadmc || new StandardMaterial);
    }
    createShape(zadma) {
        return new Shape(zadma);
    }
    createMaterial(zadma) {
        return new Material(zadma);
    }
    createStandardMaterial(zadma) {
        return new StandardMaterial(zadma);
    }
    createPhongMaterial(zadma) {
        return new PhongMaterial(zadma);
    }
    createLambertMaterial(zadma) {
        return new LambertMaterial(zadma);
    }
    createBasicMaterial(zadma) {
        return new BasicMaterial(zadma);
    }
    createTexture(zadma, zadmb) {
        return new Texture(zadma, zadmb);
    }
    createCubeTexture(zadma, zadmb) {
        return new CubeTexture(zadma, zadmb);
    }
    createAmbientLight(zadma, zadmb) {
        return new AmbientLight(zadma, zadmb);
    }
    createDirectionalLight(zadma, zadmb) {
        return new DirectionalLight(zadma, zadmb);
    }
    createPointLight(zadma, zadmb, zadmc, zadmd) {
        return new PointLight(zadma, zadmb, zadmc, zadmd);
    }
    createSpotLight(zadma, zadmb, zadmc, zadmd, zadme, zadmf) {
        return new SpotLight(zadma, zadmb, zadmc, zadmd, zadme, zadmf);
    }
    createHemisphereLight(zadma, zadmb, zadmc) {
        return new HemisphereLight(zadma, zadmb, zadmc);
    }
    createRectAreaLight(zadma, zadmb, zadmc, zadmd) {
        return new RectAreaLight(zadma, zadmb, zadmc, zadmd);
    }
    createCamera(zadma) {
        zadma = zadma || {};
        return new PerspectiveCamera(zadma.fov, zadma.aspect, zadma.near, zadma.far);
    }
    createOrthographicCamera(zadma, zadmb, zadmc, zadmd, zadme, zadmf) {
        return new OrthographicCamera(zadma, zadmb, zadmc, zadmd, zadme, zadmf);
    }
    createPerspectiveCamera(zadma, zadmb, zadmc, zadmd) {
        return new PerspectiveCamera(zadma, zadmb, zadmc, zadmd);
    }
    createNode() {
        return new Node;
    }
    createGroup() {
        return new Group;
    }
    createLOD() {
        return new LOD;
    }
    createWorldStreamer(zadma) {
        var zadmb = new WorldStreamer(this.assetLoader, zadma);
        this.worldStreamers.push(zadmb);
        if (this.activeScene) this.activeScene.add(zadmb);
        return zadmb;
    }
    createSkeleton(zadma, zadmb) {
        return new Skeleton(zadma, zadmb);
    }
    createBone() {
        return new Bone;
    }
    createSkinnedMesh(zadma, zadmb) {
        return new SkinnedMesh(zadma, zadmb);
    }
    createAnimationClip(zadma, zadmb, zadmc, zadmd) {
        return new AnimationClip(zadma, zadmb, zadmc, zadmd);
    }
    createAnimationTrack(zadma, zadmb, zadmc, zadmd, zadme) {
        return new AnimationTrack(zadma, zadmb, zadmc, zadmd, zadme);
    }
    createAnimationController(zadma) {
        var zadmb = new AnimationController(zadma);
        this.animationManager.add(zadmb);
        return zadmb;
    }
    createAnimationMixer(zadma) {
        var zadmb = new AnimationMixer(zadma);
        this.animationMixers.push(zadmb);
        return zadmb;
    }
    createAnimationStateMachine(zadma) {
        return new AnimationStateMachine(zadma);
    }
    createBlendTree(zadma) {
        return new BlendTree(zadma);
    }
    createTwoBoneIK(zadma, zadmb, zadmc, zadmd, zadme) {
        var zadmf = new TwoBoneIKSolver(zadma, zadmb, zadmc, zadmd, zadme);
        this.ikSolvers.push(zadmf);
        return zadmf;
    }
    createMotionMatcher(zadma) {
        return new MotionMatcher(zadma);
    }
    createFacialAnimation(zadma, zadmb) {
        var zadmc = new FacialAnimation(zadma, zadmb);
        this.facialAnimations.push(zadmc);
        return zadmc;
    }
    addFrameCallback(zadma) {
        if (typeof zadma === "function") this.frameCallbacks.push(zadma);
        return this;
    }
    removeFrameCallback(zadma) {
        var zadmb = this.frameCallbacks.indexOf(zadma);
        if (zadmb !== -1) this.frameCallbacks.splice(zadmb, 1);
        return this;
    }
    createPerfGovernor(zadma) {
        zadma = zadma || {};
        if (!zadma.renderer) zadma.renderer = this.renderer;
        if (!zadma.app) zadma.app = this;
        return new PerfGovernor(zadma);
    }
    createDeviceLossManager(zadma) {
        return new DeviceLossManager(this.renderer, zadma);
    }
    createProfiler(zadma) {
        return new FrameProfiler(this.renderer, zadma);
    }
    createHeadlessRenderer(zadma) {
        return new HeadlessRenderer(zadma);
    }
    createResourceLedger(zadma) {
        return new ResourceLedger(zadma);
    }
    createTaskPool(zadma) {
        return new TaskPool(zadma);
    }
    createNetcodeSession(zadma) {
        return new NetcodeSession(zadma);
    }
    createReplayRecorder(zadma) {
        return new ReplayRecorder(zadma);
    }
    createProtectedValue(zadma, zadmb) {
        return new ProtectedValue(zadma, zadmb);
    }
    createBlindedInt32(zadma, zadmb) {
        return new BlindedInt32(zadma, zadmb);
    }
    createIntegrityVM(zadma) {
        return new IntegrityVM(zadma);
    }
    createPhysicsDebugRenderer(zadma, zadmb) {
        return new PhysicsDebugRenderer(zadma, zadmb);
    }
    createSharedRingBuffer(zadma) {
        return new SharedRingBuffer(zadma);
    }
    createSharedCounter() {
        return new SharedCounter;
    }
    createWebXRAR(zadma) {
        return new WebXRAR(zadma);
    }
    createOffscreenEngine(zadma) {
        return new OffscreenEngine(zadma);
    }
    createRigidBody(zadma) {
        var zadmb = new RigidBody(zadma);
        this.physics.addBody(zadmb);
        return zadmb;
    }
    createBoxCollider(zadma, zadmb, zadmc, zadmd) {
        return new BoxCollider(zadma, zadmb, zadmc, zadmd);
    }
    createSphereCollider(zadma, zadmb) {
        return new SphereCollider(zadma, zadmb);
    }
    createCapsuleCollider(zadma, zadmb, zadmc) {
        return new CapsuleCollider(zadma, zadmb, zadmc);
    }
    createPlaneCollider(zadma, zadmb, zadmc) {
        return new PlaneCollider(zadma, zadmb, zadmc);
    }
    createConvexCollisionShape(zadma, zadmb) {
        return new ConvexCollisionShape(zadma, zadmb);
    }
    createMeshCollisionShape(zadma, zadmb, zadmc) {
        return new MeshCollisionShape(zadma, zadmb, zadmc);
    }
    createCompoundCollisionShape(zadma, zadmb) {
        return new CompoundCollisionShape(zadma, zadmb);
    }
    createCylinderCollisionShape(zadma, zadmb, zadmc) {
        return new CylinderCollisionShape(zadma, zadmb, zadmc);
    }
    createHeightfieldShape(zadma, zadmb, zadmc, zadmd, zadme, zadmf) {
        return new HeightfieldShape(zadma, zadmb, zadmc, zadmd, zadme, zadmf);
    }
    createVehicle(zadma, zadmb) {
        zadmb = zadmb || {};
        if (!zadmb.world) zadmb.world = this.physics;
        return new Vehicle(zadma, zadmb);
    }
    createRagdoll(zadma, zadmb) {
        zadmb = zadmb || {};
        if (!zadmb.world) zadmb.world = this.physics;
        return new Ragdoll(zadma, zadmb);
    }
    createDestructionBody(zadma, zadmb) {
        zadmb = zadmb || {};
        return new DestructionBody(zadmb.world || this.physics, zadma, zadmb);
    }
    createSoftBody(zadma) {
        zadma = zadma || {};
        if (!zadma.world) zadma.world = this.physics;
        var zadmb = new SoftBody(zadma);
        this.physics.addSoftBody(zadmb);
        return zadmb;
    }
    createCloth(zadma, zadmb, zadmc, zadmd, zadme) {
        zadme = zadme || {};
        if (!zadme.world) zadme.world = this.physics;
        var zadmf = new Cloth(zadma, zadmb, zadmc, zadmd, zadme);
        this.physics.addSoftBody(zadmf);
        return zadmf;
    }
    createRope(zadma, zadmb, zadmc, zadmd) {
        zadmd = zadmd || {};
        if (!zadmd.world) zadmd.world = this.physics;
        var zadme = new Rope(zadma, zadmb, zadmc, zadmd);
        this.physics.addSoftBody(zadme);
        return zadme;
    }
    createFluid(zadma) {
        zadma = zadma || {};
        if (!zadma.world) zadma.world = this.physics;
        var zadmb = new Fluid(zadma);
        this.physics.addFluid(zadmb);
        return zadmb;
    }
    createCharacterController(zadma) {
        zadma = zadma || {};
        if (!zadma.world) zadma.world = this.physics;
        return new CharacterController(zadma);
    }
    createCollisionShape(zadma, zadmb) {
        return new CollisionShape(zadma, zadmb);
    }
    createTerrain(zadma, zadmb, zadmc, zadmd, zadme) {
        var zadmf = new Terrain(zadma, zadmb, zadmc, zadmd, zadme);
        this.terrainManager.add(zadmf);
        return zadmf;
    }
    createNavmesh(zadma, zadmb) {
        var zadmc = new Navmesh(zadma, zadmb);
        this.navmeshManager.add(zadmc);
        return zadmc;
    }
    createPathfinder(zadma) {
        return new Pathfinder(zadma || this.navmeshManager.navmeshes[0]);
    }
    loadModel(zadma, zadmb) {
        return this.assetLoader.loadModel(zadma, zadmb);
    }
    loadModelInWorker(zadma, zadmb) {
        return this.assetLoader.loadModelInWorker(zadma, zadmb);
    }
    registerModel(zadma, zadmb, zadmc) {
        FaoxomJs.registerModel(zadma, zadmb, zadmc);
        return this;
    }
    loadEmbeddedModel(zadma, zadmb) {
        return this.assetLoader.load("embedded:" + zadma, "model", zadmb);
    }
    embedModel(zadma, zadmb) {
        return FaoxomJs.embedModel(zadma, zadmb);
    }
    parseCollada(zadma, zadmb) {
        return this.assetLoader.parseCollada(zadma, zadmb);
    }
    loadTexture(zadma, zadmb) {
        return this.assetLoader.loadTexture(zadma, zadmb);
    }
    loadAudio(zadma) {
        return this.assetLoader.loadAudio(zadma);
    }
    getTime() {
        return this.time;
    }
    getDeltaTime() {
        return this.deltaTime;
    }
    getFPS() {
        return this.fps;
    }
    resize(zadma, zadmb) {
        if (this.renderer) {
            if (zadma === undefined && typeof window !== "undefined") zadma = window.innerWidth;
            if (zadmb === undefined && typeof window !== "undefined") zadmb = window.innerHeight;
            this.renderer.resize(zadma, zadmb);
        }
        return this;
    }
    setClearColor(zadma, zadmb) {
        if (this.renderer) this.renderer.setClearColor(zadma, zadmb);
        return this;
    }
    setBackground(zadma) {
        this.background = zadma;
        if (this.activeScene) this.activeScene.background = zadma;
        return this;
    }
    setFog(zadma) {
        if (this.activeScene) this.activeScene.fog = zadma;
        return this;
    }
    enableShadows(zadma) {
        if (this.renderer) this.renderer.shadowMap.enabled = zadma !== false;
        return this;
    }
    setShadowCascades(zadma, zadmb, zadmc) {
        if (zadma && zadma.shadow) {
            zadma.shadow.cascades = Math.max(1, Math.min(4, Math.floor(zadmb || 4)));
            if (zadmc !== undefined) zadma.shadow.splitLambda = faoxomclamp(zadmc, 0, 1);
        }
        return this;
    }
    enableOcclusionCulling(zadma) {
        if (this.renderer) this.renderer.createOcclusionCuller().enabled = zadma !== false;
        return this;
    }
    enableAutoBatching(zadma) {
        if (this.renderer) this.renderer.autoBatch = zadma !== false;
        return this;
    }
    setToneMapping(zadma) {
        if (this.renderer) this.renderer.toneMapping = zadma === "aces" || zadma === 2 ? 2 : zadma === "reinhard" || zadma === 1 ? 1 : 0;
        return this;
    }
    setExposure(zadma) {
        if (this.renderer) this.renderer.exposure = Math.max(0, zadma);
        return this;
    }
    setGamma(zadma) {
        if (this.renderer) this.renderer.gamma = Math.max(.1, zadma);
        return this;
    }
    createPostProcessing(zadma) {
        return this.renderer instanceof WebGPURenderer ? new WebGPUPostProcessingComposer(this.renderer, zadma) : new PostProcessingComposer(this.renderer, zadma);
    }
    createWebGPUToneMappingPass(zadma) {
        return new WebGPUToneMappingPass(zadma);
    }
    createGPUFXAAPass(zadma) {
        return new WebGPUFXAAPass(zadma);
    }
    createGPUBloomPass(zadma) {
        return new WebGPUBloomPass(zadma);
    }
    createBloomPass(zadma) {
        return new BloomPass(zadma);
    }
    createVignettePass(zadma) {
        return new VignettePass(zadma);
    }
    createFXAAPass(zadma) {
        return new FXAAPass(zadma);
    }
    createColorGradePass(zadma) {
        return new ColorGradePass(zadma);
    }
    createSSAOPass(zadma) {
        return new SSAOPass(zadma);
    }
    createSSRPass(zadma) {
        return new SSRPass(zadma);
    }
    createGBufferTarget(zadma, zadmb, zadmc) {
        return new GBufferTarget(this.renderer, zadma, zadmb, zadmc);
    }
    createRenderTarget(zadma, zadmb, zadmc) {
        return new RenderTarget(this.renderer, zadma, zadmb, zadmc);
    }
    createGPUCompute() {
        return new GPUCompute(this.renderer);
    }
    createDecal(zadma, zadmb, zadmc, zadmd) {
        return new Decal(zadma, zadmb, zadmc, zadmd);
    }
    createSceneExporter() {
        return new SceneExporter;
    }
    exportScene(zadma) {
        return (new SceneExporter).toJSON(zadma || this.activeScene);
    }
    setShadowMapSize(zadma) {
        if (this.renderer) this.renderer.shadowMap.size = zadma;
        return this;
    }
    getRenderer() {
        return this.renderer;
    }
    getGPUCapabilities() {
        return this.renderer ? this.renderer.getCapabilities() : {
            webgl2: false,
            maxTextureSize: 0,
            maxTextureUnits: 0,
            compressedTextureFormats: [],
            extensions: {}
        };
    }
    getPhysics() {
        return this.physics;
    }
    getInput() {
        return this.input;
    }
    getAnimationManager() {
        return this.animationManager;
    }
    getNavmeshManager() {
        return this.navmeshManager;
    }
    getTerrainManager() {
        return this.terrainManager;
    }
    onReady(zadma) {
        if (this.initialized) zadma(this); else this.readyCallbacks.push(zadma);
        return this;
    }
    destroy() {
        this.stop();
        if (this.input) this.input.destroy();
        for (var zadma in this.scenes) this.scenes[zadma].destroy();
        this.scenes = {};
        if (this.renderer) this.renderer.dispose();
        this.renderer = null;
        this.activeScene = null;
    }
}

FaoxomJs.prototype.initWebGPU = async function(zadma) {
    zadma = zadma || this.options.renderer || this.options;
    if (zadma.canvas === undefined && this.renderer) zadma.canvas = this.renderer.canvas;
    this.stop();
    this.renderer = new WebGPURenderer(zadma);
    await this.renderer.init();
    this.assetLoader.options.renderer = this.renderer;
    if (!this.activeScene) this.createScene("main");
    this.initialized = true;
    return this;
};

FaoxomJs.prototype.createWebGPUCompute = function() {
    return new WebGPUCompute(this.renderer);
};

FaoxomJs.prototype.createPMREMGenerator = function() {
    return new PMREMGenerator(this.renderer);
};

FaoxomJs.prototype.createReflectionProbe = function(zadma) {
    return new ReflectionProbe(this.renderer, zadma);
};

FaoxomJs.prototype.createGLTFLoader = function() {
    return new GLTFLoader(this.assetLoader);
};

FaoxomJs.prototype.createFBXLoader = function() {
    return new FBXLoader(this.assetLoader);
};

FaoxomJs.prototype.createKTX2Loader = function() {
    return new KTX2Loader(this.assetLoader, this.renderer);
};

FaoxomJs.prototype.createDRACOLoader = function() {
    return new DRACOLoader(this.assetLoader);
};

FaoxomJs.prototype.createXRManager = function() {
    return new WebXRManager(this);
};

FaoxomJs.prototype.createXRInputVisualizer = function(zadma, zadmb) {
    var zadmc = this.xrManager || (this.xrManager = new WebXRManager(this));
    return zadmc.createInputVisualizer(zadma || this.activeScene, zadmb);
};

FaoxomJs.prototype.setPhysicsBroadphase = function(zadma, zadmb) {
    this.physics.broadphase = zadma === "grid" ? "grid" : "aabb";
    if (zadmb !== undefined) this.physics.broadphaseCellSize = Math.max(.1, zadmb);
    return this;
};

FaoxomJs.prototype.createAnimationRetargeter = function(zadma, zadmb) {
    return new AnimationRetargeter(zadma, zadmb);
};

FaoxomJs.prototype.createRootMotionExtractor = function(zadma, zadmb, zadmc) {
    return new RootMotionExtractor(zadma, zadmb, zadmc);
};

FaoxomJs.prototype.createJointLimit = function(zadma, zadmb) {
    return new JointLimit(zadma, zadmb);
};

FaoxomJs.prototype.compressAnimation = function(zadma, zadmb) {
    return AnimationCompressor.compress(zadma, zadmb);
};

FaoxomJs.prototype.createTextureFormatSelector = function() {
    return new TextureFormatSelector(this.renderer);
};

FaoxomJs.prototype.createTextureStreamer = function(zadma) {
    return new TextureStreamer(this.assetLoader, this.renderer, zadma);
};

FaoxomJs.prototype.createOrbitControls = function(zadma, zadmb) {
    return new OrbitControls(zadma || this.activeScene.camera, zadmb || this.renderer.canvas);
};

FaoxomJs.prototype.createTransformControls = function(zadma, zadmb) {
    return new TransformControls(zadma || this.activeScene.camera, zadmb || this.renderer.canvas);
};

FaoxomJs.prototype.createStatsPanel = function(zadma) {
    return new StatsPanel(zadma);
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FaoxomJs;
}

export { FaoxomJs, faoxommodelmodule };
