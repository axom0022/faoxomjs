import assert from "node:assert/strict";
import { AdvancedLightingQualityController, DEFAULT_LIGHTING_LEVELS } from "../src/renderers/AdvancedLightingQualityController.js";

const makePipeline=()=>({
  directLighting:{},diffuseGI:{},giDenoiser:{},reflections:{},rayBridge:{},
  foveation:{peripheralQuality:0,mapScale:1,width:4,height:4}
});
const contract={calls:0,sample(metrics){this.calls++;return{ok:metrics.frameMs<20,violations:metrics.frameMs<20?[]:[{metric:"frameMs"}]};}};
const pipeline=makePipeline();let scales=[];
const controller=new AdvancedLightingQualityController(pipeline,{level:4,degradeFrames:2,upgradeFrames:2,cooldownFrames:0,alpha:1,contract,onResolutionScale:scale=>scales.push(scale)});
assert.equal(controller.current().name,"ultra");assert.equal(pipeline.directLighting.candidates,8);assert.equal(pipeline.diffuseGI.samples,4);assert.equal(pipeline.giDenoiser.iterations,4);assert.equal(pipeline.reflections.maxSteps,56);assert.equal(pipeline.foveation.mapScale,.5);
controller.sample({frameMs:30,gpuMs:28}).sample({frameMs:30,gpuMs:28});
assert.equal(controller.level,3,"sustained pressure should degrade one level");assert.equal(controller.report().stats.downgrades,1);assert.ok(controller.report().stats.contractViolations>=2);
controller.forceLevel(1);assert.equal(controller.manual,true);for(let i=0;i<10;i++)controller.sample({frameMs:40});assert.equal(controller.level,1,"manual level must remain stable");controller.releaseAuto();
const state=controller.serialize();assert.equal(state.version,1);assert.equal(state.level,1);assert.ok(scales.length>=2);

const upgradePipeline=makePipeline();const upgrade=new AdvancedLightingQualityController(upgradePipeline,{level:1,degradeFrames:2,upgradeFrames:2,cooldownFrames:0,alpha:1});upgrade.sample({frameMs:5}).sample({frameMs:5});assert.equal(upgrade.level,2,"sustained headroom should upgrade one level");assert.equal(upgrade.report().stats.upgrades,1);
upgrade.restore({version:1,level:3,manual:true});assert.equal(upgrade.level,3);assert.equal(upgrade.manual,true);assert.throws(()=>upgrade.restore({version:2}),/Unsupported/);
assert.equal(DEFAULT_LIGHTING_LEVELS.length,5);assert.deepEqual(DEFAULT_LIGHTING_LEVELS.map(x=>x.name),["minimum","low","medium","high","ultra"]);
controller.reset();assert.equal(controller.report().stats.frames,0);controller.dispose();assert.equal(controller.disposed,true);
console.log("Advanced lighting quality controller passed");
