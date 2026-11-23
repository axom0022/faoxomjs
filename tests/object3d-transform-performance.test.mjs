import assert from "node:assert/strict";
import { Object3D } from "../src/core/Object3D.js";
import { Quaternion, Euler, Matrix4, Vector3 } from "../src/math/index.js";

const callbackQuaternion=new Quaternion();let callbacks=0;callbackQuaternion.onChange=()=>callbacks++;callbackQuaternion.set(.1,.2,.3,.9);assert.equal(callbacks,1,"Quaternion.set must emit one coherent change notification");callbackQuaternion.copy(new Quaternion());assert.equal(callbacks,2,"Quaternion.copy must emit one coherent change notification");

const object=new Object3D();
object.rotation.x=.3;object.rotation.y=-.2;object.rotation.z=.5;
const before=object._transformVersion;object.updateMatrix();
assert.equal(object._transformVersion,before+1,"one logical transform change must produce one version change");
const expected=new Quaternion().setFromEuler(new Euler(.3,-.2,.5,"XYZ"));
assert.ok(Math.abs(object.quaternion.x-expected.x)<1e-12);
assert.ok(Math.abs(object.quaternion.y-expected.y)<1e-12);
assert.ok(Math.abs(object.quaternion.z-expected.z)<1e-12);
assert.ok(Math.abs(object.quaternion.w-expected.w)<1e-12);
assert.equal(object.rotation.x,.3,"Euler values must not be rewritten through a redundant quaternion round trip");
const reference=new Matrix4().makeRotationFromQuaternion(object.quaternion),re=reference.elements;for(const index of [0,1,2])re[index]*=object.scale.x;for(const index of [4,5,6])re[index]*=object.scale.y;for(const index of [8,9,10])re[index]*=object.scale.z;re[12]=object.position.x;re[13]=object.position.y;re[14]=object.position.z;assert.deepEqual(Array.from(object.matrix.elements),Array.from(reference.elements),"inlined composition must preserve matrix semantics");
object.updateMatrix();assert.equal(object._transformVersion,before+1,"unchanged transforms must remain clean");
object.quaternion.setFromEuler(new Euler(.1,.2,.3));assert.ok(Math.abs(object.rotation.x-.1)<1e-12,"direct quaternion updates must continue synchronizing Euler state");
console.log("Object3D transform synchronization passed");
