import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const rootdir = process.cwd();
const source = fs.readFileSync(path.join(rootdir, "tools", ".faoxomoriginal.js"), "utf8");
const sf = ts.createSourceFile("FaoxomJs.js", source, ts.ScriptTarget.ES2022, true);

const folders = ["animation", "audio", "camera", "core", "extras", "geometries", "helpers", "lights", "loaders", "materials", "math", "nodes", "objects", "renderers", "scenes", "textures"];

const explicit = {
    math: ["Vector2", "Vector3", "Vector4", "Matrix3", "Matrix4", "Quaternion", "Euler", "Color", "Box3", "Sphere", "Plane", "Ray", "Segment3", "Tri3", "MathUtils", "Curve", "LineCurve3", "CatmullRomCurve3", "CubicBezierCurve3", "QuadraticBezierCurve3", "NURBSCurve", "NURBSSurface", "NURBSUtils", "Path", "Shape", "ShapePath", "ShapeUtils"],
    core: ["EventDispatcher", "Object3D", "Node", "Clock", "Raycaster", "BufferAttribute", "Float32BufferAttribute", "InstancedBufferAttribute", "BufferGeometry", "Fog", "FogExp2"],
    objects: ["Mesh", "Group", "Line", "LineLoop", "LineSegments", "Points", "Sprite", "SkinnedMesh", "Bone", "Skeleton", "InstancedMesh", "MeshPool", "ObjectPool", "LOD", "WideLine", "ClipVolume", "ClipVolumeArray", "ParticleSystem"],
    scenes: ["Scene"],
    camera: ["PerspectiveCamera", "OrthographicCamera", "Camera", "OrbitControls", "MapControls", "FirstPersonControls", "PointerLockControls", "ArcballControls", "TransformControls", "InputManager"],
    lights: ["Light", "AmbientLight", "DirectionalLight", "HemisphereLight", "PointLight", "SpotLight", "RectAreaLight", "LightClusterGrid", "ClusteredLightingManager"],
    helpers: ["CameraHelper", "DirectionalLightHelper", "PointLightHelper", "SkeletonHelper", "StatsPanel"],
    loaders: ["FileLoader", "LoadingManager", "AssetLoader", "registerModel", "embedModel", "listEmbeddedModels", "removeEmbeddedModel", "createBlenderFidelityProfile", "BlenderFidelityProfile", "ModelBuilder", "SceneExporter", "Font", "MSDFText"],
    textures: ["Texture", "TextureStreamer", "TextureFormatSelector", "PMREMGenerator", "PMREMEnvironment"],
    renderers: ["WebGLRenderTarget", "GBufferTarget", "OcclusionCuller", "GPUCullingPipeline", "GPUIndirectDrawBuffer", "SunBeam", "GPUCompute", "GPUComputePass", "WebGPUCompute", "RenderTarget", "CascadedShadowMap", "RenderLayers"],
    nodes: ["tsl", "TSLBufferPacker", "ShaderNode", "NodeMaterial"],
    animation: ["BlendTree", "MotionMatcher", "RootMotionExtractor", "FacialAnimation", "TwoBoneIKSolver"],
    extras: ["PhysicsWorld", "RigidBody", "CharacterController", "CCDSolver", "GJK", "EPA", "DestructionBody", "HeightfieldShape", "CollisionShape", "CompoundCollisionShape", "ConvexCollisionShape", "ConvexHullCollider", "CylinderCollisionShape", "MeshCollisionShape", "TriMeshBVH", "TriMeshCollider", "BVHNode", "Ragdoll", "RagdollChain", "Vehicle", "VehicleWheel", "Navmesh", "NavmeshManager", "Pathfinder", "SoftBody", "SoftBodySimulation", "Cloth", "ClothSimulation", "SPHFluidSimulation", "Fluid", "Rope", "AtmosphericSky", "Decal", "ReflectionProbe", "ReflectionProbeEnvironment", "Terrain", "TerrainManager", "FaoxomReact", "createFaoxomRoot", "GPUParticleComputeSystem", "WorldStreamer", "JointLimit"],
    geometries: ["Geometry", "GeometryFactory", "mergeGeometries", "simplifyGeometry", "MeshDecimator", "ContinuousLOD", "VirtualGeometryStreamer", "EdgeOutlineGeometry"],
    audio: ["AudioListener", "AudioEnvironment", "PositionalAudio"],
    materials: ["SSSSProfile"]
};

const nametofolder = {};
for (const folder of Object.keys(explicit)) for (const name of explicit[folder]) nametofolder[name] = folder;

function classify(name) {
    if (nametofolder[name]) return nametofolder[name];
    if (/^faoxom/.test(name)) return "core";
    if (/(Format|Type|Filter|Wrapping|Blending|ToneMapping|ColorSpace|DrawUsage|Side)$/.test(name)) return "core";
    if (/NodeMaterial$/.test(name)) return "nodes";
    if (/(Loader|Exporter)$/.test(name)) return "loaders";
    if (/Material$/.test(name)) return "materials";
    if (/Geometry$/.test(name)) return "geometries";
    if (/Helper$/.test(name)) return "helpers";
    if (/Light$/.test(name)) return "lights";
    if (/Node$/.test(name)) return "nodes";
    if (/(Pass|Composer)$/.test(name)) return "renderers";
    if (/Camera$/.test(name)) return "camera";
    if (/Controls$/.test(name)) return "camera";
    if (/Texture/.test(name)) return "textures";
    if (/^Animation/.test(name)) return "animation";
    if (/^Audio/.test(name)) return "audio";
    if (/Joint$/.test(name) || /Constraint$/.test(name)) return "extras";
    if (/^WebXR/.test(name)) return "extras";
    if (/^Web(GL|GPU)/.test(name)) return "renderers";
    if (/^PMREM/.test(name)) return "textures";
    if (/^Scene/.test(name)) return "scenes";
    if (/^Terrain/.test(name)) return "extras";
    return "core";
}

function propertyName(node) {
    const p = node.parent;
    if (!p) return false;
    if (ts.isPropertyAccessExpression(p) && p.name === node) return true;
    if (ts.isPropertyAssignment(p) && p.name === node) return true;
    if (ts.isMethodDeclaration(p) && p.name === node) return true;
    if (ts.isPropertyDeclaration(p) && p.name === node) return true;
    if (ts.isVariableDeclaration(p) && p.name === node) return true;
    if ((ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p)) && p.name === node) return true;
    if (ts.isBindingElement(p) && p.name === node) return true;
    return false;
}

function collectRefs(node, set) {
    if (ts.isIdentifier(node)) {
        if (!propertyName(node)) set.add(node.text);
        return;
    }
    ts.forEachChild(node, child => collectRefs(child, set));
}

function collectEvalRefs(node, set) {
    if (ts.isIdentifier(node)) {
        if (!propertyName(node)) set.add(node.text);
        return;
    }
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) return;
    if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) || ts.isConstructorDeclaration(node)) return;
    if (ts.isPropertyDeclaration(node) && !(node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword))) return;
    if (ts.isClassDeclaration(node)) {
        for (const clause of node.herenceClauses || []) {}
        for (const clause of node.heritageClauses || []) collectEvalRefs(clause, set);
        for (const member of node.members) {
            if (member.modifiers && member.modifiers.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) collectEvalRefs(member, set);
        }
        return;
    }
    ts.forEachChild(node, child => collectEvalRefs(child, set));
}

const statements = [];
const namefolder = {};
const declaredorder = [];

const declaredcamel = [];
for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) declaredcamel.push(decl.name.text);
            else for (const el of decl.name.elements) if (ts.isIdentifier(el.name)) declaredcamel.push(el.name.text);
        }
    } else if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name) declaredcamel.push(stmt.name.text);
}
const renamemap = {};
const taken = {};
for (const n of declaredcamel) taken[n] = true;
for (const n of declaredcamel) {
    if (!/^[a-z]/.test(n) || !/[A-Z]/.test(n)) continue;
    let ln = n.toLowerCase();
    if (taken[ln] && taken[ln] !== n) ln = ln + "alt";
    while (taken[ln] && taken[ln] !== n) ln = ln + "x";
    taken[ln] = n;
    renamemap[n] = ln;
}
function isKeyPosition(node) {
    const p = node.parent;
    if (!p) return false;
    if (ts.isPropertyAccessExpression(p) && p.name === node) return true;
    if (ts.isQualifiedName(p) && p.name === node) return true;
    if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isEnumMember(p)) && p.name === node) return true;
    if (ts.isShorthandPropertyAssignment(p)) throw new Error("shorthand property with renamed name: " + node.text);
    if (ts.isBindingElement(p) && p.name === node && !p.propertyName) throw new Error("shorthand binding element with renamed name: " + node.text);
    return false;
}
function renametext(stmt) {
    const spans = [];
    function walk(node) {
        if (ts.isIdentifier(node)) {
            if (renamemap[node.text] && !isKeyPosition(node)) spans.push([node.getStart(sf), node.getEnd(), node.text]);
            return;
        }
        ts.forEachChild(node, walk);
    }
    walk(stmt);
    if (!spans.length) return null;
    spans.sort((a, b) => a[0] - b[0]);
    let out = "";
    let pos = stmt.getStart(sf);
    for (const sp of spans) { out += source.slice(pos, sp[0]) + renamemap[sp[2]]; pos = sp[1]; }
    out += source.slice(pos, stmt.getEnd());
    return out;
}

for (const stmt of sf.statements) {
    let text = source.slice(stmt.getStart(sf), stmt.getEnd());
    if (ts.isExportAssignment(stmt)) continue;
    const renamed = renametext(stmt);
    if (renamed !== null) text = renamed;
    const names = [];
    if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) names.push(decl.name.text);
            else for (const el of decl.name.elements) if (ts.isIdentifier(el.name)) names.push(el.name.text);
        }
    } else if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name) {
        names.push(stmt.name.text);
    } else if (ts.isExpressionStatement(stmt)) {
        const exprtext = text.trim();
        const refs = new Set();
        collectRefs(stmt, refs);
        const evalrefs = new Set();
        collectEvalRefs(stmt, evalrefs);
        if (exprtext.startsWith("FaoxomJs.prototype.")) statements.push({ folder: "__facade", text, refs: [...refs].map(r => renamemap[r] || r), evalrefs: [...evalrefs].map(r => renamemap[r] || r) });
        else if (exprtext.startsWith("FaoxomJs.")) statements.push({ folder: "__namespace", text, refs: [...refs].map(r => renamemap[r] || r), evalrefs: [...evalrefs].map(r => renamemap[r] || r) });
        else statements.push({ folder: "__sideeffect", text, refs: [...refs].map(r => renamemap[r] || r), evalrefs: [...evalrefs].map(r => renamemap[r] || r) });
        continue;
    } else {
        const refs = new Set();
        collectRefs(stmt, refs);
        const evalrefs = new Set();
        collectEvalRefs(stmt, evalrefs);
        statements.push({ folder: "__sideeffect", text, refs: [...refs].map(r => renamemap[r] || r), evalrefs: [...evalrefs].map(r => renamemap[r] || r) });
        continue;
    }
    let folder = classify(names[0]);
    if (names[0] === "FaoxomJs") folder = "__facade";
    for (const name of names) namefolder[name] = folder;
    declaredorder.push(...names);
    const refs = new Set();
    collectRefs(stmt, refs);
    const evalrefs = new Set();
    collectEvalRefs(stmt, evalrefs);
    statements.push({ folder, text, names: names.map(n => renamemap[n] || n), refs: [...refs].map(r => renamemap[r] || r), evalrefs: [...evalrefs].map(r => renamemap[r] || r) });
}

const folderrank = { math: 0, core: 1, geometries: 2, materials: 3, textures: 4, objects: 5, lights: 6, camera: 7, animation: 8, audio: 9, helpers: 10, nodes: 11, renderers: 12, extras: 13, loaders: 14, __facade: 15, __namespace: 16 };
function isreal(f) { return folders.indexOf(f) !== -1; }

const faoxomstatemap = { faoxomid: "faoxomstate.faoxomidx", faoxomdefaultrenderer: "faoxomstate.faoxomdefaultrenderer", faoxommodelstoreversion: "faoxomstate.faoxommodelstoreversion" };
const faoxomstatekeys = Object.keys(faoxomstatemap);
for (const e of statements) {
    const t = e.text.trim();
    if (t === "var faoxomid = 1;") {
        e.text = "var faoxomstate = { faoxomidx: 1, faoxomdefaultrenderer: null, faoxommodelstoreversion: 0 };";
        e.names = ["faoxomstate"];
        continue;
    }
    if (t === "var faoxomdefaultrenderer = null;" || t === "var faoxommodelstoreversion = 0;") {
        e.text = "";
        e.names = [];
        continue;
    }
    if (faoxomstatekeys.some(k => new RegExp("(?<![.\\w$])" + k + "\\b").test(e.text))) {
        for (const k of faoxomstatekeys) e.text = e.text.replace(new RegExp("(?<![.\\w$])" + k + "\\b", "g"), faoxomstatemap[k]);
        if (e.refs) e.refs = e.refs.map(r => r === "faoxomid" || r === "faoxomdefaultrenderer" || r === "faoxommodelstoreversion" ? "faoxomstate" : r);
        if (e.evalrefs) e.evalrefs = e.evalrefs.map(r => faoxomstatekeys.indexOf(r) !== -1 ? "faoxomstate" : r);
    }
}

const duckrewrites = [
    ["obj instanceof Mesh && obj.setMaterialVariant", "obj.isMesh && obj.setMaterialVariant", 1, "Mesh"],
    ["obj instanceof Mesh && obj.getAvailableMaterialVariants", "obj.isMesh && obj.getAvailableMaterialVariants", 1, "Mesh"],
    ["this instanceof Camera) this.quaternion", "this.isCamera) this.quaternion", 1, "Camera"],
    ["camera.isPerspectiveCamera || camera instanceof PerspectiveCamera", "camera.isPerspectiveCamera", 1, "PerspectiveCamera"]
];
for (const rw of duckrewrites) {
    let hits = 0;
    for (const e of statements) {
        const parts = e.text.split(rw[0]);
        if (parts.length > 1) {
            hits += parts.length - 1;
            e.text = parts.join(rw[1]);
            if (!new RegExp("(?<![.\\w$\\\"'])" + rw[3] + "\\b").test(e.text)) {
                if (e.refs) e.refs = e.refs.filter(r => r !== rw[3]);
                if (e.evalrefs) e.evalrefs = e.evalrefs.filter(r => r !== rw[3]);
            }
        }
    }
    if (hits !== rw[2]) throw new Error("duckrewrite count mismatch: '" + rw[0] + "' expected " + rw[2] + " got " + hits);
}

for (const e of statements) {
    if (isreal(e.folder) && e.refs && e.refs.indexOf("FaoxomJs") !== -1) e.folder = "__facade";
}

const versionhits = { expected: 1, found: 0 };
for (const e of statements) {
    if (e.text.split('FaoxomJs.VERSION = "v5"').length > 1) {
        versionhits.found += e.text.split('FaoxomJs.VERSION = "v5"').length - 1;
        e.text = e.text.split('FaoxomJs.VERSION = "v5"').join('FaoxomJs.VERSION = "v6"');
    }
}
if (versionhits.found !== versionhits.expected) throw new Error("version transform expected 1 got " + versionhits.found);

const forcedfolders = {
    faoxomcollisioncontact: "extras", faoxomdecodegcode: "loaders", faoxomdecodepcd: "loaders", faoxomfrustumvisible: "helpers", faoxomsimplifygeometry: "objects", LineLoop: "objects", LineSegments: "objects", ContinuousLOD: "extras", faoxomtrianglebody: "extras", faoxommeshcontact: "extras", faoxomgeometry: "geometries", faoxomfbxgeometry: "loaders", faoxomdecodeply: "loaders", faoxomdecodevtk: "loaders", faoxomdecodemd2: "loaders", faoxomdecodemdd: "loaders", faoxommd2animations: "loaders", faoxomsvgbuildgradienttexture: "textures", RenderLayers: "core", DecalGeometry: "objects", FaoxomReact: "extras" };
for (const e of statements) {
    if (e.names && e.names.length === 1 && forcedfolders[e.names[0]]) e.folder = forcedfolders[e.names[0]];
}

const mathutils = ["faoxomcatmullrompoint", "faoxomclamp", "faoxomearcut", "faoxomellipsecurvepoint", "faoxomhuetorgb", "faoxomsrgbtolinear", "faoxomsrgbtolinearalt", "faoxomvalue", "faoxomcolorkeywords"];
function issinkmath(name) {
    return mathutils.indexOf(name) !== -1 || /^faoxomearcut/.test(name);
}
for (const e of statements) {
    if (e.names && e.names.length === 1 && issinkmath(e.names[0])) e.folder = "math";
}

function buildnamemap() {
    const nmap = {};
    for (const e of statements) if (e.names) for (const n of e.names) nmap[n] = e.folder;
    return nmap;
}

const movelog = [];
let internalized = 0;

function depresolve(from, rel) {
    const parts = rel.split("/");
    parts.shift();
    let folder;
    let file;
    if (from === "index" || from === "tsl") {
        folder = parts[0];
        file = parts[1];
    } else if (from === "@facade" || from === "@namespace") {
        if (parts.length === 1) { folder = "core"; file = parts[0]; }
        else { folder = parts[0]; file = parts[1]; }
    } else {
        if (parts.length === 1) { folder = from.split("/")[0]; file = parts[0]; }
        else { folder = parts[0]; file = parts[1]; }
    }
    if (file === "facade.js") return "@facade";
    if (file === "namespace.js") return "@namespace";
    if (file === "index.js") return folder + "/@index";
    return folder + "/" + file;
}

function simulate() {
    const srcdir = path.join(rootdir, "src");
    const files = { index: path.join(srcdir, "index.js"), tsl: path.join(srcdir, "tsl.js"), "@facade": path.join(srcdir, "core", "facade.js"), "@namespace": path.join(srcdir, "core", "namespace.js") };
    for (const folder of folders) {
        const dir = path.join(srcdir, folder);
        let list = [];
        try { list = fs.readdirSync(dir); } catch (e) {}
        for (const f of list) if (f.endsWith(".js")) files[f === "index.js" ? folder + "/@index" : folder + "/" + f] = path.join(dir, f);
    }
    const imports = {};
    const re = /from\s*"([^"]+)"/g;
    for (const id of Object.keys(files)) {
        const text = fs.readFileSync(files[id], "utf-8");
        const deps = [];
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(text))) deps.push(depresolve(id, m[1]));
        imports[id] = deps;
    }
    const declstmt = {};
    for (const e of statements) if (e.names) for (const n of e.names) declstmt[n] = e;
    function moduleof(e) {
        if (e.folder === "__facade") return "@facade";
        if (e.folder === "__namespace") return "@namespace";
        return e.file;
    }
    const seen = new Set();
    const conflicts = [];
    const entries = ["index", "tsl"];
    for (const id of Object.keys(files)) if (id.indexOf("/") !== -1 || id === "@facade" || id === "@namespace") entries.push(id);
    for (const entry of entries) {
        const evaluated = {};
        const inprogress = {};
        let counter = 0;
        function req(id) {
            if (evaluated[id] !== undefined || inprogress[id]) return;
            inprogress[id] = true;
            const deps = imports[id] || [];
            for (let i = 0; i < deps.length; i++) req(deps[i]);
            inprogress[id] = false;
            evaluated[id] = counter++;
        }
        req(entry);
        for (const e of statements) {
            const mA = moduleof(e);
            if (!mA || evaluated[mA] === undefined) continue;
            for (const ref of e.evalrefs || []) {
                if (e.names && e.names.indexOf(ref) !== -1) continue;
                const d = declstmt[ref];
                if (!d) continue;
                const mB = moduleof(d);
                if (!mB) continue;
                if (mB === mA) {
                    if (e.fileorder !== undefined && d.fileorder !== undefined && d.fileorder > e.fileorder) {
                        const key = "intra:" + mA + ":" + ref + ":" + e.fileorder;
                        if (!seen.has(key)) { seen.add(key); conflicts.push({ stmt: e, target: null, intra: ref }); }
                    }
                } else {
                    if (evaluated[mB] === undefined || evaluated[mB] > evaluated[mA]) {
                        const key = si_key(e) + ":" + mB;
                        if (!seen.has(key)) { seen.add(key); conflicts.push({ stmt: e, target: namefolderfinal[ref] || d.folder }); }
                    }
                }
            }
        }
    }
    return conflicts;
}

function si_key(e) {
    return e.names ? e.names[0] : "sideeffect" + statements.indexOf(e);
}

function fullgraphcycles() {
    const graph = {};
    const nmap = buildnamemap();
    for (const e of statements) {
        if (!graph[e.folder]) graph[e.folder] = new Set();
        for (const ref of e.refs || []) {
            const G = nmap[ref];
            if (G && G !== e.folder) graph[e.folder].add(G);
        }
    }
    const state = {};
    const stack = [];
    const cycles = [];
    function visit(node) {
        if (state[node] === 2) return;
        if (state[node] === 1) { cycles.push(stack.slice(stack.indexOf(node)).concat(node).join(" -> ")); return; }
        state[node] = 1;
        stack.push(node);
        for (const next of graph[node] || []) visit(next);
        stack.pop();
        state[node] = 2;
    }
    for (const node of Object.keys(graph)) visit(node);
    return cycles;
}

const remainingcycles = fullgraphcycles();

for (const entry of statements) {
    if (entry.folder === "__sideeffect") {
        if ((entry.refs || []).indexOf("FaoxomJs") !== -1) { entry.folder = "__facade"; continue; }
        if (entry.text.startsWith("Geometry.prototype.simplify")) { entry.folder = "objects"; continue; }
        let target = "core";
        for (const ref of entry.refs || []) {
            const f = namefolder[ref];
            if (f && f !== "__facade" && f !== "__namespace" && f !== "__sideeffect") { target = f; break; }
        }
        entry.folder = target;
    }
}

let namefolderfinal = {};

function folderof(name) {
    return namefolderfinal[name] || namefolder[name];
}

const evalgraph = {};
const runtimegraph = {};
for (const entry of statements) {
    const from = entry.folder;
    if (!evalgraph[from]) evalgraph[from] = new Set();
    if (!runtimegraph[from]) runtimegraph[from] = new Set();
    for (const ref of entry.refs) {
        const to = folderof(ref);
        if (to && to !== from) runtimegraph[from].add(to);
    }
    for (const ref of entry.evalrefs) {
        const to = folderof(ref);
        if (to && to !== from) evalgraph[from].add(to);
    }
}

const visiting = new Set();
const visited = new Set();
const cycleedges = [];
function dfs(node, stack) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
        const idx = stack.indexOf(node);
        cycleedges.push(stack.slice(idx).concat(node).join(" -> "));
        return;
    }
    visiting.add(node);
    for (const next of evalgraph[node] || []) dfs(next, stack.concat(node));
    visiting.delete(node);
    visited.add(node);
}
for (const node of Object.keys(evalgraph)) dfs(node, []);

const evalnodes = [...new Set([...Object.keys(evalgraph), ...Object.values(evalgraph).flatMap(s => [...s])])];
const indegree = {};
for (const n of evalnodes) indegree[n] = 0;
for (const from of Object.keys(evalgraph)) for (const to of evalgraph[from]) indegree[to] = (indegree[to] || 0) + 1;
const evalqueue = evalnodes.filter(n => !indegree[n]).sort();
const evalorder = [];
const evalrank = {};
while (evalqueue.length) {
    const n = evalqueue.shift();
    evalorder.push(n);
    evalrank[n] = evalorder.length;
    for (const to of evalgraph[n] || []) {
        indegree[to]--;
        if (indegree[to] === 0) evalqueue.push(to);
    }
}
for (const folder of folders) if (evalrank[folder] === undefined) { evalrank[folder] = 1000 + folders.indexOf(folder); evalorder.push(folder); }
evalrank.__facade = 2000;
evalrank.__namespace = 3000;

function importsort(a, b) {
    const ra = evalrank[a] === undefined ? 1500 : evalrank[a];
    const rb = evalrank[b] === undefined ? 1500 : evalrank[b];
    if (ra !== rb) return ra - rb;
    return a < b ? -1 : a > b ? 1 : 0;
}

let folderstatements = {};
function rebuildfolderstatements() {
    folderstatements = {};
    namefolderfinal = {};
    for (const entry of statements) {
        if (!folderstatements[entry.folder]) folderstatements[entry.folder] = [];
        folderstatements[entry.folder].push(entry);
        if (entry.names) for (const n of entry.names) namefolderfinal[n] = entry.folder;
    }
}

function importline(target, names, fromdir) {
    const rel = fromdir === "core" && target === "core" ? "./index.js" : fromdir === "core" ? "../" + target + "/index.js" : target === "core" ? "../core/index.js" : "../" + target + "/index.js";
    return 'import { ' + names.sort().join(", ") + ' } from "' + rel + '";';
}

function buildfolderfiles(folder) {
    const entries = (folderstatements[folder] || []).filter(e => e.text.trim().length > 0);
    const fileofname = {};
    for (const e of entries) if (e.names && e.names.length) fileofname[e.names[0]] = e.names[0] + ".js";
    const files = [];
    const filemap = {};
    function getfile(fname) {
        if (!filemap[fname]) { const f = { name: fname, statements: [] }; filemap[fname] = f; files.push(f); }
        return filemap[fname];
    }
    for (const e of entries) {
        if (e.names && e.names.length) getfile(e.names[0] + ".js").statements.push({ e, k: statements.indexOf(e) });
    }
    for (const e of entries) {
        if (e.names && e.names.length) continue;
        const idx = statements.indexOf(e);
        let hostkey = null;
        for (const ref of e.refs || []) {
            if (namefolderfinal[ref] === folder && fileofname[ref]) { hostkey = fileofname[ref]; break; }
        }
        if (hostkey) {
            const hoststmt = filemap[hostkey].statements.find(st => st.e.names && st.e.names[0] + ".js" === hostkey);
            const hostk = hoststmt ? hoststmt.k : -1;
            getfile(hostkey).statements.push({ e, k: hostk + 0.5 + idx / 1000000 });
        } else {
            getfile("sideeffects.js").statements.push({ e, k: idx });
        }
    }
    for (const f of files) f.statements.sort((a, b) => a.k - b.k);
    return { files, fileofname };
}

function emitfolder(folder) {
    const { files, fileofname } = buildfolderfiles(folder);
    const folderdir = path.join(rootdir, "src", folder);
    fs.rmSync(folderdir, { recursive: true, force: true });
    fs.mkdirSync(folderdir, { recursive: true });
    const crosstargets = new Set();
    let exportscount = 0;
    let size = 0;
    let fileorder = 0;
    for (const f of files) {
        const declared = new Set();
        for (const st of f.statements) { st.e.file = folder + "/" + f.name; st.e.fileorder = fileorder++; }
        for (const st of f.statements) for (const n of st.e.names || []) declared.add(n);
        const importmap = {};
        for (const st of f.statements) {
            for (const ref of st.e.refs || []) {
                if (declared.has(ref)) continue;
                const target = folderof(ref);
                if (!target || target === "__sideeffect") continue;
                let key;
                if (target === folder) key = "./" + fileofname[ref];
                else if (target === "__facade") key = folder === "core" ? "./facade.js" : "../core/facade.js";
                else if (target === "__namespace") continue;
                else { key = "../" + target + "/index.js"; crosstargets.add(target); }
                if (!importmap[key]) importmap[key] = new Set();
                importmap[key].add(ref);
            }
        }
        const lines = [];
        for (const key of Object.keys(importmap).sort()) lines.push('import { ' + [...importmap[key]].sort().join(", ") + ' } from "' + key + '";');
        if (lines.length) lines.push("");
        for (const st of f.statements) lines.push(st.e.text);
        lines.push("");
        const exportnames = [...declared].sort();
        if (exportnames.length) lines.push("export { " + exportnames.join(", ") + " };");
        const body = lines.join("\n") + "\n";
        fs.writeFileSync(path.join(folderdir, f.name), body);
        exportscount += exportnames.length;
        size += body.length;
    }
    const barrel = files.map(f => 'export * from "./' + f.name + '";').join("\n") + "\n";
    fs.writeFileSync(path.join(folderdir, "index.js"), barrel);
    return { imports: [...crosstargets], exports: exportscount, size: size + barrel.length, statements: files.length, files: files.map(f => f.name) };
}

function emitfacade() {
    const entries = folderstatements["__facade"] || [];
    for (let i = 0; i < entries.length; i++) { entries[i].file = "@facade"; entries[i].fileorder = i; }
    const refs = new Set();
    for (const entry of entries) for (const r of entry.refs || []) refs.add(r);
    const importmap = {};
    for (const ref of refs) {
        const target = folderof(ref);
        if (!target || target === "__facade" || target === "__namespace") continue;
        if (!importmap[target]) importmap[target] = new Set();
        importmap[target].add(ref);
    }
    const lines = [];
    for (const target of Object.keys(importmap).sort(importsort)) {
        if (target === "__namespace") continue;
        lines.push(importline(target, [...importmap[target]], "core"));
    }
    lines.push("");
    for (const entry of entries) lines.push(entry.text);
    lines.push("");
    const facadexports = new Set();
    for (const entry of entries) for (const n of entry.names || []) facadexports.add(n);
    if (facadexports.size) lines.push("export { " + [...facadexports].sort().join(", ") + " };");
    fs.writeFileSync(path.join(rootdir, "src", "core", "facade.js"), lines.join("\n") + "\n");
    return { imports: Object.keys(importmap), statements: entries.length };
}

function emitnamespace() {
    const entries = folderstatements["__namespace"] || [];
    for (let i = 0; i < entries.length; i++) { entries[i].file = "@namespace"; entries[i].fileorder = i; }
    const refs = new Set();
    for (const entry of entries) for (const r of entry.refs || []) refs.add(r);
    const importmap = {};
    for (const ref of refs) {
        const target = folderof(ref);
        if (!target) continue;
        if (!importmap[target]) importmap[target] = new Set();
        importmap[target].add(ref);
    }
    const lines = ['import { FaoxomJs } from "./facade.js";'];
    for (const target of Object.keys(importmap).sort(importsort)) {
        if (target === "__facade") {
            const names = [...importmap[target]].filter(n => n !== "FaoxomJs");
            if (names.length) lines.push('import { ' + names.sort().join(", ") + ' } from "./facade.js";');
        } else if (target !== "__namespace" && target !== "__sideeffect") {
            lines.push(importline(target, [...importmap[target]], "core"));
        }
    }
    lines.push("");
    for (const entry of entries) lines.push(entry.text);
    fs.writeFileSync(path.join(rootdir, "src", "core", "namespace.js"), lines.join("\n") + "\n");
    return { imports: Object.keys(importmap).length, statements: entries.length };
}

function emitindex() {
    const lines = [];
    const indexorder = folders.slice().sort(importsort);
    for (const folder of indexorder) lines.push('import * as ' + folder + ' from "./' + folder + '/index.js";');
    lines.push('import { FaoxomJs } from "./core/facade.js";');
    lines.push('import "./core/namespace.js";');
    lines.push("var FAOXOM = {};");
    lines.push("var faoxomseen = {};");
    lines.push("var faoxomfolders = [" + folders.join(", ") + "];");
    lines.push("for (var faoxomfi = 0; faoxomfi < faoxomfolders.length; faoxomfi++) {");
    lines.push("    var faoxommod = faoxomfolders[faoxomfi];");
    lines.push("    var faoxomkeys = Object.getOwnPropertyNames(faoxommod);");
    lines.push("    for (var faoxomki = 0; faoxomki < faoxomkeys.length; faoxomki++) {");
    lines.push("        var faoxomkey = faoxomkeys[faoxomki];");
    lines.push('        if (faoxomkey === "default") continue;');
    lines.push("        if (!faoxomseen[faoxomkey]) { faoxomseen[faoxomkey] = true; FAOXOM[faoxomkey] = faoxommod[faoxomkey]; }");
    lines.push("    }");
    lines.push("}");
    lines.push("FAOXOM.FaoxomJs = FaoxomJs;");
    lines.push("var faoxomstat = Object.getOwnPropertyNames(FaoxomJs);");
    lines.push("for (var faoxomsi = 0; faoxomsi < faoxomstat.length; faoxomsi++) {");
    lines.push("    var faoxomsk = faoxomstat[faoxomsi];");
    lines.push('    if (faoxomsk === "length" || faoxomsk === "name" || faoxomsk === "prototype") continue;');
    lines.push("    if (!FAOXOM[faoxomsk]) FAOXOM[faoxomsk] = FaoxomJs[faoxomsk];");
    lines.push("}");
    lines.push('if (typeof window !== "undefined") { window.FAOXOM = FAOXOM; window.FaoxomJs = FaoxomJs; }');
    lines.push('else if (typeof globalThis !== "undefined") { globalThis.FAOXOM = FAOXOM; }');
    for (const folder of indexorder) lines.push('export * from "./' + folder + '/index.js";');
    lines.push("export { FaoxomJs, FAOXOM };");
    lines.push("export default FAOXOM;");
    fs.writeFileSync(path.join(rootdir, "src", "index.js"), lines.join("\n") + "\n");
}

function emittsl() {
    const nodenames = [...new Set(declaredorder)].filter(n => folderof(n) === "nodes");
    const matnames = [...new Set(declaredorder)].filter(n => folderof(n) === "materials" && /Node/.test(n));
    const lines = [];
    if (nodenames.length) lines.push('export { ' + nodenames.sort().join(", ") + ' } from "./nodes/index.js";');
    if (matnames.length) lines.push('export { ' + matnames.sort().join(", ") + ' } from "./materials/index.js";');
    fs.writeFileSync(path.join(rootdir, "src", "tsl.js"), lines.join("\n") + "\n");
}

let report = {};
let simconflicts = [];
let simround = 0;
while (simround < 40) {
    simround++;
    rebuildfolderstatements();
    report = {};
    for (const folder of folders) report[folder] = emitfolder(folder);
    report.facade = emitfacade();
    report.namespace = emitnamespace();
    emitindex();
    emittsl();
    simconflicts = simulate();
    if (!simconflicts.length) break;
    let movedthis = 0;
    for (const c of simconflicts) {
        if (!c.target) continue;
        if (!c.stmt.visited) c.stmt.visited = [c.stmt.folder];
        if (c.stmt.visited.indexOf(c.target) !== -1) continue;
        movelog.push("sim-internalize " + (c.stmt.names ? c.stmt.names[0] : "sideeffect" + statements.indexOf(c.stmt)) + ": " + c.stmt.folder + " -> " + c.target + (c.intra ? " (INTRA " + c.intra + ")" : ""));
        c.stmt.visited.push(c.target);
        c.stmt.folder = c.target;
        internalized++;
        movedthis++;
    }
    if (!movedthis) break;
}

fs.writeFileSync(path.join(rootdir, "tools", ".faoxombody.js"), statements.map(e => e.text).join("\n") + "\n");
fs.writeFileSync(path.join(rootdir, "tools", ".faoxomstatements.json"), JSON.stringify(statements.map(e => ({ text: e.text, names: e.names || [], folder: e.folder })), null, 0));
fs.writeFileSync(path.join(rootdir, "tools", ".faoxomnames.json"), JSON.stringify({ namefolder: namefolderfinal, declaredorder: [...new Set(declaredorder)] }));

const counts = {};
for (const entry of statements) counts[entry.folder] = (counts[entry.folder] || 0) + 1;
console.error('moves: ' + movelog.length + ' | sim internalized: ' + internalized + ' | sim rounds: ' + simround + ' | eval conflicts remaining: ' + (simconflicts.length ? JSON.stringify(simconflicts.map(c => (c.stmt.names ? c.stmt.names[0] : 'sideeffect') + (c.intra ? ' INTRA:' + c.intra : ' -> ' + c.target))) : 'none') + ' | runtime cycles: ' + remainingcycles.length);
const evalcycles = cycleedges.length ? cycleedges : "none";
console.log(JSON.stringify({ folders: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { exports: v.exports, imports: v.imports, size: v.size, statements: v.statements }])), evalcycles, statementcounts: counts, totalstatements: statements.length, totalnames: new Set(declaredorder).size }, null, 1));
