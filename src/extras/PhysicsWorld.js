import { faoxominverseinertia, faoxomshapeextents } from "../core/index.js";

import { Ray, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

import { faoxomcollisioncontact } from "./faoxomcollisioncontact.js";

class PhysicsWorld {
    constructor(zaika) {
        zaika = zaika || {};
        var zaikb = zaika.gravity;
        if (zaikb) {
            if (zaikb.clone) this.gravity = zaikb.clone(); else this.gravity = new Vector3(zaikb[0] !== undefined ? zaikb[0] : zaikb.x || 0, zaikb[1] !== undefined ? zaikb[1] : zaikb.y || 0, zaikb[2] !== undefined ? zaikb[2] : zaikb.z || 0);
        } else this.gravity = new Vector3(0, -9.81, 0);
        this.fixedTimeStep = faoxomvalue(zaika.fixedTimeStep, 1 / 60);
        this.maxSubSteps = Math.max(1, Math.floor(faoxomvalue(zaika.maxSubSteps, 8)));
        this.accumulator = 0;
        this.bodies = [];
        this.controllers = [];
        this.constraints = [];
        this.vehicles = [];
        this.softBodies = [];
        this.fluids = [];
        this.ragdolls = [];
        this.time = 0;
        this.broadphase = zaika.broadphase || "aabb";
        this.broadphaseCellSize = Math.max(.1, faoxomvalue(zaika.broadphaseCellSize, 4));
        this.iterations = Math.max(1, Math.floor(faoxomvalue(zaika.iterations, 6)));
        this.onCollision = null;
    }
    addBody(zaika) {
        if (this.bodies.indexOf(zaika) === -1) this.bodies.push(zaika);
        return zaika;
    }
    removeBody(zaika) {
        var zaikb = this.bodies.indexOf(zaika);
        if (zaikb !== -1) this.bodies.splice(zaikb, 1);
    }
    addController(zaika) {
        if (this.controllers.indexOf(zaika) === -1) this.controllers.push(zaika);
        return zaika;
    }
    removeController(zaika) {
        var zaikb = this.controllers.indexOf(zaika);
        if (zaikb !== -1) this.controllers.splice(zaikb, 1);
    }
    addConstraint(zaika) {
        if (this.constraints.indexOf(zaika) === -1) this.constraints.push(zaika);
        return zaika;
    }
    removeConstraint(zaika) {
        var zaikb = this.constraints.indexOf(zaika);
        if (zaikb !== -1) this.constraints.splice(zaikb, 1);
    }
    addVehicle(zaika) {
        if (this.vehicles.indexOf(zaika) === -1) this.vehicles.push(zaika);
        return zaika;
    }
    removeVehicle(zaika) {
        var zaikb = this.vehicles.indexOf(zaika);
        if (zaikb !== -1) this.vehicles.splice(zaikb, 1);
    }
    addSoftBody(zaika) {
        if (this.softBodies.indexOf(zaika) === -1) this.softBodies.push(zaika);
        return zaika;
    }
    removeSoftBody(zaika) {
        var zaikb = this.softBodies.indexOf(zaika);
        if (zaikb !== -1) this.softBodies.splice(zaikb, 1);
        return zaika;
    }
    addFluid(zaika) {
        if (this.fluids.indexOf(zaika) === -1) this.fluids.push(zaika);
        return zaika;
    }
    removeFluid(zaika) {
        var zaikb = this.fluids.indexOf(zaika);
        if (zaikb !== -1) this.fluids.splice(zaikb, 1);
        return zaika;
    }
    addRagdoll(zaika) {
        if (this.ragdolls.indexOf(zaika) === -1) this.ragdolls.push(zaika);
        return zaika;
    }
    removeRagdoll(zaika) {
        var zaikb = this.ragdolls.indexOf(zaika);
        if (zaikb !== -1) this.ragdolls.splice(zaikb, 1);
        return zaika;
    }
    step(zaika) {
        this.accumulator += Math.min(Math.max(zaika || 0, 0), .5);
        var zaikb = 0;
        while (this.accumulator >= this.fixedTimeStep && zaikb < this.maxSubSteps) {
            this.singleStep(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
            this.time += this.fixedTimeStep;
            zaikb++;
        }
    }
    singleStep(zaika) {
        for (var zaikb = 0; zaikb < this.controllers.length; zaikb++) this.controllers[zaikb].preStep(zaika);
        for (var zaikc = 0; zaikc < this.ragdolls.length; zaikc++) this.ragdolls[zaikc].preStep(zaika);
        for (var zaikd = 0; zaikd < this.softBodies.length; zaikd++) if (this.softBodies[zaikd].preStep) this.softBodies[zaikd].preStep(zaika);
        for (var zaike = 0; zaike < this.vehicles.length; zaike++) this.vehicles[zaike].update(zaika);
        for (var zaikf = 0; zaikf < this.fluids.length; zaikf++) this.fluids[zaikf].step(zaika);
        for (var zaikg = 0; zaikg < this.bodies.length; zaikg++) this.bodies[zaikg].integrate(zaika, this.gravity);
        this.resolveContinuous();
        for (var zaikh = 0; zaikh < this.iterations; zaikh++) {
            for (var zaiki = 0; zaiki < this.constraints.length; zaiki++) this.constraints[zaiki].solve(zaika);
            this.resolveCollisions(zaikh === this.iterations - 1);
        }
        for (var zaikj = 0; zaikj < this.controllers.length; zaikj++) this.controllers[zaikj].postStep(zaika);
        for (var zaikk = 0; zaikk < this.softBodies.length; zaikk++) this.softBodies[zaikk].updateGeometry();
        for (var zaikl = 0; zaikl < this.ragdolls.length; zaikl++) this.ragdolls[zaikl].postStep(zaika);
        this.updateSleeping(zaika);
    }
    resolveContinuous() {
        for (var zaika = 0; zaika < this.bodies.length; zaika++) {
            var zaikb = this.bodies[zaika];
            if (!zaikb.ccd || zaikb.isStatic || zaikb.previousPosition.distanceTo(zaikb.position) < zaikb.ccdMotionThreshold) continue;
            var zaikc = (new Vector3).subVectors(zaikb.position, zaikb.previousPosition);
            var zaikd = zaikc.length();
            if (!zaikd) continue;
            var zaike = new Ray(zaikb.previousPosition, zaikc);
            for (var zaikf = 0; zaikf < this.bodies.length; zaikf++) {
                var zaikg = this.bodies[zaikf];
                if (zaikg === zaikb || !zaikg.isStatic) continue;
                var zaikh = zaikg.shape.getAABB(zaikg.position, null, zaikg.rotation);
                var zaiki = faoxomshapeextents(zaikb.shape);
                zaikh.min.sub(zaiki);
                zaikh.max.add(zaiki);
                var zaikj = zaike.intersectBox(zaikh);
                if (zaikj && zaikb.previousPosition.distanceTo(zaikj) <= zaikd) {
                    zaikb.position.copy(zaikj);
                    zaikb.velocity.multiplyScalar(.1);
                    zaikb.syncObject();
                    break;
                }
            }
        }
    }
    collectPotentialPairs() {
        if (this.gpuBroadphase && this.gpuBroadphase.pairs) {
            var zaika = this.gpuBroadphase.pairs;
            var zaikb = [];
            for (var zaikc = 0; zaikc < zaika.length; zaikc++) {
                var zaikd = this.bodies[zaika[zaikc][0]], zaike = this.bodies[zaika[zaikc][1]];
                if (zaikd && zaike) zaikb.push([ zaikd, zaike ]);
            }
            return zaikb;
        }
        if (this.broadphase !== "grid") {
            var zaikf = [];
            for (var zaikg = 0; zaikg < this.bodies.length; zaikg++) for (var zaikh = zaikg + 1; zaikh < this.bodies.length; zaikh++) zaikf.push([ this.bodies[zaikg], this.bodies[zaikh] ]);
            return zaikf;
        }
        var zaiki = Math.max(.1, this.broadphaseCellSize || 4);
        var zaikj = {};
        var zaikk = {};
        var zaikl = [];
        for (var zaikm = 0; zaikm < this.bodies.length; zaikm++) {
            var zaikn = this.bodies[zaikm];
            if (zaikn.shape.type === "plane") {
                zaikl.push(zaikm);
                continue;
            }
            var zaiko = zaikn.shape.getAABB(zaikn.position, null, zaikn.rotation);
            var zaikp = Math.floor(zaiko.min.x / zaiki), zaikq = Math.floor(zaiko.max.x / zaiki), zaikr = Math.floor(zaiko.min.y / zaiki), zaiks = Math.floor(zaiko.max.y / zaiki), zaikt = Math.floor(zaiko.min.z / zaiki), zaiku = Math.floor(zaiko.max.z / zaiki);
            for (var zaikv = zaikp; zaikv <= zaikq; zaikv++) for (var zaikw = zaikr; zaikw <= zaiks; zaikw++) for (var zaikx = zaikt; zaikx <= zaiku; zaikx++) {
                var zaiky = zaikv + ":" + zaikw + ":" + zaikx;
                if (!zaikj[zaiky]) zaikj[zaiky] = [];
                zaikj[zaiky].push(zaikm);
            }
        }
        for (var zaikz in zaikj) {
            var zaikaa = zaikj[zaikz];
            for (var zaikab = 0; zaikab < zaikaa.length; zaikab++) for (var zaikac = zaikab + 1; zaikac < zaikaa.length; zaikac++) {
                var zaikad = Math.min(zaikaa[zaikab], zaikaa[zaikac]), zaikae = Math.max(zaikaa[zaikab], zaikaa[zaikac]), zaikaf = zaikad + ":" + zaikae;
                if (!zaikk[zaikaf]) {
                    zaikk[zaikaf] = true;
                }
            }
        }
        for (var zaikag = 0; zaikag < zaikl.length; zaikag++) for (var zaikah = 0; zaikah < this.bodies.length; zaikah++) {
            if (zaikl[zaikag] === zaikah) continue;
            if (this.bodies[zaikah].shape.type === "plane") continue;
            var zaikai = Math.min(zaikl[zaikag], zaikah), zaikaj = Math.max(zaikl[zaikag], zaikah);
            zaikk[zaikai + ":" + zaikaj] = true;
        }
        var zaikak = [];
        for (var zaikal in zaikk) {
            var zaikam = zaikal.split(":");
            zaikak.push([ this.bodies[Number(zaikam[0])], this.bodies[Number(zaikam[1])] ]);
        }
        return zaikak;
    }
    resolveCollisions(zaika) {
        var zaikb = this.collectPotentialPairs();
        for (var zaikc = 0; zaikc < zaikb.length; zaikc++) {
            var zaikd = zaikb[zaikc][0], zaike = zaikb[zaikc][1];
            if (zaikd.isStatic && zaike.isStatic || zaikd.sleeping && zaike.sleeping) continue;
            var zaikf = faoxomcollisioncontact(zaikd, zaike);
            if (!zaikf) continue;
            var zaikg = zaikf.normal;
            var zaikh = zaikf.point;
            var zaiki = zaikd.inverseMass + zaike.inverseMass || 1;
            var zaikj = Math.max(0, zaikf.penetration - .002) * .82;
            if (!zaikd.isStatic) zaikd.position.addScaledVector(zaikg, -zaikj * (zaikd.inverseMass / zaiki));
            if (!zaike.isStatic) zaike.position.addScaledVector(zaikg, zaikj * (zaike.inverseMass / zaiki));
            var zaikk = zaikd.getVelocityAtPoint(zaikh);
            var zaikl = zaike.getVelocityAtPoint(zaikh);
            var zaikm = (new Vector3).subVectors(zaikl, zaikk);
            var zaikn = zaikm.dot(zaikg);
            if (zaikn < 0) {
                var zaiko = (new Vector3).subVectors(zaikh, zaikd.position);
                var zaikp = (new Vector3).subVectors(zaikh, zaike.position);
                var zaikq = (new Vector3).crossVectors(zaiko, zaikg);
                var zaikr = (new Vector3).crossVectors(zaikp, zaikg);
                var zaiks = zaikd.inverseMass + zaike.inverseMass + (new Vector3).crossVectors(faoxominverseinertia(zaikd, zaikq), zaiko).dot(zaikg) + (new Vector3).crossVectors(faoxominverseinertia(zaike, zaikr), zaikp).dot(zaikg);
                var zaikt = Math.min(zaikd.restitution, zaike.restitution);
                var zaiku = -(1 + zaikt) * zaikn / (zaiks || 1);
                var zaikv = zaikg.clone().multiplyScalar(zaiku);
                var zaikw = Math.abs(zaikn) > .25;
                zaikd.applyImpulse(zaikv.clone().negate(), zaikh, zaikw);
                zaike.applyImpulse(zaikv, zaikh, zaikw);
                var zaikx = zaikm.clone().addScaledVector(zaikg, -zaikm.dot(zaikg));
                if (zaikx.lengthSq() > 1e-8) {
                    zaikx.normalize();
                    var zaiky = zaikd.inverseMass + zaike.inverseMass + (new Vector3).crossVectors(faoxominverseinertia(zaikd, (new Vector3).crossVectors(zaiko, zaikx)), zaiko).dot(zaikx) + (new Vector3).crossVectors(faoxominverseinertia(zaike, (new Vector3).crossVectors(zaikp, zaikx)), zaikp).dot(zaikx);
                    var zaikz = -zaikm.dot(zaikx) / (zaiky || 1);
                    var zaikaa = zaiku * Math.sqrt(Math.max(0, zaikd.friction * zaike.friction));
                    zaikz = faoxomclamp(zaikz, -zaikaa, zaikaa);
                    var zaikab = zaikx.multiplyScalar(zaikz);
                    zaikd.applyImpulse(zaikab.clone().negate(), zaikh, zaikw);
                    zaike.applyImpulse(zaikab, zaikh, zaikw);
                }
            }
            zaikd.syncObject();
            zaike.syncObject();
            if (zaika) {
                if (zaikd.onCollision) zaikd.onCollision(zaike, zaikg, zaikf.penetration);
                if (zaike.onCollision) zaike.onCollision(zaikd, zaikg.clone().negate(), zaikf.penetration);
                if (this.onCollision) this.onCollision(zaikd, zaike, zaikg, zaikf.penetration);
            }
        }
    }
    updateSleeping(zaika) {
        for (var zaikb = 0; zaikb < this.bodies.length; zaikb++) {
            var zaikc = this.bodies[zaikb];
            if (zaikc.isStatic) continue;
            if (zaikc.velocity.lengthSq() < zaikc.sleepThreshold * zaikc.sleepThreshold && zaikc.angularVelocity.lengthSq() < zaikc.sleepThreshold * zaikc.sleepThreshold) zaikc.sleepTime += zaika; else zaikc.sleepTime = 0;
            if (zaikc.sleepTime > .75) zaikc.sleep();
        }
    }
    snapshot() {
        var zaika = [];
        for (var zaikb = 0; zaikb < this.bodies.length; zaikb++) {
            var zaikc = this.bodies[zaikb];
            zaika.push({
                position: zaikc.position.toArray(),
                rotation: [ zaikc.rotation.x, zaikc.rotation.y, zaikc.rotation.z, zaikc.rotation.w ],
                velocity: zaikc.velocity.toArray(),
                angularVelocity: zaikc.angularVelocity.toArray(),
                force: zaikc.force.toArray(),
                torque: zaikc.torque.toArray(),
                previousPosition: zaikc.previousPosition.toArray(),
                previousRotation: [ zaikc.previousRotation.x, zaikc.previousRotation.y, zaikc.previousRotation.z, zaikc.previousRotation.w ],
                sleeping: zaikc.sleeping === true,
                sleepTime: zaikc.sleepTime || 0
            });
        }
        var zaikd = [];
        for (var zaike = 0; zaike < this.controllers.length; zaike++) zaikd.push(this.controllers[zaike].snapshotState ? this.controllers[zaike].snapshotState() : null);
        return {
            time: this.time,
            accumulator: this.accumulator,
            bodies: zaika,
            controllers: zaikd
        };
    }
    restore(zaika) {
        if (!zaika) return this;
        var zaikb = Math.min(zaika.bodies.length, this.bodies.length);
        for (var zaikc = 0; zaikc < zaikb; zaikc++) {
            var zaikd = this.bodies[zaikc], zaike = zaika.bodies[zaikc];
            zaikd.position.fromArray(zaike.position);
            zaikd.rotation.set(zaike.rotation[0], zaike.rotation[1], zaike.rotation[2], zaike.rotation[3]);
            zaikd.velocity.fromArray(zaike.velocity);
            zaikd.angularVelocity.fromArray(zaike.angularVelocity);
            zaikd.force.fromArray(zaike.force);
            zaikd.torque.fromArray(zaike.torque);
            zaikd.previousPosition.fromArray(zaike.previousPosition);
            zaikd.previousRotation.set(zaike.previousRotation[0], zaike.previousRotation[1], zaike.previousRotation[2], zaike.previousRotation[3]);
            if (zaike.sleeping) zaikd.sleep(); else zaikd.wake();
            zaikd.sleepTime = zaike.sleepTime;
        }
        for (var zaikf = 0; zaikf < this.controllers.length; zaikf++) if (this.controllers[zaikf].restoreState && zaika.controllers[zaikf]) this.controllers[zaikf].restoreState(zaika.controllers[zaikf]);
        this.time = zaika.time;
        this.accumulator = zaika.accumulator;
        return this;
    }
    raycast(zaika, zaikb, zaikc) {
        var zaikd = [];
        var zaike = zaikb === undefined ? Infinity : zaikb;
        for (var zaikf = 0; zaikf < this.bodies.length; zaikf++) {
            var zaikg = this.bodies[zaikf];
            if (zaikg === zaikc) continue;
            var zaikh = zaikg.shape.getAABB(zaikg.position, null, zaikg.rotation);
            var zaiki = zaika.intersectBox(zaikh);
            if (zaiki) {
                var zaikj = zaika.origin.distanceTo(zaiki);
                if (zaikj <= zaike) {
                    var zaikk = Math.min(Math.abs(zaiki.x - zaikh.min.x), Math.abs(zaiki.x - zaikh.max.x));
                    var zaikl = Math.min(Math.abs(zaiki.y - zaikh.min.y), Math.abs(zaiki.y - zaikh.max.y));
                    var zaikm = Math.min(Math.abs(zaiki.z - zaikh.min.z), Math.abs(zaiki.z - zaikh.max.z));
                    var zaikn = new Vector3(0, 0, 0);
                    if (zaikk <= zaikl && zaikk <= zaikm) zaikn.x = zaiki.x - zaikh.min.x < zaikh.max.x - zaiki.x ? -1 : 1; else if (zaikl <= zaikm) zaikn.y = zaiki.y - zaikh.min.y < zaikh.max.y - zaiki.y ? -1 : 1; else zaikn.z = zaiki.z - zaikh.min.z < zaikh.max.z - zaiki.z ? -1 : 1;
                    zaikd.push({
                        body: zaikg,
                        point: zaiki,
                        distance: zaikj,
                        normal: zaikn
                    });
                }
            }
        }
        zaikd.sort(function(zaika, zaikb) {
            return zaika.distance - zaikb.distance;
        });
        return zaikd;
    }
}

export { PhysicsWorld };
