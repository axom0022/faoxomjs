import { faoxominverseinertia, faoxomshapeextents } from "../core/index.js";
import { Ray, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";
import { faoxomcollisioncontact } from "./faoxomcollisioncontact.js";

class PhysicsWorld {
    constructor(options) { options = options || {}; var faoxomgravity = options.gravity; if (faoxomgravity) { if (faoxomgravity.clone) this.gravity = faoxomgravity.clone(); else this.gravity = new Vector3(faoxomgravity[0] !== undefined ? faoxomgravity[0] : (faoxomgravity.x || 0), faoxomgravity[1] !== undefined ? faoxomgravity[1] : (faoxomgravity.y || 0), faoxomgravity[2] !== undefined ? faoxomgravity[2] : (faoxomgravity.z || 0)); } else this.gravity = new Vector3(0, -9.81, 0); this.fixedTimeStep = faoxomvalue(options.fixedTimeStep, 1 / 60); this.maxSubSteps = Math.max(1, Math.floor(faoxomvalue(options.maxSubSteps, 8))); this.accumulator = 0; this.bodies = []; this.controllers = []; this.constraints = []; this.vehicles = []; this.softBodies = []; this.fluids = []; this.ragdolls = []; this.time = 0; this.broadphase = options.broadphase || "aabb"; this.broadphaseCellSize = Math.max(0.1, faoxomvalue(options.broadphaseCellSize, 4)); this.iterations = Math.max(1, Math.floor(faoxomvalue(options.iterations, 6))); this.onCollision = null; }
    addBody(body) { if (this.bodies.indexOf(body) === -1) this.bodies.push(body); return body; }
    removeBody(body) { var i = this.bodies.indexOf(body); if (i !== -1) this.bodies.splice(i, 1); }
    addController(controller) { if (this.controllers.indexOf(controller) === -1) this.controllers.push(controller); return controller; }
    removeController(controller) { var i = this.controllers.indexOf(controller); if (i !== -1) this.controllers.splice(i, 1); }
    addConstraint(constraint) { if (this.constraints.indexOf(constraint) === -1) this.constraints.push(constraint); return constraint; }
    removeConstraint(constraint) { var i = this.constraints.indexOf(constraint); if (i !== -1) this.constraints.splice(i, 1); }
    addVehicle(vehicle) { if (this.vehicles.indexOf(vehicle) === -1) this.vehicles.push(vehicle); return vehicle; }
    removeVehicle(vehicle) { var i = this.vehicles.indexOf(vehicle); if (i !== -1) this.vehicles.splice(i, 1); }
    addSoftBody(softBody) { if (this.softBodies.indexOf(softBody) === -1) this.softBodies.push(softBody); return softBody; }
    removeSoftBody(softBody) { var i = this.softBodies.indexOf(softBody); if (i !== -1) this.softBodies.splice(i, 1); return softBody; }
    addFluid(fluid) { if (this.fluids.indexOf(fluid) === -1) this.fluids.push(fluid); return fluid; }
    removeFluid(fluid) { var i = this.fluids.indexOf(fluid); if (i !== -1) this.fluids.splice(i, 1); return fluid; }
    addRagdoll(ragdoll) { if (this.ragdolls.indexOf(ragdoll) === -1) this.ragdolls.push(ragdoll); return ragdoll; }
    removeRagdoll(ragdoll) { var i = this.ragdolls.indexOf(ragdoll); if (i !== -1) this.ragdolls.splice(i, 1); return ragdoll; }
    step(delta) { this.accumulator += Math.min(Math.max(delta || 0, 0), 0.5); var steps = 0; while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) { this.singleStep(this.fixedTimeStep); this.accumulator -= this.fixedTimeStep; this.time += this.fixedTimeStep; steps++; } }
    singleStep(dt) { for (var c0 = 0; c0 < this.controllers.length; c0++) this.controllers[c0].preStep(dt); for (var r0 = 0; r0 < this.ragdolls.length; r0++) this.ragdolls[r0].preStep(dt); for (var s0 = 0; s0 < this.softBodies.length; s0++) if (this.softBodies[s0].preStep) this.softBodies[s0].preStep(dt); for (var v0 = 0; v0 < this.vehicles.length; v0++) this.vehicles[v0].update(dt); for (var f0 = 0; f0 < this.fluids.length; f0++) this.fluids[f0].step(dt); for (var i = 0; i < this.bodies.length; i++) this.bodies[i].integrate(dt, this.gravity); this.resolveContinuous(); for (var iteration = 0; iteration < this.iterations; iteration++) { for (var c = 0; c < this.constraints.length; c++) this.constraints[c].solve(dt); this.resolveCollisions(iteration === this.iterations - 1); } for (var c1 = 0; c1 < this.controllers.length; c1++) this.controllers[c1].postStep(dt); for (var s = 0; s < this.softBodies.length; s++) this.softBodies[s].updateGeometry(); for (var r1 = 0; r1 < this.ragdolls.length; r1++) this.ragdolls[r1].postStep(dt); this.updateSleeping(dt); }
    resolveContinuous() { for (var i = 0; i < this.bodies.length; i++) { var body = this.bodies[i]; if (!body.ccd || body.isStatic || body.previousPosition.distanceTo(body.position) < body.ccdMotionThreshold) continue; var direction = new Vector3().subVectors(body.position, body.previousPosition); var distance = direction.length(); if (!distance) continue; var ray = new Ray(body.previousPosition, direction); for (var j = 0; j < this.bodies.length; j++) { var other = this.bodies[j]; if (other === body || !other.isStatic) continue; var expanded = other.shape.getAABB(other.position, null, other.rotation); var extent = faoxomshapeextents(body.shape); expanded.min.sub(extent); expanded.max.add(extent); var hit = ray.intersectBox(expanded); if (hit && body.previousPosition.distanceTo(hit) <= distance) { body.position.copy(hit); body.velocity.multiplyScalar(0.1); body.syncObject(); break; } } } }
    collectPotentialPairs() { if (this.gpuBroadphase && this.gpuBroadphase.pairs) { var gpuPairs = this.gpuBroadphase.pairs; var live = []; for (var gi = 0; gi < gpuPairs.length; gi++) { var ga = this.bodies[gpuPairs[gi][0]], gb = this.bodies[gpuPairs[gi][1]]; if (ga && gb) live.push([ga, gb]); } return live; } if (this.broadphase !== "grid") { var all = []; for (var ai = 0; ai < this.bodies.length; ai++) for (var bi = ai + 1; bi < this.bodies.length; bi++) all.push([this.bodies[ai], this.bodies[bi]]); return all; } var cellSize = Math.max(0.1, this.broadphaseCellSize || 4); var buckets = {}; var pairs = {}; var planeBodies = []; for (var bodyIndex = 0; bodyIndex < this.bodies.length; bodyIndex++) { var body = this.bodies[bodyIndex]; if (body.shape.type === "plane") { planeBodies.push(bodyIndex); continue; } var box = body.shape.getAABB(body.position, null, body.rotation); var minX = Math.floor(box.min.x / cellSize), maxX = Math.floor(box.max.x / cellSize), minY = Math.floor(box.min.y / cellSize), maxY = Math.floor(box.max.y / cellSize), minZ = Math.floor(box.min.z / cellSize), maxZ = Math.floor(box.max.z / cellSize); for (var x = minX; x <= maxX; x++) for (var y = minY; y <= maxY; y++) for (var z = minZ; z <= maxZ; z++) { var key = x + ":" + y + ":" + z; if (!buckets[key]) buckets[key] = []; buckets[key].push(bodyIndex); } } for (var bucketKey in buckets) { var list = buckets[bucketKey]; for (var first = 0; first < list.length; first++) for (var second = first + 1; second < list.length; second++) { var low = Math.min(list[first], list[second]), high = Math.max(list[first], list[second]), pairKey = low + ":" + high; if (!pairs[pairKey]) { pairs[pairKey] = true; } } } for (var p = 0; p < planeBodies.length; p++) for (var o = 0; o < this.bodies.length; o++) { if (planeBodies[p] === o) continue; if (this.bodies[o].shape.type === "plane") continue; var pl = Math.min(planeBodies[p], o), ph = Math.max(planeBodies[p], o); pairs[pl + ":" + ph] = true; } var result = []; for (var pairKeyName in pairs) { var pairIndices = pairKeyName.split(":"); result.push([this.bodies[Number(pairIndices[0])], this.bodies[Number(pairIndices[1])]]); } return result; }
    resolveCollisions(dispatchEvents) { var pairs = this.collectPotentialPairs(); for (var pairIndex = 0; pairIndex < pairs.length; pairIndex++) { var a = pairs[pairIndex][0], b = pairs[pairIndex][1]; if (a.isStatic && b.isStatic || a.sleeping && b.sleeping) continue; var contact = faoxomcollisioncontact(a, b); if (!contact) continue; var normal = contact.normal; var point = contact.point; var total = a.inverseMass + b.inverseMass || 1; var correction = Math.max(0, contact.penetration - 0.002) * 0.82; if (!a.isStatic) a.position.addScaledVector(normal, -correction * (a.inverseMass / total)); if (!b.isStatic) b.position.addScaledVector(normal, correction * (b.inverseMass / total)); var va = a.getVelocityAtPoint(point); var vb = b.getVelocityAtPoint(point); var relative = new Vector3().subVectors(vb, va); var speed = relative.dot(normal); if (speed < 0) { var ra = new Vector3().subVectors(point, a.position); var rb = new Vector3().subVectors(point, b.position); var raCrossN = new Vector3().crossVectors(ra, normal); var rbCrossN = new Vector3().crossVectors(rb, normal); var denominator = a.inverseMass + b.inverseMass + new Vector3().crossVectors(faoxominverseinertia(a, raCrossN), ra).dot(normal) + new Vector3().crossVectors(faoxominverseinertia(b, rbCrossN), rb).dot(normal); var restitution = Math.min(a.restitution, b.restitution); var impulseMagnitude = -(1 + restitution) * speed / (denominator || 1); var impulse = normal.clone().multiplyScalar(impulseMagnitude); var wakeBodies = Math.abs(speed) > 0.25; a.applyImpulse(impulse.clone().negate(), point, wakeBodies); b.applyImpulse(impulse, point, wakeBodies); var tangent = relative.clone().addScaledVector(normal, -relative.dot(normal)); if (tangent.lengthSq() > 1e-8) { tangent.normalize(); var tangentDenominator = a.inverseMass + b.inverseMass + new Vector3().crossVectors(faoxominverseinertia(a, new Vector3().crossVectors(ra, tangent)), ra).dot(tangent) + new Vector3().crossVectors(faoxominverseinertia(b, new Vector3().crossVectors(rb, tangent)), rb).dot(tangent); var frictionImpulse = -relative.dot(tangent) / (tangentDenominator || 1); var limit = impulseMagnitude * Math.sqrt(Math.max(0, a.friction * b.friction)); frictionImpulse = faoxomclamp(frictionImpulse, -limit, limit); var frictionVector = tangent.multiplyScalar(frictionImpulse); a.applyImpulse(frictionVector.clone().negate(), point, wakeBodies); b.applyImpulse(frictionVector, point, wakeBodies); } } a.syncObject(); b.syncObject(); if (dispatchEvents) { if (a.onCollision) a.onCollision(b, normal, contact.penetration); if (b.onCollision) b.onCollision(a, normal.clone().negate(), contact.penetration); if (this.onCollision) this.onCollision(a, b, normal, contact.penetration); } } }
    updateSleeping(dt) { for (var i = 0; i < this.bodies.length; i++) { var body = this.bodies[i]; if (body.isStatic) continue; if (body.velocity.lengthSq() < body.sleepThreshold * body.sleepThreshold && body.angularVelocity.lengthSq() < body.sleepThreshold * body.sleepThreshold) body.sleepTime += dt; else body.sleepTime = 0; if (body.sleepTime > 0.75) body.sleep(); } }
    snapshot() {
        var bodies = [];
        for (var i = 0; i < this.bodies.length; i++) {
            var b = this.bodies[i];
            bodies.push({
                position: b.position.toArray(),
                rotation: [b.rotation.x, b.rotation.y, b.rotation.z, b.rotation.w],
                velocity: b.velocity.toArray(),
                angularVelocity: b.angularVelocity.toArray(),
                force: b.force.toArray(),
                torque: b.torque.toArray(),
                previousPosition: b.previousPosition.toArray(),
                previousRotation: [b.previousRotation.x, b.previousRotation.y, b.previousRotation.z, b.previousRotation.w],
                sleeping: b.sleeping === true,
                sleepTime: b.sleepTime || 0
            });
        }
        var controllers = [];
        for (var c = 0; c < this.controllers.length; c++) controllers.push(this.controllers[c].snapshotState ? this.controllers[c].snapshotState() : null);
        return { time: this.time, accumulator: this.accumulator, bodies: bodies, controllers: controllers };
    }
    restore(state) {
        if (!state) return this;
        var count = Math.min(state.bodies.length, this.bodies.length);
        for (var i = 0; i < count; i++) {
            var b = this.bodies[i], src = state.bodies[i];
            b.position.fromArray(src.position);
            b.rotation.set(src.rotation[0], src.rotation[1], src.rotation[2], src.rotation[3]);
            b.velocity.fromArray(src.velocity);
            b.angularVelocity.fromArray(src.angularVelocity);
            b.force.fromArray(src.force);
            b.torque.fromArray(src.torque);
            b.previousPosition.fromArray(src.previousPosition);
            b.previousRotation.set(src.previousRotation[0], src.previousRotation[1], src.previousRotation[2], src.previousRotation[3]);
            if (src.sleeping) b.sleep(); else b.wake();
            b.sleepTime = src.sleepTime;
        }
        for (var c = 0; c < this.controllers.length; c++) if (this.controllers[c].restoreState && state.controllers[c]) this.controllers[c].restoreState(state.controllers[c]);
        this.time = state.time;
        this.accumulator = state.accumulator;
        return this;
    }
    raycast(ray, maxDistance, ignoreBody) { var hits = []; var max = maxDistance === undefined ? Infinity : maxDistance; for (var i = 0; i < this.bodies.length; i++) { var body = this.bodies[i]; if (body === ignoreBody) continue; var box = body.shape.getAABB(body.position, null, body.rotation); var point = ray.intersectBox(box); if (point) { var distance = ray.origin.distanceTo(point); if (distance <= max) { var dx = Math.min(Math.abs(point.x - box.min.x), Math.abs(point.x - box.max.x)); var dy = Math.min(Math.abs(point.y - box.min.y), Math.abs(point.y - box.max.y)); var dz = Math.min(Math.abs(point.z - box.min.z), Math.abs(point.z - box.max.z)); var normal = new Vector3(0, 0, 0); if (dx <= dy && dx <= dz) normal.x = point.x - box.min.x < box.max.x - point.x ? -1 : 1; else if (dy <= dz) normal.y = point.y - box.min.y < box.max.y - point.y ? -1 : 1; else normal.z = point.z - box.min.z < box.max.z - point.z ? -1 : 1; hits.push({ body: body, point: point, distance: distance, normal: normal }); } } } hits.sort(function(a, b) { return a.distance - b.distance; }); return hits; }
}

export { PhysicsWorld };
