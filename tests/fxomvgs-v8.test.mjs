import assert from "node:assert/strict";

import { BoxGeometry } from "../src/geometries/BoxGeometry.js";
import { FXOMVGS } from "../src/extras/FXOMVGS.js";
import { VirtualGeometryVisibilityPipeline, virtualGeometryCullWGSL, virtualGeometryVisibilityWGSL } from "../src/renderers/VirtualGeometryVisibilityPipeline.js";
import { VirtualGeometryGPUHierarchy, virtualGeometryHierarchyWGSL } from "../src/renderers/VirtualGeometryGPUHierarchy.js";

const geometry = new BoxGeometry(2, 2, 2, 8, 8, 8);
const visibility = new VirtualGeometryVisibilityPipeline(null, { maxCandidates: 4096 });
const virtual = new FXOMVGS(geometry, {
    id: "fxomvgs-v8-test",
    visibilityPipeline: visibility,
    maxTriangles: 32,
    groupSize: 4,
    maxLevels: 8,
    pixelError: 2,
    budgetBytes: 16 * 1024 * 1024
});

assert.ok(virtual.stats.levels > 1, "automatic simplification should produce a hierarchy");
assert.equal(virtual.pages.size, virtual.stats.levels, "every hierarchy level should have one compressed page");
assert.ok(virtual.runtimeStats.compressedBytes > 0, "compressed pages should contain data");
assert.ok(virtual.clusters.every(cluster => cluster.pageId && cluster.pageFirst >= 0), "clusters should reference page-local ranges");

await virtual.prepare();
const rootLevel = virtual.stats.levels - 1;
assert.equal(virtual.resident(`${virtual.id}:level:${rootLevel}`), true, "coarse root page should be resident");

let result = await virtual.update([0, 0, 8], {
    backend: "cpu",
    viewportHeight: 1080,
    pixelError: 2,
    maxClusters: 4096,
    maxTriangles: 100000,
    drawCallBudget: 4096
});
assert.ok(result.selected.length > 0, "resident-parent fallback should keep geometry visible");
assert.equal(result.commands.count, result.selected.length, "selected clusters should produce indirect commands");
assert.equal(visibility.candidateCount, result.selected.length, "FXOMVGS should feed the multi-stage visibility pipeline directly");
assert.equal(visibility.cpuCandidates.byteLength, result.selected.length * 64, "visibility candidates should use the fixed GPU record layout");
assert.match(virtualGeometryCullWGSL, /drawIndirect|DrawIndirect/);
assert.match(virtualGeometryVisibilityWGSL, /drawIndex/);
assert.match(virtualGeometryHierarchyWGSL, /projectedError/);
const gpuHierarchy = visibility.enableGPUHierarchy();
assert.ok(gpuHierarchy instanceof VirtualGeometryGPUHierarchy);
assert.equal(gpuHierarchy.geometry, virtual);
assert.ok(result.requests.length > 0, "fine pages should be requested lazily");

await Promise.all(result.requests.map(id => virtual.requestPage(id, { reason: "test-refinement" })));
result = await virtual.update([0, 0, 8], {
    backend: "cpu",
    viewportHeight: 1080,
    pixelError: 2,
    triangleBudget: 100000,
    drawCallBudget: 1
});
assert.equal(result.commands.count, 1, "draw-call budgets should constrain indirect output");
assert.ok(virtual.store.vertexCount > 0 && virtual.store.indexCount > 0, "resident pages should enter shared vertex-pulling storage");
assert.equal(result.layout.index.format, "uint32", "vertex-pulling shader layout should be available");

const second = virtual.addInstance({ id: "second", position: { x: 5, y: 0, z: 0 } });
assert.equal(second.id, "second");
result = await virtual.update([0, 0, 8], { backend: "cpu", viewportHeight: 1080, pixelError: 4 });
assert.ok(result.selected.some(entry => entry.instance === 1), "CPU fallback should select translated instances");
assert.equal(virtual.report().instances, 2);
assert.equal(virtual.removeInstance("second"), true);

virtual.compact();
assert.equal(virtual.pageRecords.size, virtual.store.pages.size, "compaction should preserve page records");

const rootBytes = virtual.pages.get(`${virtual.id}:level:${rootLevel}`).encoded.byteLength;
virtual.setByteBudget(rootBytes);
virtual.residency.update();
assert.equal(virtual.resident(`${virtual.id}:level:${rootLevel}`), true, "the root fallback page should remain pinned under pressure");

const report = virtual.report();
assert.ok(report.residency.categories["geometry-page"].registered === virtual.pages.size);
assert.ok(report.cache.entries > 0);
assert.ok(report.commands.commands >= 0);

virtual.dispose();
visibility.dispose();
assert.equal(virtual.pages.size, 0);

console.log("FXOMVGS v8 integration passed");
