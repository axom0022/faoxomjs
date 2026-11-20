import { Quaternion, Vector3 } from "../math/index.js";

class WebXRHandTracker {
    constructor() {
        this.jointNames = [ "wrist", "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip", "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip", "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip", "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip", "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip" ];
        this.joints = {};
        for (var zajma = 0; zajma < this.jointNames.length; zajma++) {
            this.joints[this.jointNames[zajma]] = {
                position: new Vector3,
                orientation: new Quaternion,
                radius: .01
            };
        }
    }
    update(zajma, zajmb, zajmc) {
        if (!zajma || !zajmb || !zajmc) return;
        for (var zajmd = 0; zajmd < this.jointNames.length; zajmd++) {
            var zajme = this.jointNames[zajmd];
            var zajmf = zajma.get(zajme);
            if (zajmf) {
                var zajmg = zajmb.getJointPose ? zajmb.getJointPose(zajmf, zajmc) : null;
                if (zajmg && zajmg.transform) {
                    var zajmh = zajmg.transform.position;
                    var zajmi = zajmg.transform.orientation;
                    this.joints[zajme].position.set(zajmh.x, zajmh.y, zajmh.z);
                    this.joints[zajme].orientation.set(zajmi.x, zajmi.y, zajmi.z, zajmi.w);
                    this.joints[zajme].radius = zajmg.radius || .01;
                }
            }
        }
    }
}

export { WebXRHandTracker };
