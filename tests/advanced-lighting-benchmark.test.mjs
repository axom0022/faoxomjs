import assert from "node:assert/strict";
import fs from "node:fs";
const report=JSON.parse(fs.readFileSync(new URL("./advanced-lighting-benchmark-report.json",import.meta.url),"utf8"));
assert.equal(report.schemaVersion,1);assert.equal(report.trialCount,3);assert.equal(report.frames,8);assert.equal(report.warmup,3);assert.equal(report.pass.goalReached,true);assert.equal(report.aggregate.length,3);
const expected=new Map([["balanced-32-lights","40612006"],["hybrid-bvh-16-lights","c898bdbf"],["foveated-ultra-64-lights","99b89dc5"]]);
for(const scenario of report.aggregate){assert.ok(expected.has(scenario.name));assert.equal(scenario.crossTrialDeterministic,true);assert.deepEqual([...new Set(scenario.hashes)],[expected.get(scenario.name)]);assert.ok(scenario.queueCompletionMeanMs.every(Number.isFinite));assert.ok(scenario.encodeSubmitMeanMs.every(Number.isFinite));assert.ok(scenario.estimatedLightingBytes>0);}
for(const trial of report.trials){assert.equal(trial.pass.goalReached,true);assert.deepEqual(trial.errors,[]);assert.deepEqual(trial.consoleErrors,[]);for(const result of trial.results){assert.ok(result.outputNonzeroBytes>0);assert.equal(result.outputHash,result.replayHash);}}
console.log("Advanced lighting benchmark report passed");
