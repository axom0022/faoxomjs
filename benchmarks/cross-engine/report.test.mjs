import assert from "node:assert/strict";
import fs from "node:fs";
const report=JSON.parse(fs.readFileSync(new URL("./report.json",import.meta.url)));
assert.equal(report.suite,"faoxomjs-cross-engine");assert.equal(report.schemaVersion,1);assert.equal(report.protocol.trials,3);assert.deepEqual(report.protocol.engines,["faoxomjs","threejs","babylonjs"]);assert.equal(report.pass,true);assert.equal(report.visualEquivalence.pass,true);assert.ok(report.visualEquivalence.maximumRatio<=1.1);
for(const row of report.aggregates){assert.equal(row.pass,true,row.engine);assert.equal(row.trials,3);assert.equal(row.errors.length,0);assert.ok(Number.isFinite(row.frameMeanMs.mean)&&row.frameMeanMs.mean>0);assert.ok(Number.isFinite(row.transformMeanMs.mean)&&row.transformMeanMs.mean>0);assert.ok(row.coveredPixels.every(value=>value>100));assert.equal(row.hashes.length,1,`${row.engine} output must be deterministic`);}
for(const result of report.results){assert.equal(result.pass,true,result.engine);assert.equal(result.errors.length,0);assert.equal(result.consoleErrors.length,0);assert.ok(result.image.coveredPixels>100);}
console.log("Cross-engine benchmark report passed");
