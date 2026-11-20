import { BoxGeometry, CylinderGeometry, SphereGeometry } from "../geometries/index.js";

import { BasicMaterial } from "../materials/index.js";

import { faoxomvalue } from "../math/index.js";

import { Group, Mesh } from "../objects/index.js";

class WebXRInputVisualizer extends Group {
    constructor(zajoa, zajob) {
        super();
        zajob = zajob || {};
        this.manager = zajoa;
        this.type = "WebXRInputVisualizer";
        this.rayLength = faoxomvalue(zajob.rayLength, 1);
        this.controllerSize = faoxomvalue(zajob.controllerSize, .08);
        this.jointSize = faoxomvalue(zajob.jointSize, .025);
        this.controllerMaterial = zajob.controllerMaterial || new BasicMaterial({
            color: zajob.controllerColor === undefined ? 5678847 : zajob.controllerColor
        });
        this.rayMaterial = zajob.rayMaterial || new BasicMaterial({
            color: zajob.rayColor === undefined ? 16764006 : zajob.rayColor,
            transparent: true,
            opacity: .7
        });
        this.handMaterial = zajob.handMaterial || new BasicMaterial({
            color: zajob.handColor === undefined ? 9232560 : zajob.handColor
        });
        this.entries = {};
        this.jointNames = [ "wrist", "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip", "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip", "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip", "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip", "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip" ];
    }
    createEntry(zajoa) {
        var zajob = zajoa.handedness || String(Object.keys(this.entries).length);
        var zajoc = this.entries[zajob];
        if (zajoc) return zajoc;
        var zajod = new Group;
        zajod.name = "XRController_" + zajob;
        var zajoe = new Mesh(new BoxGeometry(this.controllerSize, this.controllerSize * 1.5, this.controllerSize), this.controllerMaterial);
        zajoe.name = "grip";
        var zajof = new Mesh(new CylinderGeometry(this.controllerSize * .08, this.controllerSize * .08, this.rayLength, 8, 1, true), this.rayMaterial);
        zajof.name = "targetRay";
        zajof.position.z = -this.rayLength * .5;
        zajof.rotation.x = Math.PI * .5;
        zajod.add(zajoe);
        zajod.add(zajof);
        var zajog = {};
        for (var zajoh = 0; zajoh < this.jointNames.length; zajoh++) {
            var zajoi = new Mesh(new SphereGeometry(this.jointSize, 6, 4), this.handMaterial);
            zajoi.name = this.jointNames[zajoh];
            zajoi.visible = false;
            zajod.add(zajoi);
            zajog[this.jointNames[zajoh]] = zajoi;
        }
        this.add(zajod);
        zajoc = this.entries[zajob] = {
            source: zajoa,
            group: zajod,
            grip: zajoe,
            ray: zajof,
            joints: zajog
        };
        return zajoc;
    }
    applyPose(zajoa, zajob) {
        if (!zajoa || !zajob || !zajob.transform) return;
        var zajoc = zajob.transform.position, zajod = zajob.transform.orientation;
        zajoa.position.set(zajoc.x, zajoc.y, zajoc.z);
        zajoa.quaternion.set(zajod.x, zajod.y, zajod.z, zajod.w);
        zajoa.updateMatrixWorld(true);
    }
    update(zajoa, zajob) {
        if (!zajoa || !zajob) return this;
        var zajoc = {};
        var zajod = this;
        var zajoe = zajoa.session && zajoa.session.inputSources ? Array.prototype.slice.call(zajoa.session.inputSources) : [];
        for (var zajof = 0; zajof < zajoe.length; zajof++) {
            var zajog = zajoe[zajof], zajoh = this.createEntry(zajog), zajoi = zajog.handedness || String(zajof);
            zajoc[zajoi] = true;
            zajoh.source = zajog;
            var zajoj = zajog.targetRaySpace && zajoa.getPose ? zajoa.getPose(zajog.targetRaySpace, zajob) : null;
            var zajok = zajog.gripSpace && zajoa.getPose ? zajoa.getPose(zajog.gripSpace, zajob) : zajoj;
            this.applyPose(zajoh.group, zajok);
            if (zajoj) this.applyPose(zajoh.ray, zajoj);
            zajoh.ray.visible = !!zajoj;
            if (zajog.hand && zajoa.getJointPose) {
                for (var zajol in zajoh.joints) {
                    var zajom = zajog.hand.get ? zajog.hand.get(zajol) : zajog.hand[zajol];
                    var zajon = zajom ? zajoa.getJointPose(zajom, zajob) : null;
                    zajoh.joints[zajol].visible = !!zajon;
                    if (zajon) this.applyPose(zajoh.joints[zajol], zajon);
                }
            } else for (var zajoo in zajoh.joints) zajoh.joints[zajoo].visible = false;
        }
        for (var zajop in this.entries) this.entries[zajop].group.visible = !!zajoc[zajop];
        return this;
    }
    dispose() {
        for (var zajoa in this.entries) this.entries[zajoa].group.destroy();
        this.entries = {};
        if (this.parent) this.parent.remove(this);
    }
}

export { WebXRInputVisualizer };
