import { Quaternion, Vector3, faoxomclamp, faoxomvalue } from "../math/index.js";

function zaawa(zaawa) {
    var zaawb = zaawa.lastIndexOf(".");
    if (zaawb <= 0) return null;
    var zaawc = zaawa.slice(0, zaawb);
    var zaawd = zaawa.slice(zaawb + 1);
    if (zaawd === "translation") zaawd = "position";
    if (zaawd === "rotation" || zaawd === "orientation") zaawd = "quaternion";
    if (zaawd !== "position" && zaawd !== "quaternion" && zaawd !== "scale") return null;
    return {
        bone: zaawc,
        property: zaawd
    };
}

function zaawb() {
    return {
        position: new Vector3,
        quaternion: new Quaternion,
        scale: new Vector3(1, 1, 1)
    };
}

function zaawc(zaawa, zaawb, zaawc) {
    if (zaawc <= 0) return zaawa;
    for (var zaawd in zaawb) {
        var zaawe = zaawa[zaawd];
        if (!zaawe) {
            zaawa[zaawd] = {
                position: zaawb[zaawd].position.clone(),
                quaternion: zaawb[zaawd].quaternion.clone(),
                scale: zaawb[zaawd].scale.clone()
            };
            if (zaawc >= 1) continue;
            zaawe = zaawa[zaawd];
        }
        if (zaawc >= 1) {
            zaawe.position.copy(zaawb[zaawd].position);
            zaawe.quaternion.copy(zaawb[zaawd].quaternion);
            zaawe.scale.copy(zaawb[zaawd].scale);
            continue;
        }
        zaawe.position.lerp(zaawb[zaawd].position, zaawc);
        zaawe.quaternion.slerp(zaawb[zaawd].quaternion, zaawc);
        zaawe.scale.lerp(zaawb[zaawd].scale, zaawc);
    }
    return zaawa;
}

class AnimationGraph {
    constructor(zaawa, zaawb) {
        zaawb = zaawb || {};
        if (!zaawa) throw new Error("AnimationGraph requires a target object");
        this.target = zaawa;
        this.parameters = {};
        this.nodes = {};
        this.root = null;
        this.ik = [];
        this.time = 0;
        this.rootBoneName = zaawb.rootBone || null;
        this.removeRootMotion = zaawb.removeRootMotion === true;
        this.rootMotion = new Vector3;
        this.rootMotionDelta = new Vector3;
        this.stats = {
            updates: 0,
            ikSolves: 0
        };
        this._bones = null;
        this._prevRoot = new Vector3;
        this._rootSeen = false;
    }
    setParameter(zaawa, zaawb) {
        this.parameters[zaawa] = zaawb;
        return this;
    }
    getParameter(zaawa) {
        return this.parameters[zaawa];
    }
    setParameters(zaawa) {
        for (var zaawb in zaawa) this.parameters[zaawb] = zaawa[zaawb];
        return this;
    }
    _register(zaawa, zaawb) {
        if (!zaawa || typeof zaawa !== "string") throw new Error("AnimationGraph node requires a name");
        if (this.nodes[zaawa]) throw new Error("AnimationGraph node '" + zaawa + "' already exists");
        this.nodes[zaawa] = zaawb;
        zaawb.name = zaawa;
        return this;
    }
    _resolve(zaawa) {
        if (typeof zaawa === "string") {
            var zaawb = this.nodes[zaawa];
            if (!zaawb) throw new Error("AnimationGraph node '" + zaawa + "' does not exist");
            return zaawb;
        }
        return zaawa;
    }
    clip(zaawa, zaawb, zaawc) {
        zaawc = zaawc || {};
        if (!zaawb) throw new Error("clip node '" + zaawa + "' requires an AnimationClip");
        return this._register(zaawa, {
            type: "clip",
            clip: zaawb,
            time: faoxomvalue(zaawc.startTime, 0),
            speed: faoxomvalue(zaawc.speed, 1),
            loop: zaawc.loop !== false,
            start: faoxomvalue(zaawc.start, 0),
            end: faoxomvalue(zaawc.end, zaawb.duration || 0),
            playing: true,
            stopped: false
        });
    }
    blend1d(zaawa, zaawb, zaawc, zaawd) {
        zaawd = zaawd || {};
        if (!zaawb) throw new Error("blend1d node '" + zaawa + "' requires a parameter");
        if (!zaawc || zaawc.length < 2) throw new Error("blend1d node '" + zaawa + "' requires at least two children");
        var zaawe = zaawc.map(function(zaawa) {
            return {
                node: zaawa.node,
                threshold: zaawa.threshold
            };
        });
        zaawe.sort(function(zaawa, zaawb) {
            return zaawa.threshold - zaawb.threshold;
        });
        return this._register(zaawa, {
            type: "blend1d",
            parameter: zaawb,
            children: zaawe,
            sync: zaawd.sync === true,
            normalized: 0
        });
    }
    blend2d(zaawa, zaawb, zaawc, zaawd) {
        if (!zaawb || !zaawc) throw new Error("blend2d node '" + zaawa + "' requires two parameters");
        if (!zaawd || zaawd.length < 2) throw new Error("blend2d node '" + zaawa + "' requires at least two children");
        return this._register(zaawa, {
            type: "blend2d",
            parameterX: zaawb,
            parameterY: zaawc,
            children: zaawd.map(function(zaawa) {
                return {
                    node: zaawa.node,
                    x: zaawa.x,
                    y: zaawa.y
                };
            })
        });
    }
    additive(zaawa, zaawb, zaawc, zaawd) {
        zaawd = zaawd || {};
        return this._register(zaawa, {
            type: "additive",
            base: zaawb,
            additive: zaawc,
            weight: faoxomvalue(zaawd.weight, 1),
            parameter: zaawd.parameter || null,
            referenceTime: faoxomvalue(zaawd.referenceTime, 0)
        });
    }
    setRoot(zaawa) {
        this.root = this._resolve(zaawa);
        return this;
    }
    addIK(zaawa) {
        if (!zaawa || !zaawa.type) throw new Error("addIK requires a constraint type");
        if (zaawa.type === "twoBone") {
            if (!zaawa.root || !zaawa.middle || !zaawa.end) throw new Error("twoBone IK requires root, middle and end bones");
            if (!zaawa.target) throw new Error("twoBone IK requires a target");
            this.ik.push({
                type: "twoBone",
                root: zaawa.root,
                middle: zaawa.middle,
                end: zaawa.end,
                target: zaawa.target,
                pole: zaawa.pole || null,
                weight: faoxomvalue(zaawa.weight, 1)
            });
        } else if (zaawa.type === "aim") {
            if (!zaawa.bone) throw new Error("aim IK requires a bone");
            if (!zaawa.target) throw new Error("aim IK requires a target");
            var zaawb = zaawa.axis;
            if (typeof zaawb === "string") zaawb = zaawb.toLowerCase() === "x" ? new Vector3(1, 0, 0) : zaawb.toLowerCase() === "y" ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
            this.ik.push({
                type: "aim",
                bone: zaawa.bone,
                axis: zaawb || new Vector3(0, 0, 1),
                target: zaawa.target,
                weight: faoxomvalue(zaawa.weight, 1)
            });
        } else throw new Error("unknown IK constraint type '" + zaawa.type + "'");
        return this;
    }
    clearIK() {
        this.ik.length = 0;
        return this;
    }
    removeIK(zaawa) {
        if (zaawa >= 0 && zaawa < this.ik.length) this.ik.splice(zaawa, 1);
        return this;
    }
    refreshBones() {
        this._bones = null;
        return this;
    }
    bones() {
        if (this._bones) return this._bones;
        var zaawa = {};
        this.target.traverse(function(zaawb) {
            if (zaawb.name && zaawa[zaawb.name] === undefined) zaawa[zaawb.name] = zaawb;
        });
        this._bones = zaawa;
        return zaawa;
    }
    _sampleClip(zaawc, zaawd) {
        var zaawe = {};
        var zaawf = zaawc.clip.tracks;
        for (var zaawg = 0; zaawg < zaawf.length; zaawg++) {
            var zaawh = zaawa(zaawf[zaawg].name);
            if (!zaawh) continue;
            var zaawi = zaawe[zaawh.bone];
            if (!zaawi) {
                zaawi = zaawe[zaawh.bone] = zaawb();
                var zaawj = this.bones()[zaawh.bone];
                if (zaawj) {
                    zaawi.position.copy(zaawj.position);
                    zaawi.quaternion.copy(zaawj.quaternion);
                    zaawi.scale.copy(zaawj.scale);
                }
            }
            var zaawk = zaawf[zaawg].sample(zaawd);
            if (zaawh.property === "position") zaawi.position.copy(zaawk); else if (zaawh.property === "quaternion") zaawi.quaternion.copy(zaawk).normalize(); else zaawi.scale.copy(zaawk);
        }
        return zaawe;
    }
    _advanceClip(zaawa, zaawb) {
        if (!zaawa.playing || zaawa.stopped || zaawb === 0) return;
        var zaawc = zaawa.end - zaawa.start;
        if (zaawc <= 0) {
            zaawa.stopped = true;
            return;
        }
        zaawa.time += zaawb * zaawa.speed;
        if (zaawa.time >= zaawa.end) {
            if (zaawa.loop) zaawa.time = zaawa.start + (zaawa.time - zaawa.start) % zaawc; else {
                zaawa.time = zaawa.end;
                zaawa.stopped = true;
            }
        }
        if (zaawa.time < zaawa.start) zaawa.time = zaawa.start;
    }
    _evalNode(zaawa, zaawd) {
        if (!zaawa) throw new Error("AnimationGraph evaluated a missing node");
        if (zaawa.type === "clip") {
            this._advanceClip(zaawa, zaawd);
            return this._sampleClip(zaawa, zaawa.time);
        }
        if (zaawa.type === "blend1d") {
            var zaawe = faoxomvalue(this.parameters[zaawa.parameter], 0);
            var zaawf = zaawa.children;
            if (zaawa.sync) {
                var zaawg = this._resolve(zaawf[0].node);
                var zaawh = zaawg.end - zaawg.start;
                if (zaawh > 0) {
                    zaawa.normalized += zaawd * (zaawg.speed || 1) / zaawh;
                    zaawa.normalized = zaawa.normalized - Math.floor(zaawa.normalized);
                }
                for (var zaawi = 0; zaawi < zaawf.length; zaawi++) {
                    var zaawj = this._resolve(zaawf[zaawi].node);
                    var zaawk = zaawj.end - zaawj.start;
                    zaawj.time = zaawj.start + (zaawk > 0 ? zaawa.normalized * zaawk : 0);
                }
                var zaawl = this._sampleClip(this._resolve(zaawf[0].node), this._resolve(zaawf[0].node).time);
                if (zaawe <= zaawf[0].threshold) return zaawl;
                if (zaawe >= zaawf[zaawf.length - 1].threshold) return this._sampleClip(this._resolve(zaawf[zaawf.length - 1].node), this._resolve(zaawf[zaawf.length - 1].node).time);
                var zaawm = 0;
                while (zaawm < zaawf.length - 2 && zaawe > zaawf[zaawm + 1].threshold) zaawm++;
                var zaawn = (zaawe - zaawf[zaawm].threshold) / (zaawf[zaawm + 1].threshold - zaawf[zaawm].threshold || 1);
                var zaawo = this._sampleClip(this._resolve(zaawf[zaawm].node), this._resolve(zaawf[zaawm].node).time);
                var zaawp = this._sampleClip(this._resolve(zaawf[zaawm + 1].node), this._resolve(zaawf[zaawm + 1].node).time);
                return zaawc(zaawo, zaawp, faoxomclamp(zaawn, 0, 1));
            }
            var zaawq = this._evalNode(this._resolve(zaawf[0].node), zaawd);
            if (zaawe <= zaawf[0].threshold) return zaawq;
            var zaawr = this._evalNode(this._resolve(zaawf[zaawf.length - 1].node), zaawd);
            if (zaawe >= zaawf[zaawf.length - 1].threshold) return zaawr;
            var zaaws = 0;
            while (zaaws < zaawf.length - 2 && zaawe > zaawf[zaaws + 1].threshold) zaaws++;
            var zaawt = (zaawe - zaawf[zaaws].threshold) / (zaawf[zaaws + 1].threshold - zaawf[zaaws].threshold || 1);
            var zaawu = zaaws === 0 ? zaawq : this._evalNode(this._resolve(zaawf[zaaws].node), zaawd);
            var zaawv = zaaws === zaawf.length - 2 ? zaawr : this._evalNode(this._resolve(zaawf[zaaws + 1].node), zaawd);
            return zaawc(zaawu, zaawv, faoxomclamp(zaawt, 0, 1));
        }
        if (zaawa.type === "blend2d") {
            var zaaww = faoxomvalue(this.parameters[zaawa.parameterX], 0);
            var zaawx = faoxomvalue(this.parameters[zaawa.parameterY], 0);
            var zaawy = 0;
            var zaawz = new Array(zaawa.children.length);
            for (var zaawaa = 0; zaawaa < zaawa.children.length; zaawaa++) {
                var zaawab = zaaww - zaawa.children[zaawaa].x, zaawac = zaawx - zaawa.children[zaawaa].y;
                var zaawad = zaawab * zaawab + zaawac * zaawac;
                zaawz[zaawaa] = zaawad <= 1e-12 ? 1e12 : 1 / (zaawad + 1e-8);
                zaawy += zaawz[zaawaa];
            }
            var zaawae = null;
            var zaawaf = 0;
            for (var zaawag = 0; zaawag < zaawa.children.length; zaawag++) {
                var zaawah = zaawz[zaawag] / zaawy;
                if (zaawah <= 0) continue;
                var zaawai = this._evalNode(this._resolve(zaawa.children[zaawag].node), zaawd);
                if (!zaawae) {
                    zaawae = {};
                    for (var zaawaj in zaawai) zaawae[zaawaj] = {
                        position: zaawai[zaawaj].position.clone(),
                        quaternion: zaawai[zaawaj].quaternion.clone(),
                        scale: zaawai[zaawaj].scale.clone()
                    };
                    zaawaf = zaawah;
                    if (zaawah >= 1) break;
                } else {
                    zaawae = zaawc(zaawae, zaawai, zaawah / (zaawaf + zaawah));
                    zaawaf += zaawah;
                }
            }
            return zaawae || {};
        }
        if (zaawa.type === "additive") {
            var zaawak = this._evalNode(this._resolve(zaawa.base), zaawd);
            var zaawal = this._resolve(zaawa.additive);
            var zaawam = zaawa.parameter !== null ? faoxomvalue(this.parameters[zaawa.parameter], 0) : zaawa.weight;
            var zaawan = zaawal.time, zaawao = zaawal.playing;
            zaawal.time = zaawa.referenceTime;
            zaawal.playing = false;
            var zaawap = this._evalNode(zaawal, 0);
            zaawal.playing = zaawao;
            zaawal.time = zaawan;
            var zaawaq = this._evalNode(zaawal, zaawd);
            var zaawar = {};
            for (var zaawas in zaawak) zaawar[zaawas] = {
                position: zaawak[zaawas].position.clone(),
                quaternion: zaawak[zaawas].quaternion.clone(),
                scale: zaawak[zaawas].scale.clone()
            };
            for (var zaawat in zaawaq) {
                var zaawau = zaawaq[zaawat], zaawav = zaawap[zaawat];
                var zaawaw = zaawar[zaawat];
                if (!zaawaw) {
                    zaawaw = zaawar[zaawat] = zaawb();
                    zaawaw.position.copy(this._restPosition(zaawat));
                }
                if (!zaawav) zaawav = zaawb();
                zaawaw.position.addScaledVector(zaawau.position.clone().sub(zaawav.position), zaawam);
                zaawaw.scale.addScaledVector(zaawau.scale.clone().sub(zaawav.scale), zaawam);
                var zaawax = zaawav.quaternion.clone().invert().multiply(zaawau.quaternion).normalize();
                var zaaway = (new Quaternion).slerp(zaawax, faoxomclamp(zaawam, 0, 1));
                zaawaw.quaternion.copy(zaawaw.quaternion.clone().multiply(zaaway).normalize());
            }
            return zaawar;
        }
        throw new Error("unknown AnimationGraph node type '" + zaawa.type + "'");
    }
    _restPosition(zaawa) {
        var zaawb = this.bones()[zaawa];
        return zaawb ? zaawb.position : new Vector3;
    }
    evaluate(zaawa) {
        if (!this.root) throw new Error("AnimationGraph has no root node (call setRoot)");
        return this._evalNode(this.root, zaawa === undefined ? 0 : zaawa);
    }
    _applyPose(zaawa) {
        var zaawb = this.bones();
        for (var zaawc in zaawa) {
            var zaawd = zaawb[zaawc];
            if (!zaawd) continue;
            zaawd.position.copy(zaawa[zaawc].position);
            zaawd.quaternion.copy(zaawa[zaawc].quaternion);
            zaawd.scale.copy(zaawa[zaawc].scale);
        }
    }
    _applyWorldRotation(zaawa, zaawb, zaawc) {
        zaawa.updateMatrixWorld(true);
        var zaawd = new Vector3;
        var zaawe = new Quaternion;
        var zaawf = new Vector3;
        zaawa.matrixWorld.decompose(zaawd, zaawe, zaawf);
        var zaawg = (new Quaternion).slerp(zaawb, faoxomclamp(zaawc, 0, 1));
        var zaawh = zaawg.multiply(zaawe);
        var zaawi = zaawh;
        if (zaawa.parent) {
            var zaawj = new Vector3;
            var zaawk = new Quaternion;
            var zaawl = new Vector3;
            zaawa.parent.matrixWorld.decompose(zaawj, zaawk, zaawl);
            zaawi = zaawk.clone().invert().multiply(zaawh);
        }
        zaawa.quaternion.copy(zaawi).normalize();
        zaawa.updateMatrixWorld(true);
    }
    _worldPosition(zaawa, zaawb) {
        return (zaawb || new Vector3).setFromMatrixPosition(zaawa.matrixWorld);
    }
    _solveTwoBone(zaawa) {
        var zaawb = this.bones();
        var zaawc = typeof zaawa.root === "string" ? zaawb[zaawa.root] : zaawa.root;
        var zaawd = typeof zaawa.middle === "string" ? zaawb[zaawa.middle] : zaawa.middle;
        var zaawe = typeof zaawa.end === "string" ? zaawb[zaawa.end] : zaawa.end;
        if (!zaawc || !zaawd || !zaawe) return;
        var zaawf = zaawa.target && zaawa.target.x !== undefined ? zaawa.target : null;
        if (!zaawf) return;
        var zaawg = this._worldPosition(zaawc);
        var zaawh = this._worldPosition(zaawd);
        var zaawi = this._worldPosition(zaawe);
        var zaawj = zaawh.distanceTo(zaawg);
        var zaawk = zaawi.distanceTo(zaawh);
        if (zaawj <= 1e-6 || zaawk <= 1e-6) return;
        var zaawl = new Vector3(zaawf.x, zaawf.y, zaawf.z).sub(zaawg);
        var zaawm = zaawl.length();
        if (zaawm < 1e-6) return;
        var zaawn = zaawl.clone().divideScalar(zaawm);
        var zaawo = faoxomclamp(zaawm, Math.abs(zaawj - zaawk) + 1e-4, zaawj + zaawk - 1e-4);
        var zaawp = (zaawj * zaawj + zaawo * zaawo - zaawk * zaawk) / (2 * zaawj * zaawo);
        var zaawq = Math.acos(faoxomclamp(zaawp, -1, 1));
        var zaawr = new Vector3;
        if (zaawa.pole && zaawa.pole.x !== undefined) {
            var zaaws = new Vector3(zaawa.pole.x, zaawa.pole.y, zaawa.pole.z).sub(zaawg);
            zaawr.copy(zaaws).addScaledVector(zaawn, -zaaws.dot(zaawn));
            if (zaawr.lengthSq() < 1e-10) zaawr.copy(zaawh).sub(zaawg).addScaledVector(zaawn, -zaawh.sub(zaawg).dot(zaawn));
        } else {
            var zaawt = zaawh.clone().sub(zaawg);
            zaawr.copy(zaawt).addScaledVector(zaawn, -zaawt.dot(zaawn));
        }
        if (zaawr.lengthSq() < 1e-10) {
            zaawr.set(zaawn.y, zaawn.z, zaawn.x).addScaledVector(zaawn, -(zaawn.y * zaawn.x + zaawn.z * zaawn.y + zaawn.x * zaawn.z));
            if (zaawr.lengthSq() < 1e-10) return;
        }
        zaawr.normalize();
        var zaawu = zaawn.clone().multiplyScalar(Math.cos(zaawq)).addScaledVector(zaawr, Math.sin(zaawq)).multiplyScalar(zaawj).add(zaawg);
        var zaawv = zaawn.clone().multiplyScalar(zaawo).add(zaawg);
        var zaaww = (new Quaternion).setFromUnitVectors(zaawh.clone().sub(zaawg).normalize(), zaawu.clone().sub(zaawg).normalize());
        this._applyWorldRotation(zaawc, zaaww, zaawa.weight);
        zaawh = this._worldPosition(zaawd);
        zaawi = this._worldPosition(zaawe);
        var zaawx = (new Quaternion).setFromUnitVectors(zaawi.clone().sub(zaawh).normalize(), zaawv.clone().sub(zaawh).normalize());
        this._applyWorldRotation(zaawd, zaawx, zaawa.weight);
        this.stats.ikSolves++;
    }
    _solveAim(zaawa) {
        var zaawb = this.bones();
        var zaawc = typeof zaawa.bone === "string" ? zaawb[zaawa.bone] : zaawa.bone;
        if (!zaawc || !zaawa.target || zaawa.target.x === undefined) return;
        zaawc.updateMatrixWorld(true);
        var zaawd = this._worldPosition(zaawc);
        var zaawe = new Quaternion;
        zaawc.matrixWorld.decompose(new Vector3, zaawe, new Vector3);
        var zaawf = (zaawa.axis && zaawa.axis.x !== undefined ? zaawa.axis : new Vector3(0, 0, 1)).clone().normalize();
        var zaawg = zaawf.clone().applyQuaternion(zaawe).normalize();
        var zaawh = new Vector3(zaawa.target.x, zaawa.target.y, zaawa.target.z).sub(zaawd);
        if (zaawh.lengthSq() < 1e-12) return;
        zaawh.normalize();
        var zaawi = (new Quaternion).setFromUnitVectors(zaawg, zaawh);
        this._applyWorldRotation(zaawc, zaawi, zaawa.weight);
        this.stats.ikSolves++;
    }
    update(zaawa) {
        if (zaawa === undefined) zaawa = 0;
        var zaawb = this.root ? this.evaluate(zaawa) : {};
        this._applyPose(zaawb);
        this.target.updateMatrixWorld(true);
        if (this.ik.length) {
            for (var zaawc = 0; zaawc < this.ik.length; zaawc++) {
                var zaawd = this.ik[zaawc];
                if (zaawd.type === "twoBone") this._solveTwoBone(zaawd); else if (zaawd.type === "aim") this._solveAim(zaawd);
            }
            this.target.updateMatrixWorld(true);
        }
        this._updateRootMotion();
        this.time += zaawa;
        this.stats.updates++;
        return this;
    }
    _updateRootMotion() {
        this.rootMotionDelta.set(0, 0, 0);
        if (!this.rootBoneName) return;
        var zaawa = this.bones()[this.rootBoneName];
        if (!zaawa) return;
        if (!this._rootSeen) {
            this._prevRoot.copy(zaawa.position);
            this._rootSeen = true;
            return;
        }
        this.rootMotionDelta.subVectors(zaawa.position, this._prevRoot);
        if (this.removeRootMotion) {
            zaawa.position.sub(this.rootMotionDelta);
            this.target.updateMatrixWorld(true);
            this._prevRoot.copy(zaawa.position);
        } else this._prevRoot.copy(zaawa.position);
        this.rootMotion.add(this.rootMotionDelta);
    }
    reset() {
        this.time = 0;
        this.rootMotion.set(0, 0, 0);
        this.rootMotionDelta.set(0, 0, 0);
        this._rootSeen = false;
        for (var zaawa in this.nodes) {
            var zaawb = this.nodes[zaawa];
            if (zaawb.type === "clip") {
                zaawb.time = faoxomvalue(zaawb.start, 0);
                zaawb.stopped = false;
            }
            if (zaawb.type === "blend1d") zaawb.normalized = 0;
        }
        return this;
    }
    dispose() {
        this.nodes = {};
        this.parameters = {};
        this.ik = [];
        this.root = null;
        this._bones = null;
        return this;
    }
}

export { AnimationGraph };
