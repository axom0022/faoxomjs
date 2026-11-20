import fs from "node:fs";

import path from "node:path";

import ts from "typescript";

const zavta = process.cwd();

const zavtb = fs.readFileSync(path.join(zavta, "tools", ".faoxomoriginal.js"), "utf8");

const zavtc = ts.createSourceFile("FaoxomJs.js", zavtb, ts.ScriptTarget.ES2022, true);

const zavtd = [ "animation", "audio", "camera", "core", "extras", "geometries", "helpers", "lights", "loaders", "materials", "math", "nodes", "objects", "renderers", "scenes", "textures" ];

const zavte = {
    math: [ "Vector2", "Vector3", "Vector4", "Matrix3", "Matrix4", "Quaternion", "Euler", "Color", "Box3", "Sphere", "Plane", "Ray", "Segment3", "Tri3", "MathUtils", "Curve", "LineCurve3", "CatmullRomCurve3", "CubicBezierCurve3", "QuadraticBezierCurve3", "NURBSCurve", "NURBSSurface", "NURBSUtils", "Path", "Shape", "ShapePath", "ShapeUtils" ],
    core: [ "EventDispatcher", "Object3D", "Node", "Clock", "Raycaster", "BufferAttribute", "Float32BufferAttribute", "InstancedBufferAttribute", "BufferGeometry", "Fog", "FogExp2" ],
    objects: [ "Mesh", "Group", "Line", "LineLoop", "LineSegments", "Points", "Sprite", "SkinnedMesh", "Bone", "Skeleton", "InstancedMesh", "MeshPool", "ObjectPool", "LOD", "WideLine", "ClipVolume", "ClipVolumeArray", "ParticleSystem" ],
    scenes: [ "Scene" ],
    camera: [ "PerspectiveCamera", "OrthographicCamera", "Camera", "OrbitControls", "MapControls", "FirstPersonControls", "PointerLockControls", "ArcballControls", "TransformControls", "InputManager" ],
    lights: [ "Light", "AmbientLight", "DirectionalLight", "HemisphereLight", "PointLight", "SpotLight", "RectAreaLight", "LightClusterGrid", "ClusteredLightingManager" ],
    helpers: [ "CameraHelper", "DirectionalLightHelper", "PointLightHelper", "SkeletonHelper", "StatsPanel" ],
    loaders: [ "FileLoader", "LoadingManager", "AssetLoader", "registerModel", "embedModel", "listEmbeddedModels", "removeEmbeddedModel", "createBlenderFidelityProfile", "BlenderFidelityProfile", "ModelBuilder", "SceneExporter", "Font", "MSDFText" ],
    textures: [ "Texture", "TextureStreamer", "TextureFormatSelector", "PMREMGenerator", "PREMEnv" ],
    renderers: [ "WebGLRenderTarget", "GBufferTarget", "OcclusionCuller", "GPUCullingPipeline", "GPUIndirectDrawBuffer", "SunBeam", "GPUCompute", "GPUComputePass", "WebGPUCompute", "RenderTarget", "CascadedShadowMap", "RenderLayers" ],
    nodes: [ "tsl", "TSLBufferPacker", "ShaderNode", "NodeMaterial" ],
    animation: [ "BlendTree", "MotionMatcher", "RootMotionExtractor", "FacialAnimation", "TwoBoneIKSolver" ],
    extras: [ "PhysicsWorld", "RigidBody", "CharacterController", "CCDSolver", "GJK", "EPA", "DestructionBody", "HeightfieldShape", "CollisionShape", "CompoundCollisionShape", "ConvexCollisionShape", "ConvexHullCollider", "CylinderCollisionShape", "MeshCollisionShape", "TriMeshBVH", "TriMeshCollider", "BVHNode", "Ragdoll", "RagdollChain", "Vehicle", "VehicleWheel", "Navmesh", "NavmeshManager", "Pathfinder", "SoftBody", "SoftBodySimulation", "Cloth", "ClothSimulation", "SPHFluidSimulation", "Fluid", "Rope", "AtmosphericSky", "Decal", "ReflectionProbe", "ReflectionProbeEnvironment", "Terrain", "TerrainManager", "FaoxomReact", "createFaoxomRoot", "GPUParticleComputeSystem", "WorldStreamer", "JointLimit" ],
    geometries: [ "Geometry", "GeometryFactory", "mergeGeometries", "simplifyGeometry", "MeshDecimator", "ContinuousLOD", "VirtualGeometryStreamer", "EdgeOutlineGeometry" ],
    audio: [ "AudioListener", "AudioEnvironment", "PositionalAudio" ],
    materials: [ "SSSSProfile" ]
};

const zavtf = {};

for (const zavta of Object.keys(zavte)) for (const zavtb of zavte[zavta]) zavtf[zavtb] = zavta;

function zavtg(zavta) {
    if (zavtf[zavta]) return zavtf[zavta];
    if (/^faoxom/.test(zavta)) return "core";
    if (/(Format|Type|Filter|Wrapping|Blending|ToneMapping|ColorSpace|DrawUsage|Side)$/.test(zavta)) return "core";
    if (/NodeMaterial$/.test(zavta)) return "nodes";
    if (/(Loader|Exporter)$/.test(zavta)) return "loaders";
    if (/Material$/.test(zavta)) return "materials";
    if (/Geometry$/.test(zavta)) return "geometries";
    if (/Helper$/.test(zavta)) return "helpers";
    if (/Light$/.test(zavta)) return "lights";
    if (/Node$/.test(zavta)) return "nodes";
    if (/(Pass|Composer)$/.test(zavta)) return "renderers";
    if (/Camera$/.test(zavta)) return "camera";
    if (/Controls$/.test(zavta)) return "camera";
    if (/Texture/.test(zavta)) return "textures";
    if (/^Animation/.test(zavta)) return "animation";
    if (/^Audio/.test(zavta)) return "audio";
    if (/Joint$/.test(zavta) || /Constraint$/.test(zavta)) return "extras";
    if (/^WebXR/.test(zavta)) return "extras";
    if (/^Web(GL|GPU)/.test(zavta)) return "renderers";
    if (/^PMREM/.test(zavta)) return "textures";
    if (/^Scene/.test(zavta)) return "scenes";
    if (/^Terrain/.test(zavta)) return "extras";
    return "core";
}

function zavth(zavta) {
    const zavtb = zavta.parent;
    if (!zavtb) return false;
    if (ts.isPropertyAccessExpression(zavtb) && zavtb.name === zavta) return true;
    if (ts.isPropertyAssignment(zavtb) && zavtb.name === zavta) return true;
    if (ts.isMethodDeclaration(zavtb) && zavtb.name === zavta) return true;
    if (ts.isPropertyDeclaration(zavtb) && zavtb.name === zavta) return true;
    if (ts.isVariableDeclaration(zavtb) && zavtb.name === zavta) return true;
    if ((ts.isFunctionDeclaration(zavtb) || ts.isClassDeclaration(zavtb)) && zavtb.name === zavta) return true;
    if (ts.isBindingElement(zavtb) && zavtb.name === zavta) return true;
    return false;
}

function zavti(zavta, zavtb) {
    if (ts.isIdentifier(zavta)) {
        if (!zavth(zavta)) zavtb.add(zavta.text);
        return;
    }
    ts.forEachChild(zavta, zavta => zavti(zavta, zavtb));
}

function zavtj(zavta, zavtb) {
    if (ts.isIdentifier(zavta)) {
        if (!zavth(zavta)) zavtb.add(zavta.text);
        return;
    }
    if (ts.isFunctionDeclaration(zavta) || ts.isFunctionExpression(zavta) || ts.isArrowFunction(zavta)) return;
    if (ts.isMethodDeclaration(zavta) || ts.isGetAccessorDeclaration(zavta) || ts.isSetAccessorDeclaration(zavta) || ts.isConstructorDeclaration(zavta)) return;
    if (ts.isPropertyDeclaration(zavta) && !(zavta.modifiers && zavta.modifiers.some(zavta => zavta.kind === ts.SyntaxKind.StaticKeyword))) return;
    if (ts.isClassDeclaration(zavta)) {
        for (const zavtb of zavta.herenceClauses || []) {}
        for (const zavtc of zavta.heritageClauses || []) zavtj(zavtc, zavtb);
        for (const zavtc of zavta.members) {
            if (zavtc.modifiers && zavtc.modifiers.some(zavta => zavta.kind === ts.SyntaxKind.StaticKeyword)) zavtj(zavtc, zavtb);
        }
        return;
    }
    ts.forEachChild(zavta, zavta => zavtj(zavta, zavtb));
}

const zavtk = [];

const zavtl = {};

const zavtm = [];

const zavtn = [];

for (const zavta of zavtc.statements) {
    if (ts.isVariableStatement(zavta)) {
        for (const zavtb of zavta.declarationList.declarations) {
            if (ts.isIdentifier(zavtb.name)) zavtn.push(zavtb.name.text); else for (const zavta of zavtb.name.elements) if (ts.isIdentifier(zavta.name)) zavtn.push(zavta.name.text);
        }
    } else if ((ts.isFunctionDeclaration(zavta) || ts.isClassDeclaration(zavta)) && zavta.name) zavtn.push(zavta.name.text);
}

const zavto = {};

const zavtp = {};

for (const zavta of zavtn) zavtp[zavta] = true;

for (const zavta of zavtn) {
    if (!/^[a-z]/.test(zavta) || !/[A-Z]/.test(zavta)) continue;
    let zavtb = zavta.toLowerCase();
    if (zavtp[zavtb] && zavtp[zavtb] !== zavta) zavtb = zavtb + "alt";
    while (zavtp[zavtb] && zavtp[zavtb] !== zavta) zavtb = zavtb + "x";
    zavtp[zavtb] = zavta;
    zavto[zavta] = zavtb;
}

function zavtq(zavta) {
    const zavtb = zavta.parent;
    if (!zavtb) return false;
    if (ts.isPropertyAccessExpression(zavtb) && zavtb.name === zavta) return true;
    if (ts.isQualifiedName(zavtb) && zavtb.name === zavta) return true;
    if ((ts.isPropertyAssignment(zavtb) || ts.isPropertySignature(zavtb) || ts.isEnumMember(zavtb)) && zavtb.name === zavta) return true;
    if (ts.isShorthandPropertyAssignment(zavtb)) throw new Error("shorthand property with renamed name: " + zavta.text);
    if (ts.isBindingElement(zavtb) && zavtb.name === zavta && !zavtb.propertyName) throw new Error("shorthand binding element with renamed name: " + zavta.text);
    return false;
}

function zavtr(zavta) {
    const zavtd = [];
    function zavte(zavta) {
        if (ts.isIdentifier(zavta)) {
            if (zavto[zavta.text] && !zavtq(zavta)) zavtd.push([ zavta.getStart(zavtc), zavta.getEnd(), zavta.text ]);
            return;
        }
        ts.forEachChild(zavta, zavte);
    }
    zavte(zavta);
    if (!zavtd.length) return null;
    zavtd.sort((zavta, zavtb) => zavta[0] - zavtb[0]);
    let zavtf = "";
    let zavtg = zavta.getStart(zavtc);
    for (const zavta of zavtd) {
        zavtf += zavtb.slice(zavtg, zavta[0]) + zavto[zavta[2]];
        zavtg = zavta[1];
    }
    zavtf += zavtb.slice(zavtg, zavta.getEnd());
    return zavtf;
}

for (const zavta of zavtc.statements) {
    let zavtd = zavtb.slice(zavta.getStart(zavtc), zavta.getEnd());
    if (ts.isExportAssignment(zavta)) continue;
    const zavte = zavtr(zavta);
    if (zavte !== null) zavtd = zavte;
    const zavtf = [];
    if (ts.isVariableStatement(zavta)) {
        for (const zavtb of zavta.declarationList.declarations) {
            if (ts.isIdentifier(zavtb.name)) zavtf.push(zavtb.name.text); else for (const zavta of zavtb.name.elements) if (ts.isIdentifier(zavta.name)) zavtf.push(zavta.name.text);
        }
    } else if ((ts.isFunctionDeclaration(zavta) || ts.isClassDeclaration(zavta)) && zavta.name) {
        zavtf.push(zavta.name.text);
    } else if (ts.isExpressionStatement(zavta)) {
        const zavtb = zavtd.trim();
        const zavtc = new Set;
        zavti(zavta, zavtc);
        const zavte = new Set;
        zavtj(zavta, zavte);
        if (zavtb.startsWith("FaoxomJs.prototype.")) zavtk.push({
            folder: "__facade",
            text: zavtd,
            refs: [ ...zavtc ].map(zavta => zavto[zavta] || zavta),
            evalrefs: [ ...zavte ].map(zavta => zavto[zavta] || zavta)
        }); else if (zavtb.startsWith("FaoxomJs.")) zavtk.push({
            folder: "__namespace",
            text: zavtd,
            refs: [ ...zavtc ].map(zavta => zavto[zavta] || zavta),
            evalrefs: [ ...zavte ].map(zavta => zavto[zavta] || zavta)
        }); else zavtk.push({
            folder: "__sideeffect",
            text: zavtd,
            refs: [ ...zavtc ].map(zavta => zavto[zavta] || zavta),
            evalrefs: [ ...zavte ].map(zavta => zavto[zavta] || zavta)
        });
        continue;
    } else {
        const zavtb = new Set;
        zavti(zavta, zavtb);
        const zavtc = new Set;
        zavtj(zavta, zavtc);
        zavtk.push({
            folder: "__sideeffect",
            text: zavtd,
            refs: [ ...zavtb ].map(zavta => zavto[zavta] || zavta),
            evalrefs: [ ...zavtc ].map(zavta => zavto[zavta] || zavta)
        });
        continue;
    }
    let zavth = zavtg(zavtf[0]);
    if (zavtf[0] === "FaoxomJs") zavth = "__facade";
    for (const zavta of zavtf) zavtl[zavta] = zavth;
    zavtm.push(...zavtf);
    const zavtn = new Set;
    zavti(zavta, zavtn);
    const zavtp = new Set;
    zavtj(zavta, zavtp);
    zavtk.push({
        folder: zavth,
        text: zavtd,
        names: zavtf.map(zavta => zavto[zavta] || zavta),
        refs: [ ...zavtn ].map(zavta => zavto[zavta] || zavta),
        evalrefs: [ ...zavtp ].map(zavta => zavto[zavta] || zavta)
    });
}

const zavts = {
    math: 0,
    core: 1,
    geometries: 2,
    materials: 3,
    textures: 4,
    objects: 5,
    lights: 6,
    camera: 7,
    animation: 8,
    audio: 9,
    helpers: 10,
    nodes: 11,
    renderers: 12,
    extras: 13,
    loaders: 14,
    __facade: 15,
    __namespace: 16
};

function zavtt(zavta) {
    return zavtd.indexOf(zavta) !== -1;
}

const zavtu = {
    faoxomid: "faoxomstate.faoxomidx",
    faoxomdefaultrenderer: "faoxomstate.faoxomdefaultrenderer",
    faoxommodelstoreversion: "faoxomstate.faoxommodelstoreversion"
};

const zavtv = Object.keys(zavtu);

for (const zavta of zavtk) {
    const zavtb = zavta.text.trim();
    if (zavtb === "var faoxomid = 1;") {
        zavta.text = "var faoxomstate = { faoxomidx: 1, faoxomdefaultrenderer: null, faoxommodelstoreversion: 0 };";
        zavta.names = [ "faoxomstate" ];
        continue;
    }
    if (zavtb === "var faoxomdefaultrenderer = null;" || zavtb === "var faoxommodelstoreversion = 0;") {
        zavta.text = "";
        zavta.names = [];
        continue;
    }
    if (zavtv.some(zavtb => new RegExp("(?<![.\\w$])" + zavtb + "\\b").test(zavta.text))) {
        for (const zavtb of zavtv) zavta.text = zavta.text.replace(new RegExp("(?<![.\\w$])" + zavtb + "\\b", "g"), zavtu[zavtb]);
        if (zavta.refs) zavta.refs = zavta.refs.map(zavta => zavta === "faoxomid" || zavta === "faoxomdefaultrenderer" || zavta === "faoxommodelstoreversion" ? "faoxomstate" : zavta);
        if (zavta.evalrefs) zavta.evalrefs = zavta.evalrefs.map(zavta => zavtv.indexOf(zavta) !== -1 ? "faoxomstate" : zavta);
    }
}

const zavtw = [ [ "obj instanceof Mesh && obj.setMaterialVariant", "obj.isMesh && obj.setMaterialVariant", 1, "Mesh" ], [ "obj instanceof Mesh && obj.getAvailableMaterialVariants", "obj.isMesh && obj.getAvailableMaterialVariants", 1, "Mesh" ], [ "this instanceof Camera) this.quaternion", "this.isCamera) this.quaternion", 1, "Camera" ], [ "camera.isPerspectiveCamera || camera instanceof PerspectiveCamera", "camera.isPerspectiveCamera", 1, "PerspectiveCamera" ] ];

for (const zavta of zavtw) {
    let zavtb = 0;
    for (const zavtc of zavtk) {
        const zavtd = zavtc.text.split(zavta[0]);
        if (zavtd.length > 1) {
            zavtb += zavtd.length - 1;
            zavtc.text = zavtd.join(zavta[1]);
            if (!new RegExp("(?<![.\\w$\\\"'])" + zavta[3] + "\\b").test(zavtc.text)) {
                if (zavtc.refs) zavtc.refs = zavtc.refs.filter(zavtb => zavtb !== zavta[3]);
                if (zavtc.evalrefs) zavtc.evalrefs = zavtc.evalrefs.filter(zavtb => zavtb !== zavta[3]);
            }
        }
    }
    if (zavtb !== zavta[2]) throw new Error("duckrewrite count mismatch: '" + zavta[0] + "' expected " + zavta[2] + " got " + zavtb);
}

for (const zavta of zavtk) {
    if (zavtt(zavta.folder) && zavta.refs && zavta.refs.indexOf("FaoxomJs") !== -1) zavta.folder = "__facade";
}

const zavtx = {
    expected: 1,
    found: 0
};

for (const zavta of zavtk) {
    if (zavta.text.split('FaoxomJs.VERSION = "v5"').length > 1) {
        zavtx.found += zavta.text.split('FaoxomJs.VERSION = "v5"').length - 1;
        zavta.text = zavta.text.split('FaoxomJs.VERSION = "v5"').join('FaoxomJs.VERSION = "v6"');
    }
}

if (zavtx.found !== zavtx.expected) throw new Error("version transform expected 1 got " + zavtx.found);

const zavty = {
    faoxomcollisioncontact: "extras",
    faoxomdecodegcode: "loaders",
    faoxomdecodepcd: "loaders",
    faoxomfrustumvisible: "helpers",
    faoxomsimplifygeometry: "objects",
    LineLoop: "objects",
    LineSegments: "objects",
    ContinuousLOD: "extras",
    faoxomtrianglebody: "extras",
    faoxommeshcontact: "extras",
    faoxomgeometry: "geometries",
    faoxomfbxgeometry: "loaders",
    faoxomdecodeply: "loaders",
    faoxomdecodevtk: "loaders",
    faoxomdecodemd2: "loaders",
    faoxomdecodemdd: "loaders",
    faoxommd2animations: "loaders",
    faoxomsvgbuildgradienttexture: "textures",
    RenderLayers: "core",
    DecalGeometry: "objects",
    FaoxomReact: "extras"
};

for (const zavta of zavtk) {
    if (zavta.names && zavta.names.length === 1 && zavty[zavta.names[0]]) zavta.folder = zavty[zavta.names[0]];
}

const zavtz = [ "faoxomcatmullrompoint", "faoxomclamp", "faoxomearcut", "faoxomellipsecurvepoint", "faoxomhuetorgb", "faoxomsrgbtolinear", "faoxomsrgbtolinearalt", "faoxomvalue", "faoxomcolorkeywords" ];

function zavtaa(zavta) {
    return zavtz.indexOf(zavta) !== -1 || /^faoxomearcut/.test(zavta);
}

for (const zavta of zavtk) {
    if (zavta.names && zavta.names.length === 1 && zavtaa(zavta.names[0])) zavta.folder = "math";
}

function zavtab() {
    const zavta = {};
    for (const zavtb of zavtk) if (zavtb.names) for (const zavtc of zavtb.names) zavta[zavtc] = zavtb.folder;
    return zavta;
}

const zavtac = [];

let zavtad = 0;

function zavtae(zavta, zavtb) {
    const zavtc = zavtb.split("/");
    zavtc.shift();
    let zavtd;
    let zavte;
    if (zavta === "index" || zavta === "tsl") {
        zavtd = zavtc[0];
        zavte = zavtc[1];
    } else if (zavta === "@facade" || zavta === "@namespace") {
        if (zavtc.length === 1) {
            zavtd = "core";
            zavte = zavtc[0];
        } else {
            zavtd = zavtc[0];
            zavte = zavtc[1];
        }
    } else {
        if (zavtc.length === 1) {
            zavtd = zavta.split("/")[0];
            zavte = zavtc[0];
        } else {
            zavtd = zavtc[0];
            zavte = zavtc[1];
        }
    }
    if (zavte === "facade.js") return "@facade";
    if (zavte === "namespace.js") return "@namespace";
    if (zavte === "index.js") return zavtd + "/@index";
    return zavtd + "/" + zavte;
}

function zavtaf() {
    const zavtb = path.join(zavta, "src");
    const zavtc = {
        index: path.join(zavtb, "index.js"),
        tsl: path.join(zavtb, "tsl.js"),
        "@facade": path.join(zavtb, "core", "facade.js"),
        "@namespace": path.join(zavtb, "core", "namespace.js")
    };
    for (const zavtm of zavtd) {
        const zavtn = path.join(zavtb, zavtm);
        let zavto = [];
        try {
            zavto = fs.readdirSync(zavtn);
        } catch (zavtp) {}
        for (const zavtq of zavto) if (zavtq.endsWith(".js")) zavtc[zavtq === "index.js" ? zavtm + "/@index" : zavtm + "/" + zavtq] = path.join(zavtn, zavtq);
    }
    const zavte = {};
    const zavtf = /from\s*"([^"]+)"/g;
    for (const zavtr of Object.keys(zavtc)) {
        const zavts = fs.readFileSync(zavtc[zavtr], "utf-8");
        const zavtt = [];
        let zavtu;
        zavtf.lastIndex = 0;
        while (zavtu = zavtf.exec(zavts)) zavtt.push(zavtae(zavtr, zavtu[1]));
        zavte[zavtr] = zavtt;
    }
    const zavtg = {};
    for (const zavtv of zavtk) if (zavtv.names) for (const zavtw of zavtv.names) zavtg[zavtw] = zavtv;
    function zavth(zavta) {
        if (zavta.folder === "__facade") return "@facade";
        if (zavta.folder === "__namespace") return "@namespace";
        return zavta.file;
    }
    const zavti = new Set;
    const zavtj = [];
    const zavtl = [ "index", "tsl" ];
    for (const zavtx of Object.keys(zavtc)) if (zavtx.indexOf("/") !== -1 || zavtx === "@facade" || zavtx === "@namespace") zavtl.push(zavtx);
    for (const zavty of zavtl) {
        const zavtz = {};
        const zavtaa = {};
        let zavtab = 0;
        function zavtac(zavta) {
            if (zavtz[zavta] !== undefined || zavtaa[zavta]) return;
            zavtaa[zavta] = true;
            const zavtb = zavte[zavta] || [];
            for (let zavta = 0; zavta < zavtb.length; zavta++) zavtac(zavtb[zavta]);
            zavtaa[zavta] = false;
            zavtz[zavta] = zavtab++;
        }
        zavtac(zavty);
        for (const zavtad of zavtk) {
            const zavtaf = zavth(zavtad);
            if (!zavtaf || zavtz[zavtaf] === undefined) continue;
            for (const zavtah of zavtad.evalrefs || []) {
                if (zavtad.names && zavtad.names.indexOf(zavtah) !== -1) continue;
                const zavtai = zavtg[zavtah];
                if (!zavtai) continue;
                const zavtak = zavth(zavtai);
                if (!zavtak) continue;
                if (zavtak === zavtaf) {
                    if (zavtad.fileorder !== undefined && zavtai.fileorder !== undefined && zavtai.fileorder > zavtad.fileorder) {
                        const zavtal = "intra:" + zavtaf + ":" + zavtah + ":" + zavtad.fileorder;
                        if (!zavti.has(zavtal)) {
                            zavti.add(zavtal);
                            zavtj.push({
                                stmt: zavtad,
                                target: null,
                                intra: zavtah
                            });
                        }
                    }
                } else {
                    if (zavtz[zavtak] === undefined || zavtz[zavtak] > zavtz[zavtaf]) {
                        const zavtam = zavtag(zavtad) + ":" + zavtak;
                        if (!zavti.has(zavtam)) {
                            zavti.add(zavtam);
                            zavtj.push({
                                stmt: zavtad,
                                target: zavtaj[zavtah] || zavtai.folder
                            });
                        }
                    }
                }
            }
        }
    }
    return zavtj;
}

function zavtag(zavta) {
    return zavta.names ? zavta.names[0] : "sideeffect" + zavtk.indexOf(zavta);
}

function zavtah() {
    const zavta = {};
    const zavtb = zavtab();
    for (const zavtc of zavtk) {
        if (!zavta[zavtc.folder]) zavta[zavtc.folder] = new Set;
        for (const zavtd of zavtc.refs || []) {
            const zavte = zavtb[zavtd];
            if (zavte && zavte !== zavtc.folder) zavta[zavtc.folder].add(zavte);
        }
    }
    const zavtc = {};
    const zavtd = [];
    const zavte = [];
    function zavtf(zavtb) {
        if (zavtc[zavtb] === 2) return;
        if (zavtc[zavtb] === 1) {
            zavte.push(zavtd.slice(zavtd.indexOf(zavtb)).concat(zavtb).join(" -> "));
            return;
        }
        zavtc[zavtb] = 1;
        zavtd.push(zavtb);
        for (const zavtc of zavta[zavtb] || []) zavtf(zavtc);
        zavtd.pop();
        zavtc[zavtb] = 2;
    }
    for (const zavtb of Object.keys(zavta)) zavtf(zavtb);
    return zavte;
}

const zavtai = zavtah();

for (const zavta of zavtk) {
    if (zavta.folder === "__sideeffect") {
        if ((zavta.refs || []).indexOf("FaoxomJs") !== -1) {
            zavta.folder = "__facade";
            continue;
        }
        if (zavta.text.startsWith("Geometry.prototype.simplify")) {
            zavta.folder = "objects";
            continue;
        }
        let zavtb = "core";
        for (const zavtc of zavta.refs || []) {
            const zavta = zavtl[zavtc];
            if (zavta && zavta !== "__facade" && zavta !== "__namespace" && zavta !== "__sideeffect") {
                zavtb = zavta;
                break;
            }
        }
        zavta.folder = zavtb;
    }
}

let zavtaj = {};

function zavtak(zavta) {
    return zavtaj[zavta] || zavtl[zavta];
}

const zavtal = {};

const zavtam = {};

for (const zavta of zavtk) {
    const zavtb = zavta.folder;
    if (!zavtal[zavtb]) zavtal[zavtb] = new Set;
    if (!zavtam[zavtb]) zavtam[zavtb] = new Set;
    for (const zavtc of zavta.refs) {
        const zavta = zavtak(zavtc);
        if (zavta && zavta !== zavtb) zavtam[zavtb].add(zavta);
    }
    for (const zavtc of zavta.evalrefs) {
        const zavta = zavtak(zavtc);
        if (zavta && zavta !== zavtb) zavtal[zavtb].add(zavta);
    }
}

const zavtan = new Set;

const zavtao = new Set;

const zavtap = [];

function zavtaq(zavta, zavtb) {
    if (zavtao.has(zavta)) return;
    if (zavtan.has(zavta)) {
        const zavtc = zavtb.indexOf(zavta);
        zavtap.push(zavtb.slice(zavtc).concat(zavta).join(" -> "));
        return;
    }
    zavtan.add(zavta);
    for (const zavtc of zavtal[zavta] || []) zavtaq(zavtc, zavtb.concat(zavta));
    zavtan.delete(zavta);
    zavtao.add(zavta);
}

for (const zavta of Object.keys(zavtal)) zavtaq(zavta, []);

const zavtar = [ ...new Set([ ...Object.keys(zavtal), ...Object.values(zavtal).flatMap(zavta => [ ...zavta ]) ]) ];

const zavtas = {};

for (const zavta of zavtar) zavtas[zavta] = 0;

for (const zavta of Object.keys(zavtal)) for (const zavtb of zavtal[zavta]) zavtas[zavtb] = (zavtas[zavtb] || 0) + 1;

const zavtat = zavtar.filter(zavta => !zavtas[zavta]).sort();

const zavtau = [];

const zavtav = {};

while (zavtat.length) {
    const zavta = zavtat.shift();
    zavtau.push(zavta);
    zavtav[zavta] = zavtau.length;
    for (const zavtb of zavtal[zavta] || []) {
        zavtas[zavtb]--;
        if (zavtas[zavtb] === 0) zavtat.push(zavtb);
    }
}

for (const zavta of zavtd) if (zavtav[zavta] === undefined) {
    zavtav[zavta] = 1e3 + zavtd.indexOf(zavta);
    zavtau.push(zavta);
}

zavtav.__facade = 2e3;

zavtav.__namespace = 3e3;

function zavtaw(zavta, zavtb) {
    const zavtc = zavtav[zavta] === undefined ? 1500 : zavtav[zavta];
    const zavtd = zavtav[zavtb] === undefined ? 1500 : zavtav[zavtb];
    if (zavtc !== zavtd) return zavtc - zavtd;
    return zavta < zavtb ? -1 : zavta > zavtb ? 1 : 0;
}

let zavtax = {};

function zavtay() {
    zavtax = {};
    zavtaj = {};
    for (const zavta of zavtk) {
        if (!zavtax[zavta.folder]) zavtax[zavta.folder] = [];
        zavtax[zavta.folder].push(zavta);
        if (zavta.names) for (const zavtb of zavta.names) zavtaj[zavtb] = zavta.folder;
    }
}

function zavtaz(zavta, zavtb, zavtc) {
    const zavtd = zavtc === "core" && zavta === "core" ? "./index.js" : zavtc === "core" ? "../" + zavta + "/index.js" : zavta === "core" ? "../core/index.js" : "../" + zavta + "/index.js";
    return "import { " + zavtb.sort().join(", ") + ' } from "' + zavtd + '";';
}

function zavtba(zavta) {
    const zavtb = (zavtax[zavta] || []).filter(zavta => zavta.text.trim().length > 0);
    const zavtc = {};
    for (const zavta of zavtb) if (zavta.names && zavta.names.length) zavtc[zavta.names[0]] = zavta.names[0] + ".js";
    const zavtd = [];
    const zavte = {};
    function zavtf(zavta) {
        if (!zavte[zavta]) {
            const zavtb = {
                name: zavta,
                statements: []
            };
            zavte[zavta] = zavtb;
            zavtd.push(zavtb);
        }
        return zavte[zavta];
    }
    for (const zavta of zavtb) {
        if (zavta.names && zavta.names.length) zavtf(zavta.names[0] + ".js").statements.push({
            e: zavta,
            k: zavtk.indexOf(zavta)
        });
    }
    for (const zavtd of zavtb) {
        if (zavtd.names && zavtd.names.length) continue;
        const zavtb = zavtk.indexOf(zavtd);
        let zavtg = null;
        for (const zavtb of zavtd.refs || []) {
            if (zavtaj[zavtb] === zavta && zavtc[zavtb]) {
                zavtg = zavtc[zavtb];
                break;
            }
        }
        if (zavtg) {
            const zavta = zavte[zavtg].statements.find(zavta => zavta.e.names && zavta.e.names[0] + ".js" === zavtg);
            const zavtc = zavta ? zavta.k : -1;
            zavtf(zavtg).statements.push({
                e: zavtd,
                k: zavtc + .5 + zavtb / 1e6
            });
        } else {
            zavtf("sideeffects.js").statements.push({
                e: zavtd,
                k: zavtb
            });
        }
    }
    for (const zavta of zavtd) zavta.statements.sort((zavta, zavtb) => zavta.k - zavtb.k);
    return {
        files: zavtd,
        fileofname: zavtc
    };
}

function zavtbb(zavtb) {
    const {files: zavtc, fileofname: zavtd} = zavtba(zavtb);
    const zavte = path.join(zavta, "src", zavtb);
    fs.rmSync(zavte, {
        recursive: true,
        force: true
    });
    fs.mkdirSync(zavte, {
        recursive: true
    });
    const zavtf = new Set;
    let zavtg = 0;
    let zavth = 0;
    let zavti = 0;
    for (const zavta of zavtc) {
        const zavtc = new Set;
        for (const zavtc of zavta.statements) {
            zavtc.e.file = zavtb + "/" + zavta.name;
            zavtc.e.fileorder = zavti++;
        }
        for (const zavtb of zavta.statements) for (const zavta of zavtb.e.names || []) zavtc.add(zavta);
        const zavtj = {};
        for (const zavte of zavta.statements) {
            for (const zavta of zavte.e.refs || []) {
                if (zavtc.has(zavta)) continue;
                const zavte = zavtak(zavta);
                if (!zavte || zavte === "__sideeffect") continue;
                let zavtg;
                if (zavte === zavtb) zavtg = "./" + zavtd[zavta]; else if (zavte === "__facade") zavtg = zavtb === "core" ? "./facade.js" : "../core/facade.js"; else if (zavte === "__namespace") continue; else {
                    zavtg = "../" + zavte + "/index.js";
                    zavtf.add(zavte);
                }
                if (!zavtj[zavtg]) zavtj[zavtg] = new Set;
                zavtj[zavtg].add(zavta);
            }
        }
        const zavtk = [];
        for (const zavta of Object.keys(zavtj).sort()) zavtk.push("import { " + [ ...zavtj[zavta] ].sort().join(", ") + ' } from "' + zavta + '";');
        if (zavtk.length) zavtk.push("");
        for (const zavtb of zavta.statements) zavtk.push(zavtb.e.text);
        zavtk.push("");
        const zavtl = [ ...zavtc ].sort();
        if (zavtl.length) zavtk.push("export { " + zavtl.join(", ") + " };");
        const zavtm = zavtk.join("\n") + "\n";
        fs.writeFileSync(path.join(zavte, zavta.name), zavtm);
        zavtg += zavtl.length;
        zavth += zavtm.length;
    }
    const zavtj = zavtc.map(zavta => 'export * from "./' + zavta.name + '";').join("\n") + "\n";
    fs.writeFileSync(path.join(zavte, "index.js"), zavtj);
    return {
        imports: [ ...zavtf ],
        exports: zavtg,
        size: zavth + zavtj.length,
        statements: zavtc.length,
        files: zavtc.map(zavta => zavta.name)
    };
}

function zavtbc() {
    const zavtb = zavtax["__facade"] || [];
    for (let zavta = 0; zavta < zavtb.length; zavta++) {
        zavtb[zavta].file = "@facade";
        zavtb[zavta].fileorder = zavta;
    }
    const zavtc = new Set;
    for (const zavta of zavtb) for (const zavtb of zavta.refs || []) zavtc.add(zavtb);
    const zavtd = {};
    for (const zavta of zavtc) {
        const zavtb = zavtak(zavta);
        if (!zavtb || zavtb === "__facade" || zavtb === "__namespace") continue;
        if (!zavtd[zavtb]) zavtd[zavtb] = new Set;
        zavtd[zavtb].add(zavta);
    }
    const zavte = [];
    for (const zavta of Object.keys(zavtd).sort(zavtaw)) {
        if (zavta === "__namespace") continue;
        zavte.push(zavtaz(zavta, [ ...zavtd[zavta] ], "core"));
    }
    zavte.push("");
    for (const zavta of zavtb) zavte.push(zavta.text);
    zavte.push("");
    const zavtf = new Set;
    for (const zavta of zavtb) for (const zavtb of zavta.names || []) zavtf.add(zavtb);
    if (zavtf.size) zavte.push("export { " + [ ...zavtf ].sort().join(", ") + " };");
    fs.writeFileSync(path.join(zavta, "src", "core", "facade.js"), zavte.join("\n") + "\n");
    return {
        imports: Object.keys(zavtd),
        statements: zavtb.length
    };
}

function zavtbd() {
    const zavtb = zavtax["__namespace"] || [];
    for (let zavta = 0; zavta < zavtb.length; zavta++) {
        zavtb[zavta].file = "@namespace";
        zavtb[zavta].fileorder = zavta;
    }
    const zavtc = new Set;
    for (const zavta of zavtb) for (const zavtb of zavta.refs || []) zavtc.add(zavtb);
    const zavtd = {};
    for (const zavta of zavtc) {
        const zavtb = zavtak(zavta);
        if (!zavtb) continue;
        if (!zavtd[zavtb]) zavtd[zavtb] = new Set;
        zavtd[zavtb].add(zavta);
    }
    const zavte = [ 'import { FaoxomJs } from "./facade.js";' ];
    for (const zavta of Object.keys(zavtd).sort(zavtaw)) {
        if (zavta === "__facade") {
            const zavtb = [ ...zavtd[zavta] ].filter(zavta => zavta !== "FaoxomJs");
            if (zavtb.length) zavte.push("import { " + zavtb.sort().join(", ") + ' } from "./facade.js";');
        } else if (zavta !== "__namespace" && zavta !== "__sideeffect") {
            zavte.push(zavtaz(zavta, [ ...zavtd[zavta] ], "core"));
        }
    }
    zavte.push("");
    for (const zavta of zavtb) zavte.push(zavta.text);
    fs.writeFileSync(path.join(zavta, "src", "core", "namespace.js"), zavte.join("\n") + "\n");
    return {
        imports: Object.keys(zavtd).length,
        statements: zavtb.length
    };
}

function zavtbe() {
    const zavtb = [];
    const zavtc = zavtd.slice().sort(zavtaw);
    for (const zavta of zavtc) zavtb.push("import * as " + zavta + ' from "./' + zavta + '/index.js";');
    zavtb.push('import { FaoxomJs } from "./core/facade.js";');
    zavtb.push('import "./core/namespace.js";');
    zavtb.push("var FAOXOM = {};");
    zavtb.push("var faoxomseen = {};");
    zavtb.push("var faoxomfolders = [" + zavtd.join(", ") + "];");
    zavtb.push("for (var faoxomfi = 0; faoxomfi < faoxomfolders.length; faoxomfi++) {");
    zavtb.push("    var faoxommod = faoxomfolders[faoxomfi];");
    zavtb.push("    var faoxomkeys = Object.getOwnPropertyNames(faoxommod);");
    zavtb.push("    for (var faoxomki = 0; faoxomki < faoxomkeys.length; faoxomki++) {");
    zavtb.push("        var faoxomkey = faoxomkeys[faoxomki];");
    zavtb.push('        if (faoxomkey === "default") continue;');
    zavtb.push("        if (!faoxomseen[faoxomkey]) { faoxomseen[faoxomkey] = true; FAOXOM[faoxomkey] = faoxommod[faoxomkey]; }");
    zavtb.push("    }");
    zavtb.push("}");
    zavtb.push("FAOXOM.FaoxomJs = FaoxomJs;");
    zavtb.push("var faoxomstat = Object.getOwnPropertyNames(FaoxomJs);");
    zavtb.push("for (var faoxomsi = 0; faoxomsi < faoxomstat.length; faoxomsi++) {");
    zavtb.push("    var faoxomsk = faoxomstat[faoxomsi];");
    zavtb.push('    if (faoxomsk === "length" || faoxomsk === "name" || faoxomsk === "prototype") continue;');
    zavtb.push("    if (!FAOXOM[faoxomsk]) FAOXOM[faoxomsk] = FaoxomJs[faoxomsk];");
    zavtb.push("}");
    zavtb.push('if (typeof window !== "undefined") { window.FAOXOM = FAOXOM; window.FaoxomJs = FaoxomJs; }');
    zavtb.push('else if (typeof globalThis !== "undefined") { globalThis.FAOXOM = FAOXOM; }');
    for (const zavta of zavtc) zavtb.push('export * from "./' + zavta + '/index.js";');
    zavtb.push("export { FaoxomJs, FAOXOM };");
    zavtb.push("export default FAOXOM;");
    fs.writeFileSync(path.join(zavta, "src", "index.js"), zavtb.join("\n") + "\n");
}

function zavtbf() {
    const zavtb = [ ...new Set(zavtm) ].filter(zavta => zavtak(zavta) === "nodes");
    const zavtc = [ ...new Set(zavtm) ].filter(zavta => zavtak(zavta) === "materials" && /Node/.test(zavta));
    const zavtd = [];
    if (zavtb.length) zavtd.push("export { " + zavtb.sort().join(", ") + ' } from "./nodes/index.js";');
    if (zavtc.length) zavtd.push("export { " + zavtc.sort().join(", ") + ' } from "./materials/index.js";');
    fs.writeFileSync(path.join(zavta, "src", "tsl.js"), zavtd.join("\n") + "\n");
}

let zavtbg = {};

let zavtbh = [];

let zavtbi = 0;

while (zavtbi < 40) {
    zavtbi++;
    zavtay();
    zavtbg = {};
    for (const zavta of zavtd) zavtbg[zavta] = zavtbb(zavta);
    zavtbg.facade = zavtbc();
    zavtbg.namespace = zavtbd();
    zavtbe();
    zavtbf();
    zavtbh = zavtaf();
    if (!zavtbh.length) break;
    let zavta = 0;
    for (const zavtb of zavtbh) {
        if (!zavtb.target) continue;
        if (!zavtb.stmt.visited) zavtb.stmt.visited = [ zavtb.stmt.folder ];
        if (zavtb.stmt.visited.indexOf(zavtb.target) !== -1) continue;
        zavtac.push("sim-internalize " + (zavtb.stmt.names ? zavtb.stmt.names[0] : "sideeffect" + zavtk.indexOf(zavtb.stmt)) + ": " + zavtb.stmt.folder + " -> " + zavtb.target + (zavtb.intra ? " (INTRA " + zavtb.intra + ")" : ""));
        zavtb.stmt.visited.push(zavtb.target);
        zavtb.stmt.folder = zavtb.target;
        zavtad++;
        zavta++;
    }
    if (!zavta) break;
}

fs.writeFileSync(path.join(zavta, "tools", ".faoxombody.js"), zavtk.map(zavta => zavta.text).join("\n") + "\n");

fs.writeFileSync(path.join(zavta, "tools", ".faoxomstatements.json"), JSON.stringify(zavtk.map(zavta => ({
    text: zavta.text,
    names: zavta.names || [],
    folder: zavta.folder
})), null, 0));

fs.writeFileSync(path.join(zavta, "tools", ".faoxomnames.json"), JSON.stringify({
    namefolder: zavtaj,
    declaredorder: [ ...new Set(zavtm) ]
}));

const zavtbj = {};

for (const zavta of zavtk) zavtbj[zavta.folder] = (zavtbj[zavta.folder] || 0) + 1;

console.error("moves: " + zavtac.length + " | sim internalized: " + zavtad + " | sim rounds: " + zavtbi + " | eval conflicts remaining: " + (zavtbh.length ? JSON.stringify(zavtbh.map(zavta => (zavta.stmt.names ? zavta.stmt.names[0] : "sideeffect") + (zavta.intra ? " INTRA:" + zavta.intra : " -> " + zavta.target))) : "none") + " | runtime cycles: " + zavtai.length);

const zavtbk = zavtap.length ? zavtap : "none";

console.log(JSON.stringify({
    folders: Object.fromEntries(Object.entries(zavtbg).map(([zavta, zavtb]) => [ zavta, {
        exports: zavtb.exports,
        imports: zavtb.imports,
        size: zavtb.size,
        statements: zavtb.statements
    } ])),
    evalcycles: zavtbk,
    statementcounts: zavtbj,
    totalstatements: zavtk.length,
    totalnames: new Set(zavtm).size
}, null, 1));
