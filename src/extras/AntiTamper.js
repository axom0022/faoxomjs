function zagfa(zagfa, zagfb) {
    zagfa = (zagfa ^ 2654435769) >>> 0;
    zagfa = Math.imul(zagfa ^ zagfa >>> 16, 2246822507) >>> 0;
    zagfa = Math.imul(zagfa ^ zagfa >>> 13, 3266489909) >>> 0;
    return (zagfa ^ (zagfb || 0)) >>> 0;
}

var zagfb = [ "WebGL2RenderingContext", "WebGLRenderingContext", "GPUDevice", "WebGPUDevice" ];

class CanaryGrid {
    constructor(zagfa, zagfb) {
        zagfb = zagfb || {};
        this.stride = 8;
        var zagfc = Math.max(1, Math.ceil(zagfa / 4));
        this.buffer = new ArrayBuffer(zagfc * this.stride * 4);
        this.view = new Uint32Array(this.buffer);
        this.tick = 0;
        this.tamperCount = 0;
        this.onTamper = typeof zagfb.onTamper === "function" ? zagfb.onTamper : null;
        this._seed = Math.random() * 4294967295 >>> 0;
        for (var zagfd = 0; zagfd < zagfc; zagfd++) this._stamp(zagfd, 0);
    }
    _stamp(zagfb, zagfc) {
        var zagfd = zagfb * this.stride;
        this.view[zagfd] = zagfc;
        for (var zagfe = 1; zagfe < this.stride; zagfe++) {
            this.view[zagfd + zagfe] = zagfa(this._seed ^ zagfa(zagfb, zagfe), this.tick ^ zagfc);
        }
    }
    set(zagfa, zagfb) {
        zagfb = zagfb >>> 0;
        this._stamp(zagfa, zagfb);
    }
    get(zagfb) {
        var zagfc = zagfb * this.stride;
        var zagfd = this.view[zagfc];
        for (var zagfe = 1; zagfe < this.stride; zagfe++) {
            if (this.view[zagfc + zagfe] !== zagfa(this._seed ^ zagfa(zagfb, zagfe), this.tick ^ zagfd)) {
                this.tamperCount++;
                if (this.onTamper) {
                    try {
                        this.onTamper(zagfb, "canary");
                    } catch (zagfa) {}
                }
                return this.view[zagfc];
            }
        }
        return zagfd;
    }
    verify() {
        var zagfb = this.view.length / this.stride;
        var zagfc = true;
        for (var zagfd = 0; zagfd < zagfb; zagfd++) {
            var zagfe = zagfd * this.stride;
            var zagff = this.view[zagfe];
            for (var zagfg = 1; zagfg < this.stride; zagfg++) {
                if (this.view[zagfe + zagfg] !== zagfa(this._seed ^ zagfa(zagfd, zagfg), this.tick ^ zagff)) {
                    this.tamperCount++;
                    zagfc = false;
                    if (this.onTamper) {
                        try {
                            this.onTamper(zagfd, "canary");
                        } catch (zagfa) {}
                    }
                    break;
                }
            }
        }
        return zagfc;
    }
    advanceTick() {
        this.tick = this.tick + 1 >>> 0;
        var zagfa = this.view.length / this.stride;
        for (var zagfb = 0; zagfb < zagfa; zagfb++) this._stamp(zagfb, this.view[zagfb * this.stride]);
        return this;
    }
}

class SpeedhackDetector {
    constructor(zagfa) {
        zagfa = zagfa || {};
        this.tolerance = zagfa.tolerance || .12;
        this.window = Math.max(30, zagfa.window || 120);
        this._samples = [];
        this._performanceNow = zagfa.performanceNow || function() {
            return typeof performance !== "undefined" ? performance.now() : Date.now();
        };
        this._dateNow = zagfa.dateNow || function() {
            return Date.now();
        };
        this._perfStart = this._performanceNow();
        this._dateStart = this._dateNow();
        this._tickStart = 0;
        this.ticks = 0;
        this.suspect = false;
        this.onSuspect = typeof zagfa.onSuspect === "function" ? zagfa.onSuspect : null;
    }
    tick() {
        this.ticks++;
        if (this.ticks % 5 !== 0) return this;
        var zagfa = this._performanceNow() - this._perfStart;
        var zagfb = this._dateNow() - this._dateStart;
        if (zagfa > 500 && zagfb > 500) {
            this._samples.push(zagfb / zagfa);
            if (this._samples.length > this.window) this._samples.shift();
            var zagfc = 0;
            for (var zagfd = 0; zagfd < this._samples.length; zagfd++) zagfc += this._samples[zagfd];
            zagfc /= this._samples.length || 1;
            if (Math.abs(zagfc - 1) > this.tolerance && this._samples.length >= 12) {
                this.suspect = true;
                if (this.onSuspect) {
                    try {
                        this.onSuspect(zagfc);
                    } catch (zagfa) {}
                }
            } else if (Math.abs(zagfc - 1) <= this.tolerance * .5) {
                this.suspect = false;
            }
        }
        return this;
    }
}

class TrustedInput {
    constructor(zagfa) {
        zagfa = zagfa || {};
        this.strict = zagfa.strict !== false;
        this.rejected = 0;
        this.onReject = typeof zagfa.onReject === "function" ? zagfa.onReject : null;
        this._targets = [];
    }
    attach(zagfa, zagfb, zagfc) {
        var zagfd = this;
        var zagfe = function(zagfa) {
            if (zagfd.strict && zagfa && zagfa.isTrusted === false) {
                zagfd.rejected++;
                if (zagfd.onReject) {
                    try {
                        zagfd.onReject(zagfa);
                    } catch (zagfa) {}
                }
                zagfa.preventDefault();
                zagfa.stopPropagation();
                return;
            }
            zagfc(zagfa);
        };
        var zagff = Array.isArray(zagfb) ? zagfb : String(zagfb).split(/\s+/).filter(Boolean);
        for (var zagfg = 0; zagfg < zagff.length; zagfg++) zagfa.addEventListener(zagff[zagfg], zagfe, {
            passive: false
        });
        this._targets.push({
            target: zagfa,
            types: zagff,
            wrapped: zagfe
        });
        return this;
    }
    detach() {
        for (var zagfa = 0; zagfa < this._targets.length; zagfa++) {
            var zagfb = this._targets[zagfa];
            for (var zagfc = 0; zagfc < zagfb.types.length; zagfc++) zagfb.target.removeEventListener(zagfb.types[zagfc], zagfb.wrapped);
        }
        this._targets = [];
        return this;
    }
}

class FrameKeyChain {
    constructor(zagfa) {
        zagfa = zagfa || {};
        this.maxFrameMs = Math.max(8, zagfa.maxFrameMs || 250);
        this.key = Math.random() * 4294967295 >>> 0;
        this.valid = true;
        this._last = performance.now();
        this._hash = Math.random() * 4294967295 >>> 0;
        this.onInvalidate = typeof zagfa.onInvalidate === "function" ? zagfa.onInvalidate : null;
    }
    advance(zagfb) {
        var zagfc = performance.now();
        var zagfd = zagfc - this._last;
        this._last = zagfc;
        if (zagfd < 0 || zagfd > this.maxFrameMs) {
            this.valid = false;
            if (this.onInvalidate) {
                try {
                    this.onInvalidate(zagfd);
                } catch (zagfa) {}
            }
        }
        this._hash = zagfa(this._hash, zagfb >>> 0);
        this.key = zagfa(this.key, this._hash ^ Math.min(zagfd, this.maxFrameMs));
        return this.key;
    }
    mask(zagfa) {
        var zagfb = new Float32Array(1);
        zagfb[0] = zagfa;
        var zagfc = new Uint32Array(zagfb.buffer)[0] ^ (this.valid ? this.key : 3735929054);
        zagfb[0] = 0;
        new Uint32Array(zagfb.buffer)[0] = zagfc;
        return zagfb[0];
    }
    unmask(zagfa) {
        var zagfb = new Float32Array(1);
        zagfb[0] = zagfa;
        var zagfc = new Uint32Array(zagfb.buffer)[0] ^ (this.valid ? this.key : 3735929054);
        new Uint32Array(zagfb.buffer)[0] = zagfc;
        return zagfb[0];
    }
}

var AntiTamper = {
    CanaryGrid,
    SpeedhackDetector,
    TrustedInput,
    FrameKeyChain,
    freezePrototypes: function(zagfa) {
        var zagfc = zagfa && zagfa.length ? zagfa : zagfb;
        var zagfd = [];
        for (var zagfe = 0; zagfe < zagfc.length; zagfe++) {
            var zagff = typeof globalThis !== "undefined" ? globalThis[zagfc[zagfe]] : null;
            if (zagff && zagff.prototype && !Object.isFrozen(zagff.prototype)) {
                try {
                    Object.freeze(zagff.prototype);
                    zagfd.push(zagfc[zagfe]);
                } catch (zagfa) {}
            }
        }
        return zagfd;
    },
    hardwareSeed: async function(zagfb) {
        var zagfc = new Uint8Array(32);
        if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(zagfc);
        var zagfd = 0;
        for (var zagfe = 0; zagfe < zagfc.length; zagfe += 4) zagfd = zagfa(zagfd, (zagfc[zagfe] | zagfc[zagfe + 1] << 8 | zagfc[zagfe + 2] << 16 | zagfc[zagfe + 3] << 24) >>> 0);
        if (typeof navigator === "undefined" || !navigator.credentials || !navigator.credentials.create) return {
            seed: zagfd,
            hardware: false
        };
        try {
            var zagff = new Uint8Array(32);
            if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(zagff);
            var zagfg = await navigator.credentials.create({
                publicKey: {
                    challenge: zagfb || zagff,
                    rp: {
                        name: "faoxomjs"
                    },
                    user: {
                        id: zagfc.slice(0, 16),
                        name: "faoxom-session",
                        displayName: "faoxom-session"
                    },
                    pubKeyCredParams: [ {
                        type: "public-key",
                        alg: -7
                    }, {
                        type: "public-key",
                        alg: -257
                    } ],
                    authenticatorSelection: {
                        userVerification: "preferred"
                    },
                    timeout: 3e4
                }
            });
            if (zagfg && zagfg.rawId) {
                var zagfh = 305419896;
                for (var zagfi = 0; zagfi < zagfg.rawId.byteLength; zagfi++) zagfh = zagfa(zagfh, zagfg.rawId[zagfi]);
                return {
                    seed: zagfh >>> 0,
                    hardware: true
                };
            }
        } catch (zagfa) {}
        return {
            seed: zagfd,
            hardware: false
        };
    }
};

export { AntiTamper, CanaryGrid, SpeedhackDetector, TrustedInput, FrameKeyChain };
