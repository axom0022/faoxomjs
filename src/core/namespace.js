import { FaoxomJs } from "./facade.js";

import { Scene } from "../scenes/index.js";

import { MeshletSet, MegaGeometry, FXOMVGS, PCGRandom, PCGNoise, PCGTerrain, PCGScatter, PCGDungeon, PCGGrammar, FaoxWriter, FaoxPacker, FaoxLoader, FAOX_VERSION, FloatingOrigin, GPUBroadphase, FixedSimulation, ResidencyManager, AutomaticLOD, simplifyQuadric, bayer8, ditherThreshold, ditheredOpacity, BVH, TerrainClipmap, ScatterField, GameInput, PerfGovernor, AdaptiveFrameBudget, VisibilityBudget, FrameTaskScheduler, RenderBenchmark, PNGCodec, HeadlessRenderer, WebXRAR, TaskPool, OffscreenEngine, FaoxomSceneElement } from "../extras/index.js";

import { BloomPass, BokehDepthOfFieldPass, CascadedShadowMap, ColorGradePass, EffectComposer, FXAAPass, FXOMDGIAR, FrameGraph, GBufferTarget, GPUCompute, GPUComputePass, GPUCullingPipeline, GPUIndirectDrawBuffer, GPURayQuery, GPURTShadows, GPURTReflections, GPUMeshletCuller, ClusteredLighting, GPUDrivenPipeline, GTAOPass, HBAOPass, HiZBuffer, HiZOcclusion, OcclusionCuller, Pass, PostProcessPass, PostProcessingComposer, ProgressiveBloomPass, RenderPass, RenderTarget, SSAOPass, SSGIPass, SSRPass, ScreenSpaceReflectionsPass, SunBeam, TAAPass, VignettePass, VolumetricPass, WebGLRenderTarget, WebGLRenderer, WebGPUBloomPass, WebGPUCompute, WebGPUFXAAPass, WebGPUPostProcessPass, WebGPUPostProcessingComposer, WebGPURenderer, WebGPUResourceManager, WebGPUToneMappingPass, OITRenderer, FroxelLighting, AtmosphereRenderer, GaussianSplatRenderer, FFTOcean, GPUParticles, SkinnedCrowd, ResourceLedger, DeviceLossManager, FrameProfiler } from "../renderers/index.js";

import { CompressedCubeTexture, CompressedTexture3D, CompressedTextureArray, CubeTexture, Data3DTexture, DataArrayTexture, DataTexture, DepthTexture, HDRTexture, PREMEnv, PMREMGenerator, Texture, TextureFormatSelector, TextureStreamer, VideoTexture, VirtualTexture, VTStreamer, VTSurface, VTShadowBaker } from "../textures/index.js";

import { AntiTamper, AtmosphericSky, BVHNode, BallAndSocketJoint, BlindedInt32, BoxCollider, BreakableConstraint, CanaryGrid, CapsuleCollider, CCDSolver, CharacterController, Cloth, ClothSimulation, CollisionShape, CompoundCollisionShape, Constraint, ContinuousLOD, ConvexCollisionShape, ConvexHullCollider, CrossOrigin, CylinderCollisionShape, Decal, DestructionBody, DistanceConstraint, DistanceJoint, EPA, FaoxomReact, FixedConstraint, FrameKeyChain, Fluid, GJK, GPUParticleComputeSystem, GPUStateVault, HeightfieldShape, HingeJoint, IntegrityVM, Inspector, JointLimit, MeshCollisionShape, Navmesh, NavmeshManager, NetcodeSession, Pathfinder, PhysicsDebugRenderer, PhysicsWorld, PlaneCollider, ProtectedValue, Ragdoll, RagdollChain, ReflectionProbe, ReflectionProbeEnvironment, ReplayPlayer, ReplayRecorder, RigidBody, Rope, SPHFluidSimulation, SharedCounter, SharedRingBuffer, SliderJoint, SoftBody, SoftBodySimulation, SphereCollider, SpeedhackDetector, SpringConstraint, SpringJoint, Terrain, TerrainManager, TriMeshBVH, TriMeshCollider, TrustedInput, Vehicle, VehicleWheel, WebXRHandTracker, WebXRHaptics, WebXRInputVisualizer, WebXRLightEstimator, WebXRManager, WebXRPlaneDetector, WorldStreamer } from "../extras/index.js";

import { AnimationAction, AnimationClip, AnimationCompressor, AnimationController, AnimationGraph, AnimationManager, AnimationMixer, AnimationRetargeter, AnimationStateMachine, AnimationTrack, BlendTree, FacialAnimation, MotionMatcher, RootMotionExtractor, SkeletonRetargeter, TwoBoneIKSolver } from "../animation/index.js";

import { AssetLoader, BlenderFidelityProfile, DDSLoader, DRACOLoader, EXRLoader, FBXLoader, FileLoader, Font, FontLoader, GCodeLoader, GLTFExporter, GLTFLoader, HDRCubeTextureLoader, KTX2Loader, LoadingManager, MD2Loader, MDDLoader, MSDFText, ModelBuilder, OBJExporter, PCDLoader, PLYExporter, PLYLoader, RGBELoader, STLExporter, STLLoader, SVGLoader, SceneExporter, TGALoader, TextureLoader, VTKLoader, SplatPLYLoader, SPZLoader, SOGLoader } from "../loaders/index.js";

import { ArcballControls, Camera, FirstPersonControls, InputManager, MapControls, OrbitControls, OrthographicCamera, PerspectiveCamera, PointerLockControls, TransformControls } from "../camera/index.js";

import { CameraHelper, DirectionalLightHelper, PointLightHelper, SkeletonHelper, StatsPanel } from "../helpers/index.js";

import { CameraPositionNode, ColorNode, FloatNode, FresnelNode, MathNode, BasicNodeMaterial, StandardNodeMaterial, NodeMaterial, NoiseNode, NormalNode, OperatorNode, PositionNode, ShaderNode, TSLBufferPacker, TextureNode, TimerNode, UVNode, Vector2Node, Vector3Node, Vector4Node, tsl } from "../nodes/index.js";

import { AudioEnvironment, AudioListener, PositionalAudio, SpatialAudioSystem } from "../audio/index.js";

import { AmbientLight, ClusteredLightingManager, DirectionalLight, HemisphereLight, Light, LightClusterGrid, PointLight, RectAreaLight, SpotLight } from "../lights/index.js";

import { Bone, ClipVolume, ClipVolumeArray, DecalGeometry, Group, InstancedMesh, LOD, Line, LineLoop, LineSegments, Mesh, MeshPool, ObjectPool, ParticleSystem, Points, Skeleton, SkinnedMesh, Sprite, WideLine, faoxomsimplifygeometry } from "../objects/index.js";

import { FNMaterial, BasicMaterial, LambertMaterial, LineBasicMaterial, LineMaterial, Material, PhongMaterial, PhysicalMaterial, PointsMaterial, SSSSProfile, ShaderMaterial, StandardMaterial, FNFloat, FNVec2, FNVec3, FNVec4, FNColor, FNUV, FNSurfaceNormal, FNViewDir, FNVertexColor, FNMaterialColor, FNMaterialAlpha, FNTexture, FNMath, FNMix, FNClamp, FNSaturate, FNChannel, FNDot, FNNormalize, FNFresnel, FNChecker, FNNoise, FNNode } from "../materials/index.js";

import { ACESFilmicToneMapping, AdditiveBlending, AgXToneMapping, BackSide, BufferAttribute, CineonToneMapping, ClampToEdgeWrapping, Clock, DepthFormat, DoubleSide, DynamicDrawUsage, EventDispatcher, Float32BufferAtt, FloatType, Fog, FogExp2, FrontSide, HalfFloatType, InstancedBufferAtt, LinearFilter, LinearSRGBColorSpace, LinearToneMapping, MirroredRepeatWrapping, MultiplyBlending, NearestFilter, NoToneMapping, Node, NormalBlending, Object3D, RGBA16FFormat, RGBAFormat, Raycaster, ReinhardToneMapping, RenderLayers, RepeatWrapping, SRGBColorSpace, StaticDrawUsage, SubtractiveBlending, UnsignedByteType, faoxombase64text, faoxommodelstore, faoxomregistermodel, faoxomstate } from "./index.js";

import { Box3, CatmullRomCurve3, Color, CubicBezierCurve3, Curve, Euler, LineCurve3, Matrix3, Matrix4, NURBSCurve, NURBSSurface, NURBSUtils, Path, Plane, QuadraticBezierCurve3, Quaternion, Ray, Segment3, Shape, ShapePath, ShapeUtils, Sphere, Tri3, Vector2, Vector3, Vector4, faoxomclamp } from "../math/index.js";

import { BeveledBoxGeometry, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, EdgeOutlineGeometry, ExtrudeGeometry, Geometry, GeometryFactory, IcosahedronGeometry, LatheGeometry, MeshDecimator, OctahedronGeometry, ParametricGeometry, PlaneGeometry, RingGeometry, ShapeGeometry, SphereGeometry, TetrahedronGeometry, TextGeometry, TorusGeometry, TorusKnotGeometry, TubeGeometry, VirtualGeometryStreamer, WideLineGeometry } from "../geometries/index.js";

import { faoxommodelmodule } from "./facade.js";

FaoxomJs.Vector2 = Vector2;

FaoxomJs.Vector3 = Vector3;

FaoxomJs.Vector4 = Vector4;

FaoxomJs.Euler = Euler;

FaoxomJs.Quaternion = Quaternion;

FaoxomJs.Matrix4 = Matrix4;

FaoxomJs.Matrix3 = Matrix3;

FaoxomJs.Box3 = Box3;

FaoxomJs.Sphere = Sphere;

FaoxomJs.Plane = Plane;

FaoxomJs.Ray = Ray;

FaoxomJs.ClipVolume = ClipVolume;

FaoxomJs.ClipVolumeArray = ClipVolumeArray;

FaoxomJs.Segment3 = Segment3;

FaoxomJs.Tri3 = Tri3;

FaoxomJs.BlendEquations = {
    ADD: "add",
    SUBTRACT: "subtract",
    REVERSE_SUBTRACT: "reverseSubtract",
    MIN: "min",
    MAX: "max"
};

FaoxomJs.Color = Color;

FaoxomJs.Fog = Fog;

FaoxomJs.FogExp2 = FogExp2;

FaoxomJs.Object3D = Object3D;

FaoxomJs.EventDispatcher = EventDispatcher;

FaoxomJs.Node = Node;

FaoxomJs.Group = Group;

FaoxomJs.Scene = Scene;

FaoxomJs.Mesh = Mesh;

FaoxomJs.RenderLayers = RenderLayers;

FaoxomJs.Sprite = Sprite;

FaoxomJs.VideoTexture = VideoTexture;

FaoxomJs.DataTexture = DataTexture;

FaoxomJs.DataArrayTexture = DataArrayTexture;

FaoxomJs.InstancedMesh = InstancedMesh;

FaoxomJs.ObjectPool = ObjectPool;

FaoxomJs.MeshPool = MeshPool;

FaoxomJs.ParticleSystem = ParticleSystem;

FaoxomJs.WideLineGeometry = WideLineGeometry;

FaoxomJs.LineBasicMaterial = LineBasicMaterial;

FaoxomJs.PointsMaterial = PointsMaterial;

FaoxomJs.Line = Line;

FaoxomJs.LineSegments = LineSegments;

FaoxomJs.LineLoop = LineLoop;

FaoxomJs.Points = Points;

FaoxomJs.LineMaterial = LineMaterial;

FaoxomJs.WideLine = WideLine;

FaoxomJs.LOD = LOD;

FaoxomJs.WorldStreamer = WorldStreamer;

FaoxomJs.ResidencyManager = ResidencyManager;

FaoxomJs.AutomaticLOD = AutomaticLOD;

FaoxomJs.BVH = BVH;

FaoxomJs.simplifyQuadric = simplifyQuadric;

FaoxomJs.bayer8 = bayer8;

FaoxomJs.ditherThreshold = ditherThreshold;

FaoxomJs.ditheredOpacity = ditheredOpacity;

FaoxomJs.Geometry = Geometry;

FaoxomJs.GeometryFactory = GeometryFactory;

FaoxomJs.simplifyGeometry = faoxomsimplifygeometry;

FaoxomJs.AnimationRetargeter = AnimationRetargeter;

FaoxomJs.RootMotionExtractor = RootMotionExtractor;

FaoxomJs.JointLimit = JointLimit;

FaoxomJs.AnimationCompressor = AnimationCompressor;

FaoxomJs.GLTFLoader = GLTFLoader;

FaoxomJs.FBXLoader = FBXLoader;

FaoxomJs.DRACOLoader = DRACOLoader;

FaoxomJs.KTX2Loader = KTX2Loader;

FaoxomJs.WebGPUResourceManager = WebGPUResourceManager;

FaoxomJs.WebGPURenderer = WebGPURenderer;

FaoxomJs.WebGPUPostProcessPass = WebGPUPostProcessPass;

FaoxomJs.WebGPUToneMappingPass = WebGPUToneMappingPass;

FaoxomJs.WebGPUFXAAPass = WebGPUFXAAPass;

FaoxomJs.WebGPUBloomPass = WebGPUBloomPass;

FaoxomJs.WebGPUPostProcessingComposer = WebGPUPostProcessingComposer;

FaoxomJs.WebGPUCompute = WebGPUCompute;

FaoxomJs.PREMEnv = PREMEnv;

FaoxomJs.PMREMGenerator = PMREMGenerator;

FaoxomJs.ReflectionProbe = ReflectionProbe;

FaoxomJs.ReflectionProbeEnvironment = ReflectionProbeEnvironment;

FaoxomJs.BlenderFidelityProfile = BlenderFidelityProfile;

FaoxomJs.createBlenderFidelityProfile = function(zagea, zageb) {
    return new BlenderFidelityProfile(zagea, zageb);
};

FaoxomJs.WebXRManager = WebXRManager;

FaoxomJs.WebXRInputVisualizer = WebXRInputVisualizer;

FaoxomJs.TextureFormatSelector = TextureFormatSelector;

FaoxomJs.TextureStreamer = TextureStreamer;

FaoxomJs.VirtualTexture = VirtualTexture;

FaoxomJs.VTStreamer = VTStreamer;

FaoxomJs.VTSurface = VTSurface;

FaoxomJs.VTShadowBaker = VTShadowBaker;

FaoxomJs.BoxGeometry = BoxGeometry;

FaoxomJs.BeveledBoxGeometry = BeveledBoxGeometry;

FaoxomJs.ModelBuilder = ModelBuilder;

FaoxomJs.SphereGeometry = SphereGeometry;

FaoxomJs.PlaneGeometry = PlaneGeometry;

FaoxomJs.CylinderGeometry = CylinderGeometry;

FaoxomJs.ConeGeometry = ConeGeometry;

FaoxomJs.TorusGeometry = TorusGeometry;

FaoxomJs.EdgeOutlineGeometry = EdgeOutlineGeometry;

FaoxomJs.TorusKnotGeometry = TorusKnotGeometry;

FaoxomJs.ShapeGeometry = ShapeGeometry;

FaoxomJs.Path = Path;

FaoxomJs.ShapePath = ShapePath;

FaoxomJs.ShapeUtils = ShapeUtils;

FaoxomJs.CircleGeometry = CircleGeometry;

FaoxomJs.TubeGeometry = TubeGeometry;

FaoxomJs.QuadraticBezierCurve3 = QuadraticBezierCurve3;

FaoxomJs.IcosahedronGeometry = IcosahedronGeometry;

FaoxomJs.DodecahedronGeometry = DodecahedronGeometry;

FaoxomJs.OctahedronGeometry = OctahedronGeometry;

FaoxomJs.TetrahedronGeometry = TetrahedronGeometry;

FaoxomJs.RingGeometry = RingGeometry;

FaoxomJs.LatheGeometry = LatheGeometry;

FaoxomJs.ExtrudeGeometry = ExtrudeGeometry;

FaoxomJs.Shape = Shape;

FaoxomJs.Material = Material;

FaoxomJs.StandardMaterial = StandardMaterial;

FaoxomJs.MeshStandardMaterial = StandardMaterial;

FaoxomJs.MeshBasicMaterial = BasicMaterial;

FaoxomJs.MeshPhongMaterial = PhongMaterial;

FaoxomJs.MeshLambertMaterial = LambertMaterial;

FaoxomJs.PhongMaterial = PhongMaterial;

FaoxomJs.LambertMaterial = LambertMaterial;

FaoxomJs.BasicMaterial = BasicMaterial;

FaoxomJs.FNMaterial = FNMaterial;

FaoxomJs.FNNode = FNNode;

FaoxomJs.FNFloat = FNFloat;

FaoxomJs.FNVec2 = FNVec2;

FaoxomJs.FNVec3 = FNVec3;

FaoxomJs.FNVec4 = FNVec4;

FaoxomJs.FNColor = FNColor;

FaoxomJs.FNUV = FNUV;

FaoxomJs.FNSurfaceNormal = FNSurfaceNormal;

FaoxomJs.FNViewDir = FNViewDir;

FaoxomJs.FNVertexColor = FNVertexColor;

FaoxomJs.FNMaterialColor = FNMaterialColor;

FaoxomJs.FNMaterialAlpha = FNMaterialAlpha;

FaoxomJs.FNTexture = FNTexture;

FaoxomJs.FNMath = FNMath;

FaoxomJs.FNMix = FNMix;

FaoxomJs.FNClamp = FNClamp;

FaoxomJs.FNSaturate = FNSaturate;

FaoxomJs.FNChannel = FNChannel;

FaoxomJs.FNDot = FNDot;

FaoxomJs.FNNormalize = FNNormalize;

FaoxomJs.FNFresnel = FNFresnel;

FaoxomJs.FNChecker = FNChecker;

FaoxomJs.FNNoise = FNNoise;

FaoxomJs.ShaderMaterial = ShaderMaterial;

FaoxomJs.InstancedBufferAtt = InstancedBufferAtt;

FaoxomJs.BufferAttribute = BufferAttribute;

FaoxomJs.Float32BufferAtt = Float32BufferAtt;

FaoxomJs.BufferGeometry = Geometry;

FaoxomJs.Clock = Clock;

FaoxomJs.Raycaster = Raycaster;

FaoxomJs.MathUtils = {
    clamp: faoxomclamp,
    euclideanModulo: function(zagea, zageb) {
        return (zagea % zageb + zageb) % zageb;
    },
    mapLinear: function(zagea, zageb, zagec, zaged, zagee) {
        return zaged + (zagea - zageb) * (zagee - zaged) / (zagec - zageb);
    },
    lerp: function(zagea, zageb, zagec) {
        return (1 - zagec) * zagea + zagec * zageb;
    },
    damp: function(zagea, zageb, zagec, zaged) {
        return zagea + (zageb - zagea) * (1 - Math.exp(-zagec * zaged));
    },
    pingpong: function(zagea, zageb) {
        return zageb - Math.abs(FaoxomJs.MathUtils.euclideanModulo(zagea, zageb * 2) - zageb);
    },
    smoothstep: function(zagea, zageb, zagec) {
        if (zagea <= zageb) return 0;
        if (zagea >= zagec) return 1;
        zagea = (zagea - zageb) / (zagec - zageb);
        return zagea * zagea * (3 - 2 * zagea);
    },
    smootherstep: function(zagea, zageb, zagec) {
        if (zagea <= zageb) return 0;
        if (zagea >= zagec) return 1;
        zagea = (zagea - zageb) / (zagec - zageb);
        return zagea * zagea * zagea * (zagea * (zagea * 6 - 15) + 10);
    },
    degToRad: function(zagea) {
        return zagea * Math.PI / 180;
    },
    radToDeg: function(zagea) {
        return zagea * 180 / Math.PI;
    },
    randFloat: function(zagea, zageb) {
        return zagea + Math.random() * (zageb - zagea);
    },
    randInt: function(zagea, zageb) {
        return Math.floor(zagea + Math.random() * (zageb - zagea + 1));
    },
    isPowerOfTwo: function(zagea) {
        if (typeof zagea !== "number" || !isFinite(zagea) || zagea <= 0 || zagea % 1 !== 0) return false;
        while (zagea % 2 === 0) zagea /= 2;
        return zagea === 1;
    },
    ceilPowerOfTwo: function(zagea) {
        return Math.pow(2, Math.ceil(Math.log(zagea) / Math.LN2));
    },
    floorPowerOfTwo: function(zagea) {
        return Math.pow(2, Math.floor(Math.log(zagea) / Math.LN2));
    }
};

FaoxomJs.Texture = Texture;

FaoxomJs.LoadingManager = LoadingManager;

FaoxomJs.FileLoader = FileLoader;

FaoxomJs.TextureLoader = TextureLoader;

FaoxomJs.DepthTexture = DepthTexture;

FaoxomJs.HDRTexture = HDRTexture;

FaoxomJs.CubeTexture = CubeTexture;

FaoxomJs.CompressedCubeTexture = CompressedCubeTexture;

FaoxomJs.CompressedTextureArray = CompressedTextureArray;

FaoxomJs.CompressedTexture3D = CompressedTexture3D;

FaoxomJs.Light = Light;

FaoxomJs.AmbientLight = AmbientLight;

FaoxomJs.DirectionalLight = DirectionalLight;

FaoxomJs.SunBeam = SunBeam;

FaoxomJs.PointLight = PointLight;

FaoxomJs.SpotLight = SpotLight;

FaoxomJs.HemisphereLight = HemisphereLight;

FaoxomJs.RectAreaLight = RectAreaLight;

FaoxomJs.Camera = Camera;

FaoxomJs.PerspectiveCamera = PerspectiveCamera;

FaoxomJs.OrthographicCamera = OrthographicCamera;

FaoxomJs.Bone = Bone;

FaoxomJs.Skeleton = Skeleton;

FaoxomJs.SkinnedMesh = SkinnedMesh;

FaoxomJs.AnimationClip = AnimationClip;

FaoxomJs.AnimationTrack = AnimationTrack;

FaoxomJs.AnimationController = AnimationController;

FaoxomJs.AnimationManager = AnimationManager;

FaoxomJs.AnimationAction = AnimationAction;

FaoxomJs.AnimationMixer = AnimationMixer;

FaoxomJs.AnimationStateMachine = AnimationStateMachine;

FaoxomJs.BlendTree = BlendTree;

FaoxomJs.TwoBoneIKSolver = TwoBoneIKSolver;

FaoxomJs.MotionMatcher = MotionMatcher;

FaoxomJs.FacialAnimation = FacialAnimation;

FaoxomJs.CollisionShape = CollisionShape;

FaoxomJs.AntiTamper = AntiTamper;

FaoxomJs.BlindedInt32 = BlindedInt32;

FaoxomJs.CanaryGrid = CanaryGrid;

FaoxomJs.CrossOrigin = CrossOrigin;

FaoxomJs.FrameKeyChain = FrameKeyChain;

FaoxomJs.GPUStateVault = GPUStateVault;

FaoxomJs.IntegrityVM = IntegrityVM;

FaoxomJs.Inspector = Inspector;

FaoxomJs.NetcodeSession = NetcodeSession;

FaoxomJs.PhysicsDebugRenderer = PhysicsDebugRenderer;

FaoxomJs.ProtectedValue = ProtectedValue;

FaoxomJs.ReplayPlayer = ReplayPlayer;

FaoxomJs.ReplayRecorder = ReplayRecorder;

FaoxomJs.SharedCounter = SharedCounter;

FaoxomJs.SharedRingBuffer = SharedRingBuffer;

FaoxomJs.SpeedhackDetector = SpeedhackDetector;

FaoxomJs.TrustedInput = TrustedInput;

FaoxomJs.BoxCollider = BoxCollider;

FaoxomJs.SphereCollider = SphereCollider;

FaoxomJs.PlaneCollider = PlaneCollider;

FaoxomJs.CapsuleCollider = CapsuleCollider;

FaoxomJs.ConvexCollisionShape = ConvexCollisionShape;

FaoxomJs.MeshCollisionShape = MeshCollisionShape;

FaoxomJs.CompoundCollisionShape = CompoundCollisionShape;

FaoxomJs.CylinderCollisionShape = CylinderCollisionShape;

FaoxomJs.HeightfieldShape = HeightfieldShape;

FaoxomJs.RigidBody = RigidBody;

FaoxomJs.DistanceConstraint = DistanceConstraint;

FaoxomJs.FixedConstraint = FixedConstraint;

FaoxomJs.BreakableConstraint = BreakableConstraint;

FaoxomJs.SpringConstraint = SpringConstraint;

FaoxomJs.VehicleWheel = VehicleWheel;

FaoxomJs.Vehicle = Vehicle;

FaoxomJs.Ragdoll = Ragdoll;

FaoxomJs.SoftBody = SoftBody;

FaoxomJs.Cloth = Cloth;

FaoxomJs.Rope = Rope;

FaoxomJs.Fluid = Fluid;

FaoxomJs.DestructionBody = DestructionBody;

FaoxomJs.PhysicsWorld = PhysicsWorld;

FaoxomJs.CharacterController = CharacterController;

FaoxomJs.Terrain = Terrain;

FaoxomJs.TerrainClipmap = TerrainClipmap;

FaoxomJs.ScatterField = ScatterField;

FaoxomJs.TerrainManager = TerrainManager;

FaoxomJs.Navmesh = Navmesh;

FaoxomJs.Pathfinder = Pathfinder;

FaoxomJs.NavmeshManager = NavmeshManager;

FaoxomJs.InputManager = InputManager;

FaoxomJs.RenderTarget = RenderTarget;

FaoxomJs.WebGLRenderTarget = WebGLRenderTarget;

FaoxomJs.DepthFormat = DepthFormat;

FaoxomJs.GBufferTarget = GBufferTarget;

FaoxomJs.GPUCompute = GPUCompute;

FaoxomJs.OcclusionCuller = OcclusionCuller;

FaoxomJs.DecalGeometry = DecalGeometry;

FaoxomJs.Decal = Decal;

FaoxomJs.SceneExporter = SceneExporter;

FaoxomJs.PostProcessPass = PostProcessPass;

FaoxomJs.BloomPass = BloomPass;

FaoxomJs.VignettePass = VignettePass;

FaoxomJs.FXAAPass = FXAAPass;

FaoxomJs.FXOMDGIAR = FXOMDGIAR;

FaoxomJs.FrameGraph = FrameGraph;

FaoxomJs.OITRenderer = OITRenderer;

FaoxomJs.FroxelLighting = FroxelLighting;

FaoxomJs.AtmosphereRenderer = AtmosphereRenderer;

FaoxomJs.GaussianSplatRenderer = GaussianSplatRenderer;

FaoxomJs.FFTOcean = FFTOcean;

FaoxomJs.GPUParticles = GPUParticles;

FaoxomJs.SkinnedCrowd = SkinnedCrowd;

FaoxomJs.AnimationGraph = AnimationGraph;

FaoxomJs.SkeletonRetargeter = SkeletonRetargeter;

FaoxomJs.SpatialAudioSystem = SpatialAudioSystem;

FaoxomJs.GameInput = GameInput;

FaoxomJs.PerfGovernor = PerfGovernor;

FaoxomJs.AdaptiveFrameBudget = AdaptiveFrameBudget;

FaoxomJs.VisibilityBudget = VisibilityBudget;

FaoxomJs.FrameTaskScheduler = FrameTaskScheduler;

FaoxomJs.RenderBenchmark = RenderBenchmark;

FaoxomJs.PNGCodec = PNGCodec;

FaoxomJs.HeadlessRenderer = HeadlessRenderer;

FaoxomJs.ResourceLedger = ResourceLedger;

FaoxomJs.DeviceLossManager = DeviceLossManager;

FaoxomJs.FrameProfiler = FrameProfiler;

FaoxomJs.WebXRAR = WebXRAR;

FaoxomJs.TaskPool = TaskPool;

FaoxomJs.OffscreenEngine = OffscreenEngine;

FaoxomJs.FaoxomSceneElement = FaoxomSceneElement;

FaoxomJs.SplatPLYLoader = SplatPLYLoader;

FaoxomJs.SPZLoader = SPZLoader;

FaoxomJs.SOGLoader = SOGLoader;

FaoxomJs.ColorGradePass = ColorGradePass;

FaoxomJs.SSAOPass = SSAOPass;

FaoxomJs.SSRPass = SSRPass;

FaoxomJs.PostProcessingComposer = PostProcessingComposer;

FaoxomJs.WebGLRenderer = WebGLRenderer;

FaoxomJs.AssetLoader = AssetLoader;

FaoxomJs.registerModel = function(zagea, zageb, zagec) {
    faoxomregistermodel(zagea, zageb, zagec);
    return FaoxomJs;
};

FaoxomJs.listEmbeddedModels = function() {
    return Object.keys(faoxommodelstore());
};

FaoxomJs.removeEmbeddedModel = function(zagea) {
    var zageb = faoxommodelstore();
    if (Object.prototype.hasOwnProperty.call(zageb, zagea)) {
        delete zageb[zagea];
        faoxomstate.faoxommodelstoreversion++;
    }
    return FaoxomJs;
};

FaoxomJs.embedModel = function(zagea, zageb) {
    zageb = zageb || {};
    var zagec = zageb.name || (typeof zagea === "string" ? (zagea.split("?")[0].split("/").pop() || "model").replace(/\.[^.]+$/, "") : "model");
    return Promise.resolve().then(function() {
        if (zagea instanceof ArrayBuffer) return zagea;
        if (zagea instanceof Uint8Array) return zagea.buffer.slice(zagea.byteOffset, zagea.byteOffset + zagea.byteLength);
        if (typeof zagea === "string") return fetch(zagea).then(function(zagea) {
            if (!zagea.ok) throw new Error("Model request failed: " + zagea.status);
            return zagea.arrayBuffer();
        });
        if (zagea instanceof Object3D) return new Promise(function(zageb, zagec) {
            (new GLTFExporter).parse(zagea, function(zagea) {
                zageb(zagea);
            }, zagec, {
                binary: true
            });
        });
        throw new Error("embedModel accepts a URL, ArrayBuffer, Uint8Array, or Object3D");
    }).then(function(zagea) {
        var zaged = faoxombase64text(zagea);
        var zagee = faoxommodelmodule(zagec, zaged, {
            byteLength: zagea.byteLength
        });
        if (zageb.register !== false) faoxomregistermodel(zagec, zagea);
        if (zageb.download && typeof document !== "undefined" && typeof Blob === "function" && typeof URL !== "undefined" && URL.createObjectURL) {
            var zagef = new Blob([ zagee.code ], {
                type: "text/javascript"
            });
            var zageg = document.createElement("a");
            zageg.href = URL.createObjectURL(zagef);
            zageg.download = zagec + ".model.js";
            document.body.appendChild(zageg);
            zageg.click();
            document.body.removeChild(zageg);
            URL.revokeObjectURL(zageg.href);
        }
        return {
            name: zagec,
            format: "glb",
            byteLength: zagea.byteLength,
            base64: zaged,
            code: zagee.code,
            html: zagee.html,
            register: function() {
                return faoxomregistermodel(zagec, zagea);
            }
        };
    });
};

FaoxomJs.mergeGeometries = function(zagea, zageb) {
    return Geometry.merge(zagea, zageb);
};

FaoxomJs.FrontSide = FrontSide;

FaoxomJs.BackSide = BackSide;

FaoxomJs.DoubleSide = DoubleSide;

FaoxomJs.RGBAFormat = RGBAFormat;

FaoxomJs.RGBA16FFormat = RGBA16FFormat;

FaoxomJs.RGBA16F = RGBA16FFormat;

FaoxomJs.RGBA = RGBAFormat;

FaoxomJs.UnsignedByteType = UnsignedByteType;

FaoxomJs.HalfFloatType = HalfFloatType;

FaoxomJs.HALF_FLOAT = HalfFloatType;

FaoxomJs.FloatType = FloatType;

FaoxomJs.NearestFilter = NearestFilter;

FaoxomJs.LinearFilter = LinearFilter;

FaoxomJs.DynamicDrawUsage = DynamicDrawUsage;

FaoxomJs.StaticDrawUsage = StaticDrawUsage;

FaoxomJs.LinearSRGBColorSpace = LinearSRGBColorSpace;

FaoxomJs.SRGBColorSpace = SRGBColorSpace;

FaoxomJs.ClampToEdgeWrapping = ClampToEdgeWrapping;

FaoxomJs.RepeatWrapping = RepeatWrapping;

FaoxomJs.MirroredRepeatWrapping = MirroredRepeatWrapping;

FaoxomJs.AdditiveBlending = AdditiveBlending;

FaoxomJs.NormalBlending = NormalBlending;

FaoxomJs.SubtractiveBlending = SubtractiveBlending;

FaoxomJs.MultiplyBlending = MultiplyBlending;

FaoxomJs.NoToneMapping = NoToneMapping;

FaoxomJs.LinearToneMapping = LinearToneMapping;

FaoxomJs.ReinhardToneMapping = ReinhardToneMapping;

FaoxomJs.CineonToneMapping = CineonToneMapping;

FaoxomJs.ACESFilmicToneMapping = ACESFilmicToneMapping;

FaoxomJs.AgXToneMapping = AgXToneMapping;

FaoxomJs.SVGLoader = SVGLoader;

FaoxomJs.Curve = Curve;

FaoxomJs.CatmullRomCurve3 = CatmullRomCurve3;

FaoxomJs.CubicBezierCurve3 = CubicBezierCurve3;

FaoxomJs.QuadraticBezierCurve3 = QuadraticBezierCurve3;

FaoxomJs.LineCurve3 = LineCurve3;

FaoxomJs.NURBSUtils = NURBSUtils;

FaoxomJs.NURBSCurve = NURBSCurve;

FaoxomJs.NURBSSurface = NURBSSurface;

FaoxomJs.Path = Path;

FaoxomJs.Shape = Shape;

FaoxomJs.ShapeGeometry = ShapeGeometry;

FaoxomJs.Path = Path;

FaoxomJs.ShapePath = ShapePath;

FaoxomJs.ShapeUtils = ShapeUtils;

FaoxomJs.CircleGeometry = CircleGeometry;

FaoxomJs.ExtrudeGeometry = ExtrudeGeometry;

FaoxomJs.LatheGeometry = LatheGeometry;

FaoxomJs.TubeGeometry = TubeGeometry;

FaoxomJs.ParametricGeometry = ParametricGeometry;

FaoxomJs.STLLoader = STLLoader;

FaoxomJs.PLYLoader = PLYLoader;

FaoxomJs.PCDLoader = PCDLoader;

FaoxomJs.VTKLoader = VTKLoader;

FaoxomJs.GCodeLoader = GCodeLoader;

FaoxomJs.MD2Loader = MD2Loader;

FaoxomJs.MDDLoader = MDDLoader;

FaoxomJs.RGBELoader = RGBELoader;

FaoxomJs.HDRLoader = RGBELoader;

FaoxomJs.TGALoader = TGALoader;

FaoxomJs.DDSLoader = DDSLoader;

FaoxomJs.EXRLoader = EXRLoader;

FaoxomJs.HDRCubeTextureLoader = HDRCubeTextureLoader;

FaoxomJs.OBJExporter = OBJExporter;

FaoxomJs.STLExporter = STLExporter;

FaoxomJs.PLYExporter = PLYExporter;

FaoxomJs.GLTFExporter = GLTFExporter;

FaoxomJs.CascadedShadowMap = CascadedShadowMap;

FaoxomJs.AtmosphericSky = AtmosphericSky;

FaoxomJs.StatsPanel = StatsPanel;

FaoxomJs.TransformControls = TransformControls;

FaoxomJs.CameraHelper = CameraHelper;

FaoxomJs.DirectionalLightHelper = DirectionalLightHelper;

FaoxomJs.PointLightHelper = PointLightHelper;

FaoxomJs.SkeletonHelper = SkeletonHelper;

FaoxomJs.OrbitControls = OrbitControls;

FaoxomJs.FirstPersonControls = FirstPersonControls;

FaoxomJs.PointerLockControls = PointerLockControls;

FaoxomJs.ArcballControls = ArcballControls;

FaoxomJs.MapControls = MapControls;

FaoxomJs.Font = Font;

FaoxomJs.FontLoader = FontLoader;

FaoxomJs.TextGeometry = TextGeometry;

FaoxomJs.MSDFText = MSDFText;

FaoxomJs.ShaderNode = ShaderNode;

FaoxomJs.FloatNode = FloatNode;

FaoxomJs.Vector2Node = Vector2Node;

FaoxomJs.Vector3Node = Vector3Node;

FaoxomJs.Vector4Node = Vector4Node;

FaoxomJs.ColorNode = ColorNode;

FaoxomJs.OperatorNode = OperatorNode;

FaoxomJs.MathNode = MathNode;

FaoxomJs.UVNode = UVNode;

FaoxomJs.NormalNode = NormalNode;

FaoxomJs.PositionNode = PositionNode;

FaoxomJs.CameraPositionNode = CameraPositionNode;

FaoxomJs.TimerNode = TimerNode;

FaoxomJs.FresnelNode = FresnelNode;

FaoxomJs.NoiseNode = NoiseNode;

FaoxomJs.TextureNode = TextureNode;

FaoxomJs.tsl = tsl;

FaoxomJs.NodeMaterial = NodeMaterial;

FaoxomJs.StandardNodeMaterial = StandardNodeMaterial;

FaoxomJs.BasicNodeMaterial = BasicNodeMaterial;

FaoxomJs.Data3DTexture = Data3DTexture;

FaoxomJs.VolumetricPass = VolumetricPass;

FaoxomJs.FaoxomReact = FaoxomReact;

FaoxomJs.createFaoxomRoot = FaoxomReact.createFaoxomRoot;

FaoxomJs.LightClusterGrid = LightClusterGrid;

FaoxomJs.ClusteredLightingManager = ClusteredLightingManager;

FaoxomJs.PhysicalMaterial = PhysicalMaterial;

FaoxomJs.SSSSProfile = SSSSProfile;

FaoxomJs.Pass = Pass;

FaoxomJs.RenderPass = RenderPass;

FaoxomJs.GTAOPass = GTAOPass;

FaoxomJs.HBAOPass = HBAOPass;

FaoxomJs.HiZBuffer = HiZBuffer;

FaoxomJs.ScreenSpaceReflectionsPass = ScreenSpaceReflectionsPass;

FaoxomJs.SSRPass = ScreenSpaceReflectionsPass;

FaoxomJs.SSGIPass = SSGIPass;

FaoxomJs.BokehDepthOfFieldPass = BokehDepthOfFieldPass;

FaoxomJs.ProgressiveBloomPass = ProgressiveBloomPass;

FaoxomJs.BloomPass = ProgressiveBloomPass;

FaoxomJs.TAAPass = TAAPass;

FaoxomJs.EffectComposer = EffectComposer;

FaoxomJs.GPUComputePass = GPUComputePass;

FaoxomJs.GPUCullingPipeline = GPUCullingPipeline;

FaoxomJs.GPUDrivenPipeline = GPUDrivenPipeline;

FaoxomJs.HiZOcclusion = HiZOcclusion;

FaoxomJs.GPURayQuery = GPURayQuery;

FaoxomJs.GPURTShadows = GPURTShadows;

FaoxomJs.GPURTReflections = GPURTReflections;

FaoxomJs.MeshletSet = MeshletSet;

FaoxomJs.FXOMVGS = FXOMVGS;

FaoxomJs.PCGRandom = PCGRandom;

FaoxomJs.PCGNoise = PCGNoise;

FaoxomJs.PCGTerrain = PCGTerrain;

FaoxomJs.PCGScatter = PCGScatter;

FaoxomJs.PCGDungeon = PCGDungeon;

FaoxomJs.PCGGrammar = PCGGrammar;

FaoxomJs.FaoxWriter = FaoxWriter;

FaoxomJs.FaoxPacker = FaoxPacker;

FaoxomJs.FaoxLoader = FaoxLoader;

FaoxomJs.FAOX_VERSION = FAOX_VERSION;

FaoxomJs.FloatingOrigin = FloatingOrigin;

FaoxomJs.GPUBroadphase = GPUBroadphase;

FaoxomJs.FixedSimulation = FixedSimulation;

FaoxomJs.MegaGeometry = MegaGeometry;

FaoxomJs.GPUMeshletCuller = GPUMeshletCuller;

FaoxomJs.ClusteredLighting = ClusteredLighting;

FaoxomJs.GPUIndirectDrawBuffer = GPUIndirectDrawBuffer;

FaoxomJs.GPUParticleComputeSystem = GPUParticleComputeSystem;

FaoxomJs.TSLBufferPacker = TSLBufferPacker;

FaoxomJs.BVHNode = BVHNode;

FaoxomJs.TriMeshBVH = TriMeshBVH;

FaoxomJs.GJK = GJK;

FaoxomJs.EPA = EPA;

FaoxomJs.ConvexHullCollider = ConvexHullCollider;

FaoxomJs.TriMeshCollider = TriMeshCollider;

FaoxomJs.CCDSolver = CCDSolver;

FaoxomJs.Constraint = Constraint;

FaoxomJs.DistanceJoint = DistanceJoint;

FaoxomJs.HingeJoint = HingeJoint;

FaoxomJs.BallAndSocketJoint = BallAndSocketJoint;

FaoxomJs.SliderJoint = SliderJoint;

FaoxomJs.SpringJoint = SpringJoint;

FaoxomJs.RagdollChain = RagdollChain;

FaoxomJs.ClothSimulation = ClothSimulation;

FaoxomJs.SoftBodySimulation = SoftBodySimulation;

FaoxomJs.SPHFluidSimulation = SPHFluidSimulation;

FaoxomJs.ContinuousLOD = ContinuousLOD;

FaoxomJs.MeshDecimator = MeshDecimator;

FaoxomJs.VirtualGeometryStreamer = VirtualGeometryStreamer;

FaoxomJs.AudioListener = AudioListener;

FaoxomJs.PositionalAudio = PositionalAudio;

FaoxomJs.AudioEnvironment = AudioEnvironment;

FaoxomJs.WebXRHandTracker = WebXRHandTracker;

FaoxomJs.WebXRPlaneDetector = WebXRPlaneDetector;

FaoxomJs.WebXRLightEstimator = WebXRLightEstimator;

FaoxomJs.WebXRHaptics = WebXRHaptics;

FaoxomJs.GaussianSplatMesh = FaoxomJs.GaussianSplatRenderer;

FaoxomJs.AtmospherePass = FaoxomJs.AtmosphereRenderer;

FaoxomJs.ComputePass = FaoxomJs.GPUComputePass;

FaoxomJs.VERSION = "v6";
