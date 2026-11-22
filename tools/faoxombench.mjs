import { performance } from "node:perf_hooks";

import {
    AdaptiveFrameBudget,
    VisibilityBudget,
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
