import { faoxomresolve } from "../core/index.js";

import { AnimationAction } from "./AnimationAction.js";

class AnimationMixer {
    constructor(zaaya) {
        this.target = zaaya;
        this.clips = {};
        this.actions = [];
        this.speed = 1;
    }
    addClip(zaaya) {
        this.clips[zaaya.name] = zaaya;
        return this;
    }
    clipAction(zaaya) {
        var zaayb = typeof zaaya === "string" ? this.clips[zaaya] : zaaya;
        if (!zaayb) return null;
        for (var zaayc = 0; zaayc < this.actions.length; zaayc++) if (this.actions[zaayc].clip === zaayb) return this.actions[zaayc];
        var zaayd = new AnimationAction(this, zaayb);
        this.actions.push(zaayd);
        return zaayd;
    }
    play(zaaya, zaayb) {
        var zaayc = this.clipAction(zaaya);
        if (zaayc) {
            if (zaayb !== false) zaayc.reset();
            zaayc.play();
        }
        return zaayc;
    }
    update(zaaya) {
        var zaayb = {};
        for (var zaayc = 0; zaayc < this.actions.length; zaayc++) {
            var zaayd = this.actions[zaayc];
            zaayd.update(zaaya * this.speed);
            if (!zaayd.playing && zaayd.weight <= 0) continue;
            for (var zaaye = 0; zaaye < zaayd.clip.tracks.length; zaaye++) {
                var zaayf = zaayd.clip.tracks[zaaye];
                var zaayg = faoxomresolve(this.target, zaayf.name);
                if (!zaayg.object) continue;
                var zaayh = zaayf.sample(zaayd.time);
                var zaayi = zaayb[zaayf.name];
                if (!zaayi) zaayi = zaayb[zaayf.name] = {
                    object: zaayg.object,
                    key: zaayg.key,
                    weight: 0,
                    values: [],
                    type: zaayf.valueType,
                    size: zaayf.valueSize
                };
                zaayi.weight += zaayd.weight;
                zaayi.values.push({
                    value: zaayh,
                    weight: zaayd.weight
                });
            }
        }
        for (var zaayj in zaayb) {
            var zaayk = zaayb[zaayj];
            var zaayl = zaayk.weight || 1;
            var zaaym = zaayk.values[0].value;
            if (zaayk.type === "number") {
                var zaayn = 0;
                for (var zaayo = 0; zaayo < zaayk.values.length; zaayo++) zaayn += zaayk.values[zaayo].value * zaayk.values[zaayo].weight;
                zaayk.object[zaayk.key] = zaayn / zaayl;
            } else if (zaayk.type === "array") {
                var zaayp = new Array(zaayk.size).fill(0);
                for (var zaayq = 0; zaayq < zaayk.values.length; zaayq++) for (var zaayr = 0; zaayr < zaayk.size; zaayr++) zaayp[zaayr] += zaayk.values[zaayq].value[zaayr] * zaayk.values[zaayq].weight / zaayl;
                if (zaayk.key === "weights" && zaayk.object.morphTargetInfluences) {
                    for (var zaays = 0; zaays < zaayk.object.morphTargetInfluences.length && zaays < zaayp.length; zaays++) zaayk.object.morphTargetInfluences[zaays] = zaayp[zaays];
                } else if (zaayk.key === "weights" && zaayk.object.userData && zaayk.object.userData.meshes) {
                    for (var zaayt = 0; zaayt < zaayk.object.userData.meshes.length; zaayt++) {
                        var zaayu = zaayk.object.userData.meshes[zaayt].morphTargetInfluences;
                        if (zaayu) for (var zaayv = 0; zaayv < zaayu.length && zaayv < zaayp.length; zaayv++) zaayu[zaayv] = zaayp[zaayv];
                    }
                } else zaayk.object[zaayk.key] = zaayp;
            } else {
                var zaayw = zaaym.clone ? zaaym.clone() : zaaym;
                if (zaayw.set) {
                    for (var zaayx = 1; zaayx < zaayk.values.length; zaayx++) {
                        var zaayy = zaayk.values[zaayx].weight / zaayl;
                        if (zaayw.slerp && zaayk.type === "quaternion") zaayw.slerp(zaayk.values[zaayx].value, zaayy); else if (zaayw.lerp) zaayw.lerp(zaayk.values[zaayx].value, zaayy);
                    }
                    zaayk.object[zaayk.key].copy(zaayw);
                }
            }
        }
    }
}

export { AnimationMixer };
