import { Quaternion, Vector3 } from "../math/index.js";

class WebXRHandTracker {
    constructor() {
        this.jointNames = [
            "wrist",
            "thumb-metacarpal", "thumb-phalanx-proximal", "thumb-phalanx-distal", "thumb-tip",
            "index-finger-metacarpal", "index-finger-phalanx-proximal", "index-finger-phalanx-intermediate", "index-finger-phalanx-distal", "index-finger-tip",
            "middle-finger-metacarpal", "middle-finger-phalanx-proximal", "middle-finger-phalanx-intermediate", "middle-finger-phalanx-distal", "middle-finger-tip",
            "ring-finger-metacarpal", "ring-finger-phalanx-proximal", "ring-finger-phalanx-intermediate", "ring-finger-phalanx-distal", "ring-finger-tip",
            "pinky-finger-metacarpal", "pinky-finger-phalanx-proximal", "pinky-finger-phalanx-intermediate", "pinky-finger-phalanx-distal", "pinky-finger-tip"
        ];
        this.joints = {};
        for (var i = 0; i < this.jointNames.length; i++) {
            this.joints[this.jointNames[i]] = { position: new Vector3(), orientation: new Quaternion(), radius: 0.01 };
        }
    }
    update(xrHand, frame, refSpace) {
        if (!xrHand || !frame || !refSpace) return;
        for (var i = 0; i < this.jointNames.length; i++) {
            var name = this.jointNames[i];
            var joint = xrHand.get(name);
            if (joint) {
                var pose = frame.getJointPose ? frame.getJointPose(joint, refSpace) : null;
                if (pose && pose.transform) {
                    var pos = pose.transform.position;
                    var rot = pose.transform.orientation;
                    this.joints[name].position.set(pos.x, pos.y, pos.z);
                    this.joints[name].orientation.set(rot.x, rot.y, rot.z, rot.w);
                    this.joints[name].radius = pose.radius || 0.01;
                }
            }
        }
    }
}

export { WebXRHandTracker };
