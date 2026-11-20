var zajla = [ "anchors", "plane-detection", "hand-tracking", "dom-overlay", "passthrough" ];

class WebXRAR {
    constructor(zajla) {
        zajla = zajla || {};
        this.mode = zajla.mode || "immersive-ar";
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
        this.options = zajla;
        this.referenceSpaceType = zajla.referenceSpaceType || "local-floor";
        this._frame = null;
    }
    on(zajla, zajlb) {
        if (typeof zajlb !== "function") return this;
        if (!this.callbacks[zajla]) this.callbacks[zajla] = [];
        this.callbacks[zajla].push(zajlb);
        return this;
    }
    emit(zajla) {
        var zajlb = this.callbacks[zajla] || [];
        var zajlc = Array.prototype.slice.call(arguments, 1);
        for (var zajld = 0; zajld < zajlb.length; zajld++) {
            try {
                zajlb[zajld].apply(this, zajlc);
            } catch (zajla) {}
        }
        return this;
    }
    static async isSupported(zajla) {
        if (typeof navigator === "undefined" || !navigator.xr || !navigator.xr.isSessionSupported) return false;
        return await navigator.xr.isSessionSupported(zajla || "immersive-ar");
    }
    async supportsSession(zajla) {
        if (typeof navigator === "undefined" || !navigator.xr) return false;
        return navigator.xr.isSessionSupported(zajla || this.mode);
    }
    async request(zajlb) {
        var zajlc = zajlb || [];
        for (var zajld = 0; zajld < zajlc.length; zajld++) {
            if (zajla.indexOf(zajlc[zajld]) === -1) throw new Error("unknown WebXR feature: " + zajlc[zajld]);
        }
        if (typeof navigator === "undefined" || !navigator.xr) throw new Error("WebXR is not available");
        var zajle = {
            requiredFeatures: [ this.referenceSpaceType ].concat(zajlc.indexOf("anchors") !== -1 ? [ "anchors" ] : []),
            optionalFeatures: zajlc.filter(function(zajla) {
                return zajla !== "anchors";
            })
        };
        this.session = await navigator.xr.requestSession(this.mode, zajle);
        this.enabledFeatures = Array.prototype.slice.call(this.session.enabledFeatures || []);
        this.referenceSpace = await this.session.requestReferenceSpace(this.referenceSpaceType);
        this.viewerSpace = await this.session.requestReferenceSpace("viewer");
        var zajlf = this;
        this.session.addEventListener("end", function() {
            zajlf._sessionEnded();
        });
        if (this.session.addEventListener) {
            this.session.addEventListener("planeschanged", function(zajla) {
                zajlf.planes = Array.from(zajla.added || []);
                zajlf.emit("planeschanged", zajlf.getPlanes());
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
    async enableHitTest(zajla, zajlb) {
        if (!this.session) throw new Error("no active session");
        if (this.hitTestSource) this.disableHitTest();
        var zajlc = zajlb || (zajla === "viewer" ? this.viewerSpace : null);
        if (!zajlc) throw new Error("enableHitTest requires a space for non-viewer sources");
        this.hitTestSource = await this.session.requestHitTestSource({
            space: zajlc
        });
        return this.hitTestSource;
    }
    disableHitTest() {
        if (this.hitTestSource && this.hitTestSource.cancel) this.hitTestSource.cancel();
        this.hitTestSource = null;
        this.hits = [];
        return this;
    }
    update(zajla) {
        if (!zajla) return this;
        this._frame = zajla;
        if (this.hitTestSource && zajla.getHitTestResults) {
            var zajlb = zajla.getHitTestResults(this.hitTestSource);
            this.hits = [];
            for (var zajlc = 0; zajlc < zajlb.length; zajlc++) {
                var zajld = zajlb[zajlc].getPose ? zajlb[zajlc].getPose(this.referenceSpace) : null;
                if (zajld && zajld.transform) {
                    this.hits.push({
                        position: zajld.transform.position,
                        orientation: zajld.transform.orientation,
                        matrix: zajld.transform.matrix,
                        hitResult: zajlb[zajlc]
                    });
                }
            }
            if (this.hits.length) this.emit("hit", this.hits.slice());
        }
        var zajle = Object.keys(this.anchors);
        for (var zajlf = 0; zajlf < zajle.length; zajlf++) {
            var zajlg = this.anchors[zajle[zajlf]];
            if (!zajlg.anchor || !zajlg.anchor.anchorSpace || !zajla.getPose) continue;
            var zajlh = zajla.getPose(zajlg.anchor.anchorSpace, this.referenceSpace);
            if (zajlh && zajlh.transform) {
                zajlg.position = zajlh.transform.position;
                zajlg.orientation = zajlh.transform.orientation;
                zajlg.matrix = zajlh.transform.matrix;
            }
        }
        if (zajla.worldInformation && zajla.worldInformation.detectedPlanes) {
            this.planes = Array.from(zajla.worldInformation.detectedPlanes);
        }
        return this;
    }
    async createAnchorFromHit(zajla) {
        var zajlb = zajla || this.hits[0];
        if (!zajlb || !zajlb.hitResult) zajlb = {
            hitResult: zajla
        };
        if (!zajlb.hitResult || typeof zajlb.hitResult.createAnchor !== "function") throw new Error("no hit result to anchor");
        var zajlc = await zajlb.hitResult.createAnchor();
        var zajld = "anchor-" + ++this.anchorCounter;
        var zajle = {
            id: zajld,
            anchor: zajlc,
            position: zajlb.position || null,
            orientation: zajlb.orientation || null,
            matrix: zajlb.matrix || null
        };
        this.anchors[zajld] = zajle;
        this.emit("anchor", zajle);
        return zajle;
    }
    removeAnchor(zajla) {
        var zajlb = typeof zajla === "string" ? zajla : zajla && zajla.id;
        var zajlc = this.anchors[zajlb];
        if (!zajlc) return false;
        if (zajlc.anchor && zajlc.anchor.delete) zajlc.anchor.delete();
        delete this.anchors[zajlb];
        return true;
    }
    getAnchors() {
        return Object.keys(this.anchors).map(function(zajla) {
            return this.anchors[zajla];
        }, this);
    }
    getHits() {
        return this.hits.slice();
    }
    getPlanes() {
        return this.planes.map(function(zajla, zajlb) {
            return {
                id: zajla && zajla.planeId !== undefined ? zajla.planeId : "plane-" + zajlb,
                orientation: zajla && zajla.orientation,
                polygon: zajla && zajla.polygon ? Array.from(zajla.polygon) : [],
                lastChangedTime: zajla && zajla.lastChangedTime !== undefined ? zajla.lastChangedTime : 0,
                plane: zajla
            };
        });
    }
    hasFeature(zajla) {
        return this.enabledFeatures.indexOf(zajla) !== -1;
    }
    requestPassthrough(zajla) {
        if (!this.session) return null;
        if (typeof XRPassthroughLayer === "undefined" || typeof this.session.createPassthroughLayer !== "function" || !this.hasFeature("passthrough")) {
            if (typeof console !== "undefined" && console.warn) console.warn("WebXRAR: passthrough layers are not available on this platform");
            return null;
        }
        this.passthroughLayer = this.session.createPassthroughLayer(zajla || {});
        this.emit("passthrough", this.passthroughLayer);
        return this.passthroughLayer;
    }
    getPassthroughLayer() {
        return this.passthroughLayer;
    }
    setFoveation(zajla, zajlb) {
        var zajlc = zajlb || this.baseLayer;
        if (!zajlc || !("foveation" in zajlc)) {
            if (typeof console !== "undefined" && console.warn) console.warn("WebXRAR: base layer does not support foveation");
            return null;
        }
        var zajld = Math.max(0, Math.min(1, Number(zajla) || 0));
        zajlc.foveation = zajld;
        this.foveation = zajld;
        return this.getFoveation(zajlc);
    }
    getFoveation(zajla) {
        var zajlb = zajla || this.baseLayer;
        return zajlb && typeof zajlb.foveation === "number" ? zajlb.foveation : null;
    }
    setBaseLayer(zajla) {
        this.baseLayer = zajla || null;
        return this;
    }
    attachTo(zajla) {
        if (!zajla || typeof zajla.on !== "function") throw new Error("attachTo requires a WebXRManager");
        var zajlb = this;
        zajla.on("frame", function(zajla, zajlc) {
            zajlb.update(zajlc);
        });
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
