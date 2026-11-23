import { performance } from "node:perf_hooks";

import {
    AdaptiveFrameBudget,
    VisibilityBudget,
    ArchetypeWorld,
    CapabilityProfile,
    Engine,
    FeatureManifest,
    PersistentGPUScene,
    BindlessMaterialTable,
    RuntimeQualityContract,
    CounterfactualRenderer,
    GPUResidencyManager2,
    CausalFrameGraph,
    UnifiedSpatialDatabase,
    WorldPartition,
    PredictiveStreamer,
    OriginHierarchy,
    GeometryPageCodec,
    RuntimeGeometryCache,
    VirtualGeometryAsset,
    VirtualGeometrySelector,
    VertexPullingStore,
    IndirectCommandStream,
    BoxGeometry,
    DirectionalLight,
    Group,
    InstancedMesh,
    Matrix4,
    Mesh,
    PerspectiveCamera,
    PhysicsWorld,
    PhysicalMaterial,
    PlaneGeometry,
    RigidBody,
    Scene,
    SphereGeometry,
    Vector3,
    backendFeatures,
    createComposer,
    featureGaps,
    missingPasses,
    passParity,
    tsl,
    NodeMaterial
} from "../src/index.js";

const results = [];

function measure(name, group, iterations, run) {
    var started = performance.now();
    var units = 0;
    var error = null;
    try {
        units = run() || 0;
    } catch (cause) {
        error = cause && cause.message ? cause.message : String(cause);
    }
    var elapsed = performance.now() - started;
    results.push({
        name: name,
        group: group,
        iterations: iterations,
        units: units,
        ms: Number(elapsed.toFixed(3)),
        perUnitMs: units > 0 ? Number((elapsed / units).toFixed(6)) : null,
        ok: error === null,
        error: error
    });
}

function bytesOfGeometry(geometry) {
    if (!geometry || !geometry.attributes) return 0;
    var names = Object.keys(geometry.attributes);
    var total = 0;
    for (var index = 0; index < names.length; index++) {
        var attribute = geometry.attributes[names[index]];
        if (attribute && attribute.array) total += attribute.array.byteLength;
    }
    if (geometry.index && geometry.index.byteLength) total += geometry.index.byteLength;
    return total;
}

measure("geometry.box", "geometry", 2000, function() {
    var total = 0;
    for (var index = 0; index < 2000; index++) {
        var geometry = new BoxGeometry(1, 1, 1);
        total += bytesOfGeometry(geometry);
    }
    return 2000;
});

measure("geometry.sphere", "geometry", 500, function() {
    var total = 0;
    for (var index = 0; index < 500; index++) total += bytesOfGeometry(new SphereGeometry(1, 32, 16));
    return 500;
});

measure("geometry.plane32k", "geometry", 100, function() {
    var total = 0;
    for (var index = 0; index < 100; index++) total += bytesOfGeometry(new PlaneGeometry(100, 100, 128, 128));
    return 100;
});

measure("instancing.20000", "instancing", 20000, function() {
    var mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new PhysicalMaterial(), 20000);
    var matrix = new Matrix4();
    for (var index = 0; index < 20000; index++) {
        matrix.elements[12] = (index % 200) * 2;
        matrix.elements[13] = Math.floor(index / 200) * 2;
        matrix.elements[14] = 0;
        mesh.setMatrixAt(index, matrix);
    }
    return 20000;
});

measure("scene.updateMatrixWorld", "traversal", 20000, function() {
    var scene = new Scene();
    var group = new Group();
    scene.add(group);
    for (var index = 0; index < 20000; index++) {
        var mesh = new Mesh(new BoxGeometry(1, 1, 1), new PhysicalMaterial());
        mesh.position.set(index % 100, 0, Math.floor(index / 100));
        group.add(mesh);
    }
    scene.updateMatrixWorld(true);
    return 20000;
});

measure("scene.traverseVisible", "traversal", 20000, function() {
    var scene = new Scene();
    for (var index = 0; index < 20000; index++) {
        var mesh = new Mesh(new BoxGeometry(1, 1, 1), new PhysicalMaterial());
        scene.add(mesh);
    }
    var visited = 0;
    scene.traverseVisible(function() {
        visited++;
    });
    return visited;
});

measure("camera.projection", "camera", 5000, function() {
    var camera = new PerspectiveCamera(60, 16 / 9, .1, 5000);
    for (var index = 0; index < 5000; index++) {
        camera.fov = 40 + index % 60;
        camera.updateProjectionMatrix();
    }
    return 5000;
});

measure("physics.500boxes.60steps", "physics", 60, function() {
    var world = new PhysicsWorld({
        gravity: [ 0, -9.81, 0 ],
        iterations: 6
    });
    for (var index = 0; index < 500; index++) {
        var body = new RigidBody({
            mass: 1,
            position: new Vector3((index % 25) - 12, 10 + Math.floor(index / 25), (index % 7) - 3)
        });
        world.addBody(body);
    }
    for (var step = 0; step < 60; step++) world.step(1 / 60);
    return 60;
});

measure("physics.singleStep1200bodies", "physics", 1, function() {
    var world = new PhysicsWorld({
        gravity: [ 0, -9.81, 0 ],
        iterations: 4
    });
    for (var index = 0; index < 1200; index++) {
        world.addBody(new RigidBody({
            mass: 1,
            position: new Vector3((index % 40) - 20, Math.floor(index / 40), (index % 3) - 1)
        }));
    }
    world.step(1 / 60);
    return 1200;
});

measure("lighting.scene8lights", "lighting", 100, function() {
    var scene = new Scene();
    for (var index = 0; index < 8; index++) {
        var light = new DirectionalLight(16777215, 1);
        light.position.set(index, 10, index * 2);
        scene.add(light);
    }
    for (var mesh = 0; mesh < 2000; mesh++) scene.add(new Mesh(new BoxGeometry(1, 1, 1), new PhysicalMaterial()));
    return 2000;
});

measure("nodes.tslgraph", "shading", 200, function() {
    var material = new NodeMaterial({
        colorNode: tsl.mix(tsl.vec3(0.1, 0.4, 0.9), tsl.vec3(0.9, 0.3, 0.1), tsl.noise2d(6)),
        roughnessNode: tsl.clamp(tsl.noise2d(3), .1, 1)
    });
    for (var index = 0; index < 200; index++) material.compileShader("glsl");
    for (var wgsl = 0; wgsl < 200; wgsl++) material.compileShader("wgsl");
    return 400;
});

measure("virtualGeometry.hierarchy", "world", 8192, function() {
    var asset = new VirtualGeometryAsset("bench-virtual", { maxTriangles: 64 });
    asset.addLevel(new PlaneGeometry(100, 100, 4, 4), 12);
    asset.addLevel(new PlaneGeometry(100, 100, 16, 16), 3);
    asset.addLevel(new PlaneGeometry(100, 100, 64, 64), 0);
    asset.build();
    if (asset.stats.levels !== 3) throw new Error("virtual hierarchy level mismatch");
    return asset.stats.triangles;
});

measure("spatial.index100000", "world", 100000, function() {
    var spatial = new UnifiedSpatialDatabase({ cellSizes: [ 32, 128, 512, 2048 ] });
    for (var index = 0; index < 100000; index++) {
        var x = index % 500;
        var z = Math.floor(index / 500);
        spatial.insert(index, { min: [ x, 0, z ], max: [ x + .5, 1, z + .5 ] }, { type: "object" });
    }
    for (var query = 0; query < 100; query++) spatial.querySphere([ query * 3, 0, query ], 20);
    return spatial.records.size;
});

measure("geometry.compress100000", "world", 100000, function() {
    var count = 100000;
    var positions = new Float32Array(count * 3);
    var normals = new Float32Array(count * 3);
    var uvs = new Float32Array(count * 2);
    for (var index = 0; index < count; index++) {
        positions[index * 3] = index % 500;
        positions[index * 3 + 1] = Math.sin(index * .01) * 10;
        positions[index * 3 + 2] = Math.floor(index / 500);
        normals[index * 3 + 1] = 1;
        uvs[index * 2] = index % 500 / 499;
        uvs[index * 2 + 1] = Math.floor(index / 500) / 199;
    }
    var page = GeometryPageCodec.encode({ attributes: { position: { array: positions }, normal: { array: normals }, uv: { array: uvs } } });
    var decoded = GeometryPageCodec.decode(page);
    if (decoded.vertexCount !== count) throw new Error("geometry page count mismatch");
    return count;
});

measure("gpuScene.register200000", "runtime", 200000, function() {
    var scene = new PersistentGPUScene(null, { capacity: 1024 });
    for (var index = 0; index < 200000; index++) scene.create({
        geometry: index % 128,
        material: index % 32,
        bounds: [ index % 500, 0, Math.floor(index / 500), 1 ],
        importance: 1
    });
    return scene.aliveCount;
});

measure("materials.table20000", "runtime", 20000, function() {
    var materials = new BindlessMaterialTable(null, { capacity: 256 });
    for (var index = 0; index < 20000; index++) materials.create({
        color: [ (index % 255) / 255, .5, 1 ],
        roughness: (index % 100) / 100,
        metalness: index % 2,
        kernel: index % 8
    });
    return materials.count;
});

measure("ecs.archetype100000", "runtime", 100000, function() {
    var world = new ArchetypeWorld({ initialCapacity: 1024 });
    world.defineComponent("Transform", { fields: { position: { type: "f32", length: 3 } } });
    world.defineComponent("Velocity", { fields: { value: { type: "f32", length: 3 } } });
    for (var index = 0; index < 100000; index++) world.create({
        Transform: { position: [ index, 0, 0 ] },
        Velocity: { value: [ 1, 0, 0 ] }
    });
    var query = world.query([ "Transform", "Velocity" ]);
    query.forEach(function(entity, columns, row) {
        var offset = row * 3;
        columns.Transform.position[offset] += columns.Velocity.value[offset];
    });
    return query.count();
});

measure("runtime.engine600ticks", "runtime", 600, function() {
    var profile = CapabilityProfile.classify({ memoryGb: 8, cores: 8, webgpu: true, sharedMemory: true });
    var engine = new Engine({ profile: profile, fixedDelta: 1 / 60, maxSubsteps: 4, quality: null });
    var ticks = 0;
    engine.registerSystem("simulation", { fixedUpdate: function() { ticks++; } });
    for (var frame = 0; frame <= 600; frame++) engine.step(frame / 60);
    return ticks;
});

var manifest = new FeatureManifest;
manifest.register("runtime", { version: "8", estimatedBytes: 1 });
manifest.register("world", { version: "8", dependencies: [ "runtime" ], estimatedBytes: 1 });
var qualityContract = new RuntimeQualityContract({ targetFps: 60, p95FrameMs: 16.67, maxDrawCalls: 1000 });
for (var contractFrame = 0; contractFrame < 120; contractFrame++) qualityContract.sample({ fps: 62, frameMs: 15 + (contractFrame % 5) * .1, drawCalls: 800 });
var counterfactual = new CounterfactualRenderer;
var counterfactualChoice = counterfactual.choose(
    { frameMs: 20, resolutionScale: 1, triangles: 8000000, drawCalls: 1300 },
    [
        { name: "resolution", resolutionScale: .75, triangles: 8000000, drawCalls: 1300, visualCost: .3 },
        { name: "geometry", resolutionScale: 1, triangles: 4000000, drawCalls: 900, visualCost: .2 }
    ],
    16.67
);
var residency = new GPUResidencyManager2({ budgetBytes: 100 });
residency.register("critical", { bytes: 70, resident: true, pinned: true });
residency.register("optional", { bytes: 70, resident: true, importance: .1 });
residency.enforce();
var causal = new CausalFrameGraph;
causal.addBuffer("lighting", { size: 64 });
causal.importBuffer("output", {});
causal.addCausalPass("lighting", { writes: [ "lighting" ], sideEffect: true, causes: [ "visible lights" ] });
causal.addCausalPass("present", { reads: [ "lighting" ], writes: [ "output" ], causes: [ "final output" ] });
causal.compile();
var runtimeFoundation = {
    capabilityProfiles: [ "compatibility", "mobile-low", "mobile-high", "desktop-integrated", "desktop-discrete", "workstation", "xr" ],
    featureOrder: manifest.resolve("world"),
    ecsSharedMemoryAvailable: typeof SharedArrayBuffer !== "undefined",
    qualityContract: qualityContract.report(),
    counterfactualChoice: counterfactualChoice,
    residency: residency.report(),
    causalFrameGraph: { order: causal.compiledOrder(), aliases: causal.aliasMap(), explanation: causal.explain("present") }
};

var worldSpatial = new UnifiedSpatialDatabase({ cellSizes: [ 32, 128, 512 ] });
for (var worldIndex = 0; worldIndex < 1000; worldIndex++) worldSpatial.insert(worldIndex, { min: [ worldIndex % 100, 0, Math.floor(worldIndex / 100) ], max: [ worldIndex % 100 + 1, 1, Math.floor(worldIndex / 100) + 1 ] }, { type: "benchmark" });
var worldHits = worldSpatial.querySphere([ 50, 0, 5 ], 10, { type: "benchmark" });
var origins = new OriginHierarchy;
origins.define("region", "global", [ 1000000000, 0, 1000000000 ]);
origins.define("local", "region", [ 100, 0, 100 ]);
var originRoundTrip = origins.convert("global", "local", [ 1000000110, 2, 1000000120 ]);
var prediction = new PredictiveStreamer().predict({ x: 0, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, [ { type: "objective", position: { x: 500, y: 0, z: 500 }, weight: 1 } ]);
var virtualAsset = new VirtualGeometryAsset("world-benchmark", { maxTriangles: 64 });
virtualAsset.addLevel(new PlaneGeometry(100, 100, 4, 4), 12);
virtualAsset.addLevel(new PlaneGeometry(100, 100, 16, 16), 3);
virtualAsset.addLevel(new PlaneGeometry(100, 100, 64, 64), 0);
virtualAsset.build();
var virtualSelector = new VirtualGeometrySelector({ pixelError: 1, maxTriangles: 10000000 });
var virtualSelection = virtualSelector.select(virtualAsset, { camera: [ 0, 20, 20 ], viewportHeight: 1080, fov: 60 });
var vertexStore = new VertexPullingStore;
virtualAsset.pages.forEach(function(page) { vertexStore.addPage(page.id, GeometryPageCodec.decode(page.encoded)); });
var indirectCommands = new IndirectCommandStream({ maxCommands: 10000 }).build(virtualSelection.selected, vertexStore.pages, 10000000, 10000);
var worldFoundation = {
    spatialHits: worldHits.length,
    spatial: worldSpatial.report(),
    originRoundTrip: Array.from(originRoundTrip),
    predictionPoints: prediction.length,
    originHierarchy: origins.serialize(),
    virtualGeometry: { asset: virtualAsset.report(), selection: Object.assign({}, virtualSelection.stats), vertexStore: vertexStore.report(), indirect: Object.assign({}, indirectCommands.stats) }
};

var adaptiveDecisions = [];
var adaptive = new AdaptiveFrameBudget({
    targetFps: 60,
    profile: { memoryGb: 8, cores: 8, mobile: false, className: "benchmark", baseTriangles: 8000000, baseDrawCalls: 1200 },
    degradeFrames: 4,
    upgradeFrames: 20,
    cooldownFrames: 2,
    onChange: function(quality, previous, level, reason, controller) {
        adaptiveDecisions.push({
            frame: controller.stats.frames,
            from: previous,
            to: level,
            reason: reason,
            fps: Number(controller.stats.fps.toFixed(2)),
            frameMs: Number(controller.stats.frameMs.toFixed(3)),
            triangleBudget: quality.triangleBudget,
            drawCallBudget: quality.drawCallBudget
        });
    }
});

var deterministicFrames = [];
for (var adaptiveFrame = 0; adaptiveFrame < 420; adaptiveFrame++) {
    var phase = adaptiveFrame < 60 ? 11.8 : adaptiveFrame < 130 ? 24.5 : adaptiveFrame < 175 ? 17.2 : 9.8;
    var jitter = ((adaptiveFrame * 17 + 11) % 13 - 6) * .11;
    var triangleLoad = adaptiveFrame < 60 ? 3600000 : adaptiveFrame < 130 ? 10500000 : adaptiveFrame < 175 ? 6200000 : 600000;
    var drawLoad = adaptiveFrame < 60 ? 520 : adaptiveFrame < 130 ? 1650 : adaptiveFrame < 175 ? 980 : 100;
    var frameMs = phase + jitter;
    adaptive.sample({ frameMs: frameMs, gpuMs: frameMs * .72, triangles: triangleLoad, drawCalls: drawLoad });
    deterministicFrames.push(frameMs);
}

var visibilityGeometry = { index: { count: 15000 } };
var visibilityObjects = [];
for (var visibilityIndex = 0; visibilityIndex < 5000; visibilityIndex++) {
    visibilityObjects.push({
        geometry: visibilityGeometry,
        position: { x: visibilityIndex % 100, y: 0, z: Math.floor(visibilityIndex / 100) },
        userData: { importance: 1 + visibilityIndex % 5 * .1 },
        visible: true
    });
}
var visibility = new VisibilityBudget().applyFrameBudget(adaptive);
var visibleObjects = visibility.select(visibilityObjects, { position: { x: 50, y: 2, z: 0 } }, false);
var deterministicTotal = deterministicFrames.reduce(function(total, value) { return total + value; }, 0);
var deterministicSorted = deterministicFrames.slice().sort(function(a, b) { return a - b; });
var adaptiveReport = adaptive.report();
var adaptiveBenchmark = {
    seed: 1717,
    frames: deterministicFrames.length,
    averageFrameMs: Number((deterministicTotal / deterministicFrames.length).toFixed(3)),
    fps: Number((deterministicFrames.length * 1000 / deterministicTotal).toFixed(2)),
    p95FrameMs: Number(deterministicSorted[Math.floor(deterministicSorted.length * .95)].toFixed(3)),
    visibleTriangles: visibility.stats.triangles,
    drawCalls: visibility.stats.drawCalls,
    candidates: visibility.stats.candidates,
    selectedObjects: visibleObjects.length,
    finalQualityLevel: adaptiveReport.level,
    finalQuality: adaptiveReport.quality,
    adaptiveDecisions: adaptiveDecisions
};

var memory = process.memoryUsage();

var backendReport = {
    webgl: backendFeatures("webgl"),
    webgpu: backendFeatures("webgpu"),
    gaps: featureGaps(),
    passes: passParity(),
    missingOnWebGPU: missingPasses("webgpu")
};

var report = {
    tool: "faoxombench",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    timestamp: new Date().toISOString(),
    unsupported: [
        "gpu.compute",
        "gpu.drawCalls",
        "gpu.timestamps"
    ],
    note: "gpu timings need a WebGPU device, run headless via HeadlessRenderer in a browser or Node with Dawn",
    backends: backendReport,
    adaptive: adaptiveBenchmark,
    runtimeFoundation: runtimeFoundation,
    worldFoundation: worldFoundation,
    memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external
    },
    results: results,
    totals: results.reduce(function(accumulator, entry) {
        accumulator[entry.group] = Number(((accumulator[entry.group] || 0) + entry.ms).toFixed(3));
        return accumulator;
    }, {})
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");

if (results.some(function(entry) {
    return !entry.ok;
})) process.exitCode = 1;
