// WebXRAR - WebXR core for AR sessions (roadmap item 44): immersive-ar
// sessions, viewer/controller hit-test, anchors with lifecycle tracking,
// plane detection wiring, passthrough layer requests and foveated submission
// where the platform exposes them. Fully driven by explicit update(frame)
// calls so it composes with WebXRManager's frame loop and is testable
// against synthetic XR objects.

var WEBXRAR_FEATURES = ["anchors", "plane-detection", "hand-tracking", "dom-overlay", "passthrough"];

class WebXRAR {
    constructor(options) {
        options = options || {};
        this.mode = options.mode || "immersive-ar";
        this.session = null;
        this.referenceSpace = null;
        this.viewerSpace = null;
        this.baseLayer = null;
        this.hitTestSource = null;
        this.anchors = {};
        this.anchorCounter = 0;
        this.planes = [];
        this.passthroughLayer = null;
        this.foveation = null;
        this.hits = [];
        this.enabledFeatures = [];
        this.callbacks = {};
        this.options = options;
        this.referenceSpaceType = options.referenceSpaceType || "local-floor";
        this._frame = null;
    }

    on(event, callback) {
        if (typeof callback !== "function") return this;
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(callback);
        return this;
    }

    emit(event) {
        var list = this.callbacks[event] || [];
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < list.length; i++) {
            try { list[i].apply(this, args); } catch (callbackError) { /* user callback */ }
        }
        return this;
    }

    static async isSupported(mode) {
        if (typeof navigator === "undefined" || !navigator.xr || !navigator.xr.isSessionSupported) return false;
        return await navigator.xr.isSessionSupported(mode || "immersive-ar");
    }

    // Request an immersive-ar session. requestedFeatures is a list drawn from
    // WEBXRAR_FEATURES; unknown names throw so typos fail loudly.
    async supportsSession(mode) {
        if (typeof navigator === "undefined" || !navigator.xr) return false;
        return navigator.xr.isSessionSupported(mode || this.mode);
    }

    async request(requestedFeatures) {
        var features = requestedFeatures || [];
        for (var i = 0; i < features.length; i++) {
            if (WEBXRAR_FEATURES.indexOf(features[i]) === -1) throw new Error("unknown WebXR feature: " + features[i]);
        }
        if (typeof navigator === "undefined" || !navigator.xr) throw new Error("WebXR is not available");
        var init = {
            requiredFeatures: [this.referenceSpaceType].concat(features.indexOf("anchors") !== -1 ? ["anchors"] : []),
            optionalFeatures: features.filter(function (name) { return name !== "anchors"; })
        };
        this.session = await navigator.xr.requestSession(this.mode, init);
        this.enabledFeatures = Array.prototype.slice.call(this.session.enabledFeatures || []);
        this.referenceSpace = await this.session.requestReferenceSpace(this.referenceSpaceType);
        this.viewerSpace = await this.session.requestReferenceSpace("viewer");
        var self = this;
        this.session.addEventListener("end", function () { self._sessionEnded(); });
        if (this.session.addEventListener) {
            this.session.addEventListener("planeschanged", function (event) {
                self.planes = Array.from(event.added || []);
                self.emit("planeschanged", self.getPlanes());
            });
        }
        this.emit("start", this.session);
        return this.session;
    }

    _sessionEnded() {
        this.session = null;
        this.referenceSpace = null;
        this.viewerSpace = null;
        this.hitTestSource = null;
        this.anchors = {};
        this.planes = [];
        this.passthroughLayer = null;
        this.emit("end");
    }

    // Hit testing: sourceType "viewer" (reticle from gaze) or a controller
    // grip/target-ray space.
    async enableHitTest(sourceType, space) {
        if (!this.session) throw new Error("no active session");
        if (this.hitTestSource) this.disableHitTest();
        var hitSpace = space || (sourceType === "viewer" ? this.viewerSpace : null);
        if (!hitSpace) throw new Error("enableHitTest requires a space for non-viewer sources");
        this.hitTestSource = await this.session.requestHitTestSource({ space: hitSpace });
        return this.hitTestSource;
    }

    disableHitTest() {
        if (this.hitTestSource && this.hitTestSource.cancel) this.hitTestSource.cancel();
        this.hitTestSource = null;
        this.hits = [];
        return this;
    }

    // Per-frame update: hit results + anchor pose resolution + callbacks.
    update(frame) {
        if (!frame) return this;
        this._frame = frame;
        if (this.hitTestSource && frame.getHitTestResults) {
            var results = frame.getHitTestResults(this.hitTestSource);
            this.hits = [];
            for (var i = 0; i < results.length; i++) {
                var pose = results[i].getPose ? results[i].getPose(this.referenceSpace) : null;
                if (pose && pose.transform) {
                    this.hits.push({
                        position: pose.transform.position,
                        orientation: pose.transform.orientation,
                        matrix: pose.transform.matrix,
                        hitResult: results[i]
                    });
                }
            }
            if (this.hits.length) this.emit("hit", this.hits.slice());
        }
        var anchorIds = Object.keys(this.anchors);
        for (var a = 0; a < anchorIds.length; a++) {
            var record = this.anchors[anchorIds[a]];
            if (!record.anchor || !record.anchor.anchorSpace || !frame.getPose) continue;
            var anchorPose = frame.getPose(record.anchor.anchorSpace, this.referenceSpace);
            if (anchorPose && anchorPose.transform) {
                record.position = anchorPose.transform.position;
                record.orientation = anchorPose.transform.orientation;
                record.matrix = anchorPose.transform.matrix;
            }
        }
        if (frame.worldInformation && frame.worldInformation.detectedPlanes) {
            this.planes = Array.from(frame.worldInformation.detectedPlanes);
        }
        return this;
    }

    // Creates an anchor from the latest hit result (or a supplied one).
    async createAnchorFromHit(hit) {
        var hitResult = hit || this.hits[0];
        if (!hitResult || !hitResult.hitResult) hitResult = { hitResult: hit };
        if (!hitResult.hitResult || typeof hitResult.hitResult.createAnchor !== "function") throw new Error("no hit result to anchor");
        var anchor = await hitResult.hitResult.createAnchor();
        var id = "anchor-" + (++this.anchorCounter);
        var record = { id: id, anchor: anchor, position: hitResult.position || null, orientation: hitResult.orientation || null, matrix: hitResult.matrix || null };
        this.anchors[id] = record;
        this.emit("anchor", record);
        return record;
    }

    removeAnchor(anchorOrId) {
        var id = typeof anchorOrId === "string" ? anchorOrId : anchorOrId && anchorOrId.id;
        var record = this.anchors[id];
        if (!record) return false;
        if (record.anchor && record.anchor.delete) record.anchor.delete();
        delete this.anchors[id];
        return true;
    }

    getAnchors() {
        return Object.keys(this.anchors).map(function (id) { return this.anchors[id]; }, this);
    }

    getHits() { return this.hits.slice(); }

    // Wrapped plane snapshots (id, orientation, polygon vertices, lastChangedTime).
    getPlanes() {
        return this.planes.map(function (plane, index) {
            return {
                id: plane && plane.planeId !== undefined ? plane.planeId : "plane-" + index,
                orientation: plane && plane.orientation,
                polygon: plane && plane.polygon ? Array.from(plane.polygon) : [],
                lastChangedTime: plane && plane.lastChangedTime !== undefined ? plane.lastChangedTime : 0,
                plane: plane
            };
        });
    }

    hasFeature(name) { return this.enabledFeatures.indexOf(name) !== -1; }

    // Passthrough layers: requested explicitly; returns null (with a console
    // warning) when the platform does not expose XRPassthroughLayer.
    requestPassthrough(options) {
        if (!this.session) return null;
        if (typeof XRPassthroughLayer === "undefined" || typeof this.session.createPassthroughLayer !== "function" || !this.hasFeature("passthrough")) {
            if (typeof console !== "undefined" && console.warn) console.warn("WebXRAR: passthrough layers are not available on this platform");
            return null;
        }
        this.passthroughLayer = this.session.createPassthroughLayer(options || {});
        this.emit("passthrough", this.passthroughLayer);
        return this.passthroughLayer;
    }

    getPassthroughLayer() { return this.passthroughLayer; }

    // Foveated submission: 0 (none) .. 1 (maximum). Applied to the base layer
    // when it supports it; returns the effective level or null.
    setFoveation(level, baseLayer) {
        var layer = baseLayer || this.baseLayer;
        if (!layer || !("foveation" in layer)) {
            if (typeof console !== "undefined" && console.warn) console.warn("WebXRAR: base layer does not support foveation");
            return null;
        }
        var clamped = Math.max(0, Math.min(1, Number(level) || 0));
        layer.foveation = clamped;
        this.foveation = clamped;
        return this.getFoveation(layer);
    }

    getFoveation(baseLayer) {
        var layer = baseLayer || this.baseLayer;
        return layer && typeof layer.foveation === "number" ? layer.foveation : null;
    }

    setBaseLayer(layer) {
        this.baseLayer = layer || null;
        return this;
    }

    // Compose with the legacy WebXRManager: hooks this.update into its
    // per-frame event.
    attachTo(manager) {
        if (!manager || typeof manager.on !== "function") throw new Error("attachTo requires a WebXRManager");
        var self = this;
        manager.on("frame", function (time, frame) { self.update(frame); });
        return this;
    }

    getViewerPose() {
        return this._frame && this.referenceSpace && this._frame.getViewerPose ? this._frame.getViewerPose(this.referenceSpace) : null;
    }

    end() {
        return this.session ? this.session.end() : Promise.resolve();
    }
}

export { WebXRAR };
