import { Texture } from "./Texture.js";

class VideoTexture extends Texture {
    constructor(video, options) {
        options = options || {};
        var element = typeof video === "string" ? (typeof document !== "undefined" ? document.createElement("video") : null) : video || null;
        if (element && typeof video === "string") { element.src = video; element.crossOrigin = options.crossOrigin || "anonymous"; element.loop = options.loop !== false; element.muted = options.muted !== false; element.playsInline = true; element.setAttribute("playsinline", ""); element.autoplay = options.autoplay !== false; }
        super(element, options);
        this.type = "VideoTexture"; this.isVideoTexture = true; this.video = element; this.image = element; this.loaded = !!element; this.needsUpdate = true; this.lastVideoTime = -1;
        if (element) {
            var self = this;
            element.addEventListener("loadeddata", function() { self.needsUpdate = true; });
            var advance = function() { if (element.readyState >= 2 && element.currentTime !== self.lastVideoTime) { self.lastVideoTime = element.currentTime; self.needsUpdate = true; } };
            if (element.requestVideoFrameCallback) { var frameLoop = function() { advance(); element.requestVideoFrameCallback(frameLoop); }; element.requestVideoFrameCallback(frameLoop); }
            else element.addEventListener("timeupdate", advance);
        }
    }
    play() { return this.video && this.video.play ? this.video.play() : Promise.resolve(); }
    pause() { if (this.video && this.video.pause) this.video.pause(); return this; }
}

export { VideoTexture };
