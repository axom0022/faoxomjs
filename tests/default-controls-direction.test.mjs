import assert from "node:assert/strict";
import { PerspectiveCamera } from "../src/camera/PerspectiveCamera.js";
import { OrbitControls } from "../src/camera/OrbitControls.js";
import { FirstPersonControls } from "../src/camera/FirstPersonControls.js";
import { PointerLockControls } from "../src/camera/PointerLockControls.js";

class Events {
  constructor(){this.handlers=new Map();this.pointerLockElement=null;}
  addEventListener(type,handler){if(!this.handlers.has(type))this.handlers.set(type,new Set());this.handlers.get(type).add(handler);}
  removeEventListener(type,handler){this.handlers.get(type)?.delete(handler);}
  dispatch(type,event={}){for(const handler of this.handlers.get(type)||[])handler({preventDefault(){},...event});}
  setPointerCapture(){}
  releasePointerCapture(){}
  requestPointerLock(){globalThis.document.pointerLockElement=this;globalThis.document.dispatch("pointerlockchange");}
}
const windowEvents=new Events(),documentEvents=new Events();globalThis.window=windowEvents;globalThis.document=documentEvents;documentEvents.body=new Events();documentEvents.exitPointerLock=()=>{documentEvents.pointerLockElement=null;documentEvents.dispatch("pointerlockchange");};

const element=new Events(),camera=new PerspectiveCamera(50,1,.1,100);camera.position.set(0,0,10);
const orbit=new OrbitControls(camera,element);assert.equal(orbit.invertX,false);assert.equal(orbit.invertY,false);assert.equal(orbit.invertZoom,false);
const theta=orbit.targetSpherical.theta,phi=orbit.targetSpherical.phi,radius=orbit.targetSpherical.radius;
element.dispatch("pointerdown",{button:0,clientX:0,clientY:0,pointerId:1});element.dispatch("pointermove",{clientX:20,clientY:20});assert.ok(orbit.targetSpherical.theta>theta,"right drag must orbit right by default");assert.ok(orbit.targetSpherical.phi>phi,"down drag must orbit down by default");windowEvents.dispatch("pointerup",{pointerId:1});
element.dispatch("wheel",{deltaY:100});assert.ok(orbit.targetSpherical.radius>radius,"wheel down must zoom out by default");
const panStart=orbit.target.clone();element.dispatch("pointerdown",{button:2,clientX:0,clientY:0,pointerId:2});element.dispatch("pointermove",{clientX:20,clientY:20});assert.ok(orbit.target.x>panStart.x,"right pan must move right by default");assert.ok(orbit.target.y<panStart.y,"down pan must move down by default");windowEvents.dispatch("pointerup",{pointerId:2});orbit.dispose();

const firstCamera=new PerspectiveCamera(),first=new FirstPersonControls(firstCamera,element);assert.equal(first.invertX,false);assert.equal(first.invertY,false);element.dispatch("mousemove",{buttons:1,movementX:10,movementY:10});assert.ok(first.yaw<0,"right mouse movement must look right by default");assert.ok(first.pitch<0,"down mouse movement must look down by default");first.dispose();

const lockCamera=new PerspectiveCamera(),locked=new PointerLockControls(lockCamera,element);assert.equal(locked.invertX,false);assert.equal(locked.invertY,false);documentEvents.pointerLockElement=element;documentEvents.dispatch("pointerlockchange");documentEvents.dispatch("mousemove",{movementX:10,movementY:10});assert.ok(locked.yaw<0,"pointer-lock right movement must look right by default");assert.ok(locked.pitch<0,"pointer-lock down movement must look down by default");locked.dispose();
console.log("Default control directions passed");
