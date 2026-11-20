import { Texture } from "./Texture.js";

class VideoTexture extends Texture {
    constructor(zavja, zavjb) {
        zavjb = zavjb || {};
        var zavjc = typeof zavja === "string" ? typeof document !== "undefined" ? document.createElement("video") : null : zavja || null;
        if (zavjc && typeof zavja === "string") {
            zavjc.src = zavja;
            zavjc.crossOrigin = zavjb.crossOrigin || "anonymous";
            zavjc.loop = zavjb.loop !== false;
            zavjc.muted = zavjb.muted !== false;
            zavjc.playsInline = true;
            zavjc.setAttribute("playsinline", "");
            zavjc.autoplay = zavjb.autoplay !== false;
        }
        super(zavjc, zavjb);
        this.type = "VideoTexture";
        this.isVideoTexture = true;
        this.video = zavjc;
        this.image = zavjc;
        this.loaded = !!zavjc;
        this.needsUpdate = true;
        this.lastVideoTime = -1;
        if (zavjc) {
            var zavjd = this;
            zavjc.addEventListener("loadeddata", function() {
                zavjd.needsUpdate = true;
            });
            var zavje = function() {
                if (zavjc.readyState >= 2 && zavjc.currentTime !== zavjd.lastVideoTime) {
                    zavjd.lastVideoTime = zavjc.currentTime;
                    zavjd.needsUpdate = true;
                }
            };
            if (zavjc.requestVideoFrameCallback) {
                var zavjf = function() {
                    zavje();
                    zavjc.requestVideoFrameCallback(zavjf);
                };
                zavjc.requestVideoFrameCallback(zavjf);
            } else zavjc.addEventListener("timeupdate", zavje);
        }
    }
    play() {
        return this.video && this.video.play ? this.video.play() : Promise.resolve();
    }
    pause() {
        if (this.video && this.video.pause) this.video.pause();
        return this;
    }
}

export { VideoTexture };
