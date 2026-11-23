import FaoxomJs, {
  Vector2,
  Vector3,
  Vector4,
  Quaternion,
  Matrix3,
  Matrix4,
  Euler,
  Color,
  Ray,
  Plane,
  Box3,
  Sphere,
  Frustum,
  MathUtils,
  Scene,
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
  WebGLRenderer,
  WebGPURenderer,
  WebGLRenderTarget,
  Mesh,
  Group,
  Points,
  Line,
  LineSegments,
  InstancedMesh,
  SkinnedMesh,
  Bone,
  Skeleton,
  Raycaster,
  Clock,
  EventDispatcher,
  BufferGeometry,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  TorusKnotGeometry,
  IcosahedronGeometry,
  DodecahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  RingGeometry,
  ShapeGeometry,
  ExtrudeGeometry,
  TubeGeometry,
  LatheGeometry,
  CatmullRomCurve3,
  CubicBezierCurve3,
  QuadraticBezierCurve3,
  NURBSCurve,
  Shape,
  Path,
  ContinuousLOD,
  MeshDecimator,
  VirtualGeometryStreamer,
  Material,
  BasicMaterial,
  StandardMaterial,
  PhysicalMaterial,
  PhongMaterial,
  LambertMaterial,
  ToonMaterial,
  PointsMaterial,
  LineBasicMaterial,
  ShaderMaterial,
  NodeMaterial,
  StandardNodeMaterial,
  BasicNodeMaterial,
  ShaderNode,
  tsl,
  SSSSProfile,
  TSLBufferPacker,
  Light,
  DirectionalLight,
  PointLight,
  SpotLight,
  AmbientLight,
  HemisphereLight,
  RectAreaLight,
  CSM,
  CascadedShadowMap,
  LightClusterGrid,
  ClusteredLightingManager,
  AtmosphericSky,
  EffectComposer,
  Pass,
  RenderPass,
  GTAOPass,
  HBAOPass,
  ScreenSpaceReflectionsPass,
  SSRPass,
  SSGIPass,
  BokehDepthOfFieldPass,
  ProgressiveBloomPass,
  BloomPass,
  TAAPass,
  VolumetricPass,
  PhysicsWorld,
  RigidBody,
  BVHNode,
  TriMeshBVH,
  GJK,
  EPA,
  ConvexHullCollider,
  TriMeshCollider,
  CCDSolver,
  Constraint,
  DistanceJoint,
  HingeJoint,
  BallAndSocketJoint,
  SliderJoint,
  SpringJoint,
  RagdollChain,
  ClothSimulation,
  SoftBodySimulation,
  SPHFluidSimulation,
  GPUComputePass,
  GPUCullingPipeline,
  GPUIndirectDrawBuffer,
  GPUParticleComputeSystem,
  AssetLoader,
  GLTFLoader,
  GLTFExporter,
  OBJLoader,
  OBJExporter,
  STLLoader,
  STLExporter,
  PLYLoader,
  PLYExporter,
  SVGLoader,
  FBXLoader,
  KTX2Loader,
  TextureLoader,
  FileLoader,
  LoadingManager,
  AudioListener,
  PositionalAudio,
  AudioEnvironment,
  WebXRHandTracker,
  WebXRPlaneDetector,
  WebXRLightEstimator,
  WebXRHaptics,
  FaoxomReact,
  createFaoxomRoot,
  OrbitControls,
  MapControls,
  FirstPersonControls,
  PointerLockControls,
  TransformControls,
  StatsPanel,
  CameraHelper,
  DirectionalLightHelper,
  PointLightHelper,
  BoxHelper,
  TaskPool,
  OffscreenEngine,
  WebXRAR,
  FaoxomSceneElement
} from "../FaoxomJs.js";

// Math testing
const v2 = new Vector2(1, 2);
const v3 = new Vector3(1, 2, 3);
const v4 = new Vector4(1, 2, 3, 4);
const quat = new Quaternion();
const m3 = new Matrix3();
const m4 = new Matrix4();
const euler = new Euler(0, Math.PI, 0);
const col = new Color(0xff5500);
const ray = new Ray(v3, new Vector3(0, 0, -1));
const plane = new Plane(new Vector3(0, 1, 0), 0);
const box = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1));
const sphere = new Sphere(v3, 2.5);
const frustum = new Frustum();
const uuid = MathUtils.generateUUID();

// Core objects & hierarchy
const scene = new Scene();
const camera = new PerspectiveCamera(45, 16 / 9, 0.1, 1000);
const orthoCamera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
const group = new Group();
const clock = new Clock();
const raycaster = new Raycaster();

// Geometries & Curves
const boxGeo = new BoxGeometry(1, 1, 1);
const sphereGeo = new SphereGeometry(1, 32, 16);
const planeGeo = new PlaneGeometry(10, 10);
const cylGeo = new CylinderGeometry(1, 1, 2);
const coneGeo = new ConeGeometry(1, 2);
const torusGeo = new TorusGeometry(2, 0.5);
const torusKnotGeo = new TorusKnotGeometry(2, 0.5);
const icosGeo = new IcosahedronGeometry(1);
const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(1, 2, 0), new Vector3(2, 0, 0)]);
const tubeGeo = new TubeGeometry(curve, 20, 0.2, 8, false);
const shape = new Shape();
shape.moveTo(0, 0).lineTo(1, 0).lineTo(1, 1).closePath();
const shapeGeo = new ShapeGeometry(shape);
const extrudeGeo = new ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true });

// Materials & TSL
const basicMat = new BasicMaterial({ color: col });
const stdMat = new StandardMaterial({ roughness: 0.5, metalness: 0.5 });
const physMat = new PhysicalMaterial({
  clearcoat: 0.8,
  transmission: 0.9,
  ior: 1.5,
  sheen: 0.5,
  iridescence: 0.3,
  dispersion: 0.05
});
const nodeMat = new StandardNodeMaterial({ color: 0x00ff00 });
const basicNodeMat = new BasicNodeMaterial({ color: 0xffffff });
void basicNodeMat;
const ssssProfile = new SSSSProfile({ blurRadius: 0.04, maxSubsurfaceRadius: 0.1 });
const std140 = TSLBufferPacker.packStd140([
  { name: "projection", type: "mat4", value: new Float32Array(16) }
]);

// Meshes
const mesh = new Mesh(boxGeo, physMat);
const instancedMesh = new InstancedMesh(sphereGeo, stdMat, 50);
const line = new Line(boxGeo, new LineBasicMaterial({ color: 0xffffff }));
const points = new Points(sphereGeo, new PointsMaterial({ size: 2 }));
scene.add(mesh, instancedMesh, line, points, group);

// Lights & Shadows
const dirLight = new DirectionalLight(0xffffff, 1.5);
const ptLight = new PointLight(0xff8800, 2.0, 10);
const spotLight = new SpotLight(0xffffff, 5.0, 20, Math.PI / 4);
const ambLight = new AmbientLight(0x222222);
const hemiLight = new HemisphereLight(0x88ccff, 0x442211, 0.6);
const rectLight = new RectAreaLight(0xffffff, 5, 2, 2);
const csm = new CSM({ camera, parent: scene, cascades: 3 });
const sky = new AtmosphericSky();
const clusterGrid = new LightClusterGrid();
const clusterManager = new ClusteredLightingManager(clusterGrid);
scene.add(dirLight, ptLight, spotLight, ambLight, hemiLight, rectLight, sky);

// Physics & Collision
const world = new PhysicsWorld({ gravity: new Vector3(0, -9.81, 0) });
const bodyA = new RigidBody({ mass: 1, position: new Vector3(0, 5, 0), collider: new ConvexHullCollider(boxGeo) });
const bodyB = new RigidBody({ mass: 0, position: new Vector3(0, 0, 0), type: "static" });
const joint = new DistanceJoint(bodyA, bodyB, 5);
const hinge = new HingeJoint(bodyA, bodyB, new Vector3(0, 1, 0));
const ragdoll = new RagdollChain();
ragdoll.addBody(bodyA);
ragdoll.addJoint(joint);
world.addBody(bodyA);
world.addBody(bodyB);
world.addConstraint(joint);
world.addConstraint(hinge);
world.step(1 / 60);

const cloth = new ClothSimulation(4, 4, 10, 10);
cloth.step(1 / 60);
const fluid = new SPHFluidSimulation(500);
fluid.addParticle(0, 1, 0);
fluid.step(1 / 60);

// Rendering & Post-Processing
const canvas = document.createElement("canvas");
const renderer = new WebGLRenderer({ canvas, antialias: true });
const target = new WebGLRenderTarget(800, 600, { format: "rgba16f" });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new GTAOPass(scene, camera));
composer.addPass(new HBAOPass(scene, camera));
composer.addPass(new ScreenSpaceReflectionsPass(scene, camera));
composer.addPass(new SSGIPass(scene, camera));
composer.addPass(new BokehDepthOfFieldPass(scene, camera));
composer.addPass(new ProgressiveBloomPass());
composer.addPass(new TAAPass(scene, camera));
composer.addPass(new VolumetricPass(scene, camera));
composer.setSize(800, 600);

// LOD & Decimation
const lod = new ContinuousLOD();
const decimatedGeo = MeshDecimator.decimate(sphereGeo, 0.5);
lod.addLevel(sphereGeo, 0);
lod.addLevel(decimatedGeo, 20);
const streamer = new VirtualGeometryStreamer();

// Loaders & Exporters
const gltfLoader = new GLTFLoader();
const gltfExporter = new GLTFExporter();
const objLoader = new OBJLoader();
const objExporter = new OBJExporter();
const stlLoader = new STLLoader();
const stlExporter = new STLExporter();
const plyLoader = new PLYLoader();
const fbxLoader = new FBXLoader();
const ktx2Loader = new KTX2Loader();

// Spatial Audio
const listener = new AudioListener();
const positionalAudio = new PositionalAudio(listener);
const audioEnv = new AudioEnvironment(listener);

// WebXR & Compute
const handTracker = new WebXRHandTracker(renderer);
const planeDetector = new WebXRPlaneDetector();
const lightEstimator = new WebXRLightEstimator(renderer, scene);
const drawBuffer = new GPUIndirectDrawBuffer(null, 64);

// Controls & Helpers
const orbit = new OrbitControls(camera, canvas);
const map = new MapControls(camera, canvas);
const fp = new FirstPersonControls(camera, canvas);
const pl = new PointerLockControls(camera, canvas);
const transform = new TransformControls(camera, canvas);
const stats = new StatsPanel();
const camHelper = new CameraHelper(camera);
const lightHelper = new DirectionalLightHelper(dirLight);
const ptLightHelper = new PointLightHelper(ptLight);
const boxHelper = new BoxHelper(mesh);

// Workers, Task Graph & XR-AR (S30)
const taskPool = new TaskPool({ workers: 2, engineUrl: "./dist/faoxom.js" });
const sabSupported: boolean = TaskPool.supportsSharedArrayBuffer;
const poolPromise: Promise<Record<string, unknown>> = taskPool.submit({
    nodes: [
        { id: "a", task: "ping", payload: {} },
        { id: "b", task: "hash-buffer", payload: { bytes: new Uint8Array(4) }, deps: ["a"] }
    ],
    onNode: (id: string, result: any, progress: number) => void (id + String(progress))
});
const offscreenEngine = new OffscreenEngine({ canvas: canvas, workerUrl: "./src/extras/faoxom-worker.js", width: 128, height: 128 });
const xrAr = new WebXRAR({ hitTest: true, anchors: true });
const arSessionPromise: Promise<any> = xrAr.supportsSession("immersive-ar");

// Custom element
const sceneElement = document.createElement("faoxom-scene") as FaoxomSceneElement;
const elementApp: any = sceneElement.getApp();
const elementScene: any = sceneElement.getScene();
const elementCamera: any = sceneElement.getCamera();
const elementControls: any = sceneElement.getControls();
const elementLoaded: boolean = sceneElement.isLoaded();
const observedAttributes: string[] = FaoxomSceneElement.observedAttributes;

// React root
const reactRoot = createFaoxomRoot(canvas);

console.log("Full typecheck suite executed successfully without errors!");
