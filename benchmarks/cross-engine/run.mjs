import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"../..");
const output=path.resolve(root,process.argv[2]||"benchmarks/cross-engine/report.json");
const trials=Number(process.env.TRIALS||3),engines=["faoxomjs","threejs","babylonjs"];
const types={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".wasm":"application/wasm"};
const server=http.createServer((request,response)=>{const pathname=decodeURIComponent(new URL(request.url,"http://localhost").pathname);const file=path.resolve(root,"."+pathname);if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){response.writeHead(404);response.end("not found");return;}response.setHeader("content-type",types[path.extname(file)]||"application/octet-stream");fs.createReadStream(file).pipe(response);});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const port=server.address().port;
const browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-unsafe-webgpu","--disable-gpu-sandbox","--js-flags=--expose-gc"]});
const results=[];
try{
  for(let trial=0;trial<trials;trial++)for(const engine of engines){
    const context=await browser.newContext({viewport:{width:320,height:320}});const page=await context.newPage();const consoleErrors=[];page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});page.on("pageerror",error=>consoleErrors.push(error.stack||error.message));
    await page.goto(`http://127.0.0.1:${port}/benchmarks/cross-engine/index.html?engine=${engine}`,{waitUntil:"load"});
    await page.waitForFunction(()=>window.__BENCHMARK_RESULT__,null,{timeout:120000});const result=await page.evaluate(()=>window.__BENCHMARK_RESULT__);result.trial=trial+1;result.consoleErrors=consoleErrors;result.pass=!!result.pass&&consoleErrors.length===0;results.push(result);console.log(`${engine} trial ${trial+1}: ${result.pass?"pass":"FAIL"} frame=${result.frame?.mean?.toFixed(3)??"n/a"}ms transform=${result.transform?.mean?.toFixed(3)??"n/a"}ms calls=${result.drawCalls??"n/a"}`);await context.close();
  }
}finally{await browser.close();server.close();}
function aggregate(engine){const rows=results.filter(result=>result.engine===engine),metric=name=>{const values=rows.map(row=>name.split(".").reduce((value,key)=>value?.[key],row)).filter(Number.isFinite);return{min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length};};return{engine,pass:rows.every(row=>row.pass),trials:rows.length,importMs:metric("importMs"),setupMs:metric("setupMs"),frameMeanMs:metric("frame.mean"),frameP95Ms:metric("frame.p95"),transformMeanMs:metric("transform.mean"),drawCalls:[...new Set(rows.map(row=>row.drawCalls))],coveredPixels:[...new Set(rows.map(row=>row.image?.coveredPixels))],hashes:[...new Set(rows.map(row=>row.image?.hash))],errors:rows.flatMap(row=>[...(row.errors||[]),...(row.consoleErrors||[])])};}
const report={suite:"faoxomjs-cross-engine",schemaVersion:1,date:process.env.BENCHMARK_DATE||new Date().toISOString(),environment:{browser:"Chromium",gpu:"SwiftShader",timing:"performance.now around render plus WebGL finish",note:"This deterministic software-renderer protocol does not predict universal physical-GPU performance."},protocol:{trials,engines,objects:400,transforms:10000,warmup:8,frames:24,resolution:[256,256]},aggregates:engines.map(aggregate),results};const coverageMeans=report.aggregates.map(row=>row.coveredPixels.reduce((a,b)=>a+b,0)/row.coveredPixels.length);report.visualEquivalence={coverageMeans,maximumRatio:Math.max(...coverageMeans)/Math.min(...coverageMeans),threshold:1.1};report.visualEquivalence.pass=report.visualEquivalence.maximumRatio<=report.visualEquivalence.threshold;report.pass=report.aggregates.every(row=>row.pass&&row.errors.length===0)&&report.visualEquivalence.pass;fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+"\n");console.log(`wrote ${path.relative(root,output)} pass=${report.pass}`);if(!report.pass)process.exitCode=1;
