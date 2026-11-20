import { OrthographicCamera, PerspectiveCamera } from "../camera/index.js";

import { ACESFilmicToneMapping, AdditiveBlending, BackSide, DoubleSide, FrontSide, MultiplyBlending, NormalBlending, ReinhardToneMapping, SRGBColorSpace, SubtractiveBlending, faoxomprepareshadersource, faoxomstate } from "../core/index.js";

import { faoxomfrustumvisible } from "../helpers/index.js";

import { Light } from "../lights/index.js";

import { LTCLookup } from "../lights/LTCLookup.js";

import { BlenderFidelityProfile } from "../loaders/index.js";

import { BasicMaterial, LineBasicMaterial, LineMaterial, Material, PointsMaterial, ShaderMaterial } from "../materials/index.js";

import { Color, Matrix3, Matrix4, Vector2, Vector3, Vector4, faoxomclamp, faoxomvalue } from "../math/index.js";

import { InstancedMesh, LOD, Line, LineLoop, LineSegments, Mesh, Points, Sprite } from "../objects/index.js";

import { OcclusionCuller } from "./OcclusionCuller.js";

import { WebGLRenderTarget } from "./WebGLRenderTarget.js";

class WebGLRenderer {
    constructor(zauga) {
        zauga = zauga || {};
        faoxomstate.faoxomdefaultrenderer = this;
        this.canvas = zauga.canvas || null;
        if (!this.canvas && typeof document !== "undefined") {
            this.canvas = document.createElement("canvas");
            if (zauga.append !== false && document.body) document.body.appendChild(this.canvas);
        }
        this.context = null;
        this.gl = null;
        this.pixelRatio = faoxomvalue(zauga.pixelRatio, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
        this.width = 1;
        this.height = 1;
        this.clearColor = new Color(faoxomvalue(zauga.clearColor, 0));
        this.clearAlpha = faoxomvalue(zauga.clearAlpha, 1);
        this.autoClear = zauga.autoClear !== false;
        this.outputColorSpace = zauga.outputColorSpace || "srgb";
        this.currentRenderTarget = null;
        this.programCache = {};
        this.bufferCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.instanceBufferCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.textureCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.cubeTextureCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.renderQueue = [];
        this.autoBatch = zauga.autoBatch !== false;
        this.autoBatchMin = Math.max(2, Math.floor(faoxomvalue(zauga.autoBatchMin, 2)));
        this.autoBatchCache = {};
        this.staticSceneCache = typeof WeakMap !== "undefined" ? new WeakMap : null;
        this.logarithmicDepthBuffer = !!zauga.logarithmicDepthBuffer;
        this.clippingPlanes = [];
        this.shadowMap = {
            enabled: false,
            size: 1024,
            type: "pcf"
        };
        this.toneMapping = zauga.toneMapping === "aces" ? 2 : zauga.toneMapping === "reinhard" ? 1 : 0;
        this.exposure = faoxomvalue(zauga.exposure, 1);
        this.gamma = faoxomvalue(zauga.gamma, 2.2);
        this.instanceExtension = undefined;
        this.anisotropyExtension = undefined;
        this.shadowProgram = null;
        this.pointShadowProgram = null;
        this.postProcessing = null;
        this.occlusionCuller = new OcclusionCuller(this);
        this._postProcessingLock = false;
        this.info = {
            render: {
                calls: 0,
                triangles: 0,
                frame: 0
            }
        };
        this.initContext(zauga);
    }
    initContext(zauga) {
        if (!this.canvas || !this.canvas.getContext) return;
        zauga = zauga || {};
        var zaugb = {};
        for (var zaugc in zauga) zaugb[zaugc] = zauga[zaugc];
        if (zaugb.antialias === undefined) zaugb.antialias = true;
        if (zaugb.xrCompatible === undefined) zaugb.xrCompatible = !!zauga.xrCompatible;
        var zaugd = this.canvas.getContext("webgl2", zaugb);
        this.isWebGL2 = !!zaugd;
        this.gl = zaugd || this.canvas.getContext("webgl", zaugb) || this.canvas.getContext("experimental-webgl", zaugb);
        this.context = this.gl;
        if (this.gl && this.isWebGL2 && this.gl.getExtension) {
            try {
                this.gl.getExtension("EXT_color_buffer_float");
            } catch (zauga) {}
            try {
                this.gl.getExtension("EXT_color_buffer_half_float");
            } catch (zauga) {}
            try {
                this.gl.getExtension("OES_texture_float_linear");
            } catch (zauga) {}
        }
        if (this.gl && typeof window !== "undefined") window._faoxomGL = this.gl;
        if (this.canvas.clientWidth || this.canvas.clientHeight) this.setSize(this.canvas.clientWidth || 1, this.canvas.clientHeight || 1, false);
    }
    createRenderTarget(zauga, zaugb, zaugc) {
        zaugc = Object.assign({}, zaugc || {}, {
            renderer: this
        });
        return new WebGLRenderTarget(zauga, zaugb, zaugc);
    }
    setRenderTarget(zauga) {
        var zaugb = this.currentRenderTarget;
        this.currentRenderTarget = zauga || null;
        if (zauga && (!zauga.renderer || !zauga.renderer.gl)) {
            zauga.renderer = this;
            zauga.resize(zauga.width, zauga.height);
        }
        if (this.gl) {
            if (zaugb && zaugb !== zauga && zaugb.settle && zaugb.msaaFramebuffer) zaugb.settle();
            var zaugc = zauga && zauga.viewport;
            var zaugd = zauga ? zauga.width : this.canvas.width;
            var zauge = zauga ? zauga.height : this.canvas.height;
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, zauga ? zauga.msaaFramebuffer || zauga.framebuffer : null);
            this.gl.viewport(zaugc ? zaugc.x : 0, zaugc ? zaugc.y : 0, zaugc ? zaugc.width : zaugd, zaugc ? zaugc.height : zauge);
            if (zauga) {
                var zaugf = this.gl, zaugg = this._maxCombinedTextureUnits || (this._maxCombinedTextureUnits = zaugf.getParameter(zaugf.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 8);
                for (var zaugh = 0; zaugh < Math.min(zaugg, 16); zaugh++) {
                    zaugf.activeTexture(zaugf.TEXTURE0 + zaugh);
                    zaugf.bindTexture(zaugf.TEXTURE_2D, null);
                }
                zaugf.activeTexture(zaugf.TEXTURE0);
            }
            if (this.isWebGL2 && this.gl.drawBuffers && zauga && zauga.textureCount > 1 && zauga.textures && zauga.textures.length > 1) {
                var zaugi = [];
                for (var zaugj = 0; zaugj < zauga.textures.length; zaugj++) zaugi.push(this.gl.COLOR_ATTACHMENT0 + zaugj);
                this.gl.drawBuffers(zaugi);
            }
        }
        return this;
    }
    clear(zauga, zaugb, zaugc) {
        if (!this.gl) return this;
        var zaugd = this.gl, zauge = this.currentRenderTarget, zaugf = 0;
        if (zauga !== false) zaugf |= zaugd.COLOR_BUFFER_BIT;
        if (zaugb !== false) zaugf |= zaugd.DEPTH_BUFFER_BIT;
        if (zaugc) zaugf |= zaugd.STENCIL_BUFFER_BIT;
        zaugd.bindFramebuffer(zaugd.FRAMEBUFFER, zauge ? zauge.msaaFramebuffer || zauge.framebuffer : null);
        if (zauga !== false) this.setClearColor(this.clearColor, this.clearAlpha);
        zaugd.clear(zaugf);
        return this;
    }
    setPixelRatio(zauga) {
        this.pixelRatio = zauga;
        return this.resize(this.width, this.height);
    }
    setSize(zauga, zaugb, zaugc) {
        this.width = Math.max(1, zauga);
        this.height = Math.max(1, zaugb);
        if (this.canvas) {
            this.canvas.width = Math.floor(this.width * this.pixelRatio);
            this.canvas.height = Math.floor(this.height * this.pixelRatio);
            if (zaugc !== false && this.canvas.style) {
                this.canvas.style.width = this.width + "px";
                this.canvas.style.height = this.height + "px";
            }
        }
        if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        return this;
    }
    resize(zauga, zaugb) {
        return this.setSize(zauga || this.width, zaugb || this.height, true);
    }
    getContext() {
        return this.gl;
    }
    getSize(zauga) {
        if (zauga && zauga.set) return zauga.set(this.width, this.height);
        return {
            width: this.width,
            height: this.height
        };
    }
    getDrawingBufferSize(zauga) {
        var zaugb = this.canvas ? this.canvas.width : this.width, zaugc = this.canvas ? this.canvas.height : this.height;
        if (zauga && zauga.set) return zauga.set(zaugb, zaugc);
        return {
            width: zaugb,
            height: zaugc
        };
    }
    getPixelRatio() {
        return this.pixelRatio;
    }
    setOutputColorSpace(zauga) {
        this.outputColorSpace = zauga || SRGBColorSpace;
        return this;
    }
    getOutputColorSpace() {
        return this.outputColorSpace;
    }
    setToneMapping(zauga) {
        this.toneMapping = zauga === ReinhardToneMapping || zauga === 1 ? 1 : zauga === ACESFilmicToneMapping || zauga === 2 ? 2 : 0;
        return this;
    }
    getRenderTarget() {
        return this.currentRenderTarget;
    }
    setScissorTest(zauga) {
        this.scissorTest = !!zauga;
        if (this.gl) {
            if (zauga) this.gl.enable(this.gl.SCISSOR_TEST); else this.gl.disable(this.gl.SCISSOR_TEST);
        }
        return this;
    }
    setScissor(zauga, zaugb, zaugc, zaugd) {
        if (this.gl) {
            var zauge = this.pixelRatio || 1;
            this.gl.scissor(zauga * zauge, zaugb * zauge, zaugc * zauge, zaugd * zauge);
        }
        return this;
    }
    setViewport(zauga, zaugb, zaugc, zaugd) {
        if (this.gl) {
            var zauge = this.pixelRatio || 1;
            this.gl.viewport(zauga * zauge, zaugb * zauge, zaugc * zauge, zaugd * zauge);
        }
        return this;
    }
    resetState() {
        if (!this.gl) return this;
        var zauga = this.gl;
        zauga.bindFramebuffer(zauga.FRAMEBUFFER, null);
        zauga.bindBuffer(zauga.ARRAY_BUFFER, null);
        zauga.bindBuffer(zauga.ELEMENT_ARRAY_BUFFER, null);
        if (zauga.bindVertexArray) {
            try {
                zauga.bindVertexArray(null);
            } catch (zauga) {}
        }
        if (zauga.useProgram) zauga.useProgram(null);
        if (zauga.activeTexture) zauga.activeTexture(zauga.TEXTURE0);
        if (zauga.bindTexture) {
            zauga.bindTexture(zauga.TEXTURE_2D, null);
            zauga.bindTexture(zauga.TEXTURE_CUBE_MAP, null);
        }
        this.currentRenderTarget = null;
        this.currentProgram = null;
        this._basicState = null;
        return this;
    }
    initTexture(zauga) {
        if (zauga) this.getTexture(zauga);
        return this;
    }
    readRenderTargetPixels(zauga, zaugb, zaugc, zaugd, zauge, zaugf) {
        if (!this.gl || !zauga) return this;
        var zaugg = this.gl, zaugh = this.currentRenderTarget;
        zaugg.bindFramebuffer(zaugg.FRAMEBUFFER, zauga.framebuffer);
        zaugg.readPixels(zaugb || 0, zaugc || 0, zaugd || zauga.width, zauge || zauga.height, zaugg.RGBA, zaugf instanceof Float32Array && zaugg.FLOAT ? zaugg.FLOAT : zaugg.UNSIGNED_BYTE, zaugf);
        zaugg.bindFramebuffer(zaugg.FRAMEBUFFER, zaugh ? zaugh.framebuffer : null);
        return this;
    }
    readRenderTargetPixelsAsync(zauga, zaugb, zaugc, zaugd, zauge, zaugf) {
        var zaugg = this, zaugh = this.gl;
        if (!zaugh || !zauga) return Promise.resolve(zaugf || null);
        var zaugi = zaugb || 0, zaugj = zaugc || 0, zaugk = zaugd || zauga.width, zaugl = zauge || zauga.height;
        var zaugm = zaugf || new Uint8Array(zaugk * zaugl * 4);
        if (!this.isWebGL2 || !zaugh.PIXEL_PACK_BUFFER || !zaugh.fenceSync || !zaugh.clientWaitSync) return new Promise(function(zaugb) {
            zaugg.readRenderTargetPixels(zauga, zaugi, zaugj, zaugk, zaugl, zaugm);
            zaugb(zaugm);
        });
        var zaugn = this.currentRenderTarget;
        var zaugo = zaugm instanceof Float32Array && zaugh.FLOAT ? zaugh.FLOAT : zaugh.UNSIGNED_BYTE;
        return new Promise(function(zaugb, zaugc) {
            var zaugd = zaugh.createBuffer();
            zaugh.bindFramebuffer(zaugh.FRAMEBUFFER, zauga.framebuffer);
            zaugh.bindBuffer(zaugh.PIXEL_PACK_BUFFER, zaugd);
            zaugh.bufferData(zaugh.PIXEL_PACK_BUFFER, zaugm.byteLength || zaugm.length, zaugh.STREAM_READ);
            zaugh.readPixels(zaugi, zaugj, zaugk, zaugl, zaugh.RGBA, zaugo, 0);
            zaugh.bindBuffer(zaugh.PIXEL_PACK_BUFFER, null);
            var zauge = zaugh.fenceSync(zaugh.SYNC_GPU_COMMANDS_COMPLETE, 0);
            zaugh.flush();
            var zaugf = function() {
                var zauga = zaugh.clientWaitSync(zauge, 0, 0);
                if (zauga === zaugh.WAIT_FAILED) {
                    zaugh.deleteSync(zauge);
                    zaugh.deleteBuffer(zaugd);
                    zaugh.bindFramebuffer(zaugh.FRAMEBUFFER, zaugn ? zaugn.framebuffer : null);
                    zaugc(new Error("GPU readback failed"));
                    return;
                }
                if (zauga === zaugh.TIMEOUT_EXPIRED) {
                    setTimeout(zaugf, 4);
                    return;
                }
                zaugh.bindBuffer(zaugh.PIXEL_PACK_BUFFER, zaugd);
                zaugh.getBufferSubData(zaugh.PIXEL_PACK_BUFFER, 0, zaugm, 0, zaugm.length);
                zaugh.bindBuffer(zaugh.PIXEL_PACK_BUFFER, null);
                zaugh.deleteBuffer(zaugd);
                zaugh.deleteSync(zauge);
                zaugh.bindFramebuffer(zaugh.FRAMEBUFFER, zaugn ? zaugn.framebuffer : null);
                zaugb(zaugm);
            };
            zaugf();
        });
    }
    copyFramebufferToTexture(zauga, zaugb, zaugc) {
        var zaugd = this.gl;
        if (!zaugd || !zaugb) return this;
        var zauge = typeof WebGLTexture !== "undefined" && zaugb instanceof WebGLTexture ? zaugb : this.getTexture(zaugb);
        if (!zauge) return this;
        var zaugf = this.currentRenderTarget;
        var zaugg = zaugf ? zaugf.width : this.canvas.width;
        var zaugh = zaugf ? zaugf.height : this.canvas.height;
        zaugd.bindFramebuffer(zaugd.FRAMEBUFFER, zaugf ? zaugf.msaaFramebuffer || zaugf.framebuffer : null);
        if (zaugd.pixelStorei) zaugd.pixelStorei(zaugd.UNPACK_FLIP_Y_WEBGL, false);
        zaugd.bindTexture(zaugd.TEXTURE_2D, zauge);
        zaugd.copyTexSubImage2D(zaugd.TEXTURE_2D, zaugc || 0, zauga && zauga.x ? Math.floor(zauga.x) : 0, zauga && zauga.y ? Math.floor(zauga.y) : 0, 0, 0, zaugg, zaugh);
        zaugd.bindTexture(zaugd.TEXTURE_2D, null);
        return this;
    }
    copyTextureToTexture(zauga, zaugb, zaugc, zaugd) {
        var zauge = this.gl;
        if (!zauge || !zaugb || !zaugc) return this;
        var zaugf = typeof WebGLTexture !== "undefined" && zaugb instanceof WebGLTexture ? zaugb : this.getTexture(zaugb);
        var zaugg = typeof WebGLTexture !== "undefined" && zaugc instanceof WebGLTexture ? zaugc : this.getTexture(zaugc);
        if (!zaugf || !zaugg) return this;
        var zaugh = zauga && zauga.x ? Math.floor(zauga.x) : 0;
        var zaugi = zauga && zauga.y ? Math.floor(zauga.y) : 0;
        var zaugj = zaugb.width || zaugb.image && zaugb.image.width || 1;
        var zaugk = zaugb.height || zaugb.image && zaugb.image.height || 1;
        if (this.isWebGL2 && zauge.blitFramebuffer) {
            var zaugl = zauge.createFramebuffer(), zaugm = zauge.createFramebuffer();
            zauge.bindFramebuffer(zauge.READ_FRAMEBUFFER, zaugl);
            zauge.framebufferTexture2D(zauge.READ_FRAMEBUFFER, zauge.COLOR_ATTACHMENT0, zauge.TEXTURE_2D, zaugf, zaugd || 0);
            zauge.readBuffer(zauge.COLOR_ATTACHMENT0);
            zauge.bindFramebuffer(zauge.DRAW_FRAMEBUFFER, zaugm);
            zauge.framebufferTexture2D(zauge.DRAW_FRAMEBUFFER, zauge.COLOR_ATTACHMENT0, zauge.TEXTURE_2D, zaugg, zaugd || 0);
            zauge.blitFramebuffer(0, 0, zaugj, zaugk, zaugh, zaugi, zaugh + zaugj, zaugi + zaugk, zauge.COLOR_BUFFER_BIT, zauge.NEAREST);
            zauge.bindFramebuffer(zauge.FRAMEBUFFER, this.currentRenderTarget ? this.currentRenderTarget.msaaFramebuffer || this.currentRenderTarget.framebuffer : null);
            zauge.deleteFramebuffer(zaugl);
            zauge.deleteFramebuffer(zaugm);
            return this;
        }
        var zaugn = zaugb.image || zaugb.data;
        if (zaugn) {
            zauge.bindTexture(zauge.TEXTURE_2D, zaugg);
            if (zaugb.isDataTexture && zaugb.data) zauge.texSubImage2D(zauge.TEXTURE_2D, zaugd || 0, zaugh, zaugi, zaugb.width, zaugb.height, zauge.RGBA, zauge.UNSIGNED_BYTE, zaugb.data); else zauge.texSubImage2D(zauge.TEXTURE_2D, zaugd || 0, zaugh, zaugi, zauge.RGBA, zauge.UNSIGNED_BYTE, zaugn);
            zauge.bindTexture(zauge.TEXTURE_2D, null);
        }
        return this;
    }
    compile(zauga, zaugb) {
        if (!zauga || !this.gl) return this;
        var zaugc = this, zaugd = [];
        zauga.traverse(function(zauga) {
            if (!zauga || !zauga.geometry || !zauga.material || !(zauga.material instanceof Material)) return;
            var zaugb = zauga.material;
            if (zaugd.indexOf(zaugb) !== -1) return;
            zaugd.push(zaugb);
            if (zaugb instanceof ShaderMaterial) zaugc.getShaderProgram(zaugb, zauga); else if (zaugb instanceof BasicMaterial && !zaugb.diffuseMap && !zaugb.normalMap && !zaugb.vertexColors && !zaugb.wireframe && !zaugb.alphaTest && !(zauga.morphTargetInfluences && zauga.morphTargetInfluences.length) && !zauga.skeleton) zaugc.getBasicProgram(zauga instanceof InstancedMesh && zauga.count > 0 && !!zaugc.getInstanceExtension()); else zaugc.getProgram(zaugb, zauga);
        });
        this.info.compileCount = (this.info.compileCount || 0) + zaugd.length;
        return this;
    }
    compileAsync(zauga, zaugb) {
        var zaugc = this;
        return new Promise(function(zaugd, zauge) {
            setTimeout(function() {
                try {
                    zaugc.compile(zauga, zaugb);
                    zaugd(zaugc);
                } catch (zauga) {
                    zauge(zauga);
                }
            }, 0);
        });
    }
    forceContextLoss() {
        var zauga = this.gl;
        if (!zauga || !zauga.getExtension) return this;
        var zaugb = zauga.getExtension("WEBGL_lose_context");
        if (zaugb && zaugb.loseContext) {
            zaugb.loseContext();
            this._contextLossExtension = zaugb;
        }
        return this;
    }
    forceContextRestore() {
        var zauga = this._contextLossExtension;
        if (!zauga && this.gl && this.gl.getExtension) zauga = this._contextLossExtension = this.gl.getExtension("WEBGL_lose_context");
        if (zauga && zauga.restoreContext) zauga.restoreContext();
        return this;
    }
    clearDepth() {
        if (!this.gl) return this;
        var zauga = this.gl, zaugb = this.currentRenderTarget;
        zauga.bindFramebuffer(zauga.FRAMEBUFFER, zaugb ? zaugb.msaaFramebuffer || zaugb.framebuffer : null);
        zauga.clear(zauga.DEPTH_BUFFER_BIT);
        return this;
    }
    clearStencil() {
        if (!this.gl) return this;
        var zauga = this.gl, zaugb = this.currentRenderTarget;
        zauga.bindFramebuffer(zauga.FRAMEBUFFER, zaugb ? zaugb.msaaFramebuffer || zaugb.framebuffer : null);
        zauga.clear(zauga.STENCIL_BUFFER_BIT);
        return this;
    }
    getMaxAnisotropy() {
        if (this._maxAnisotropy !== undefined) return this._maxAnisotropy;
        var zauga = this.getAnisotropyExtension();
        this._maxAnisotropy = zauga && this.gl ? this.gl.getParameter(zauga.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1 : 1;
        return this._maxAnisotropy;
    }
    setAnimationLoop(zauga) {
        if (this._animationFrame && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this._animationFrame);
        this._animationFrame = null;
        this._animationLoop = zauga || null;
        if (zauga && typeof requestAnimationFrame !== "undefined") {
            var zaugb = this, zaugc = function(zauga) {
                zaugb._animationFrame = requestAnimationFrame(zaugc);
                if (!zaugb._animationLoop) {
                    if (zaugb._animationFrame && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(zaugb._animationFrame);
                    zaugb._animationFrame = null;
                    return;
                }
                zaugb._animationLoop(zauga);
            };
            this._animationFrame = requestAnimationFrame(zaugc);
        }
        return this;
    }
    setClearColor(zauga, zaugb) {
        this.clearColor.set(zauga);
        if (zaugb !== undefined) this.clearAlpha = zaugb;
        if (this.gl) this.gl.clearColor(this.clearColor.r, this.clearColor.g, this.clearColor.b, this.clearAlpha);
        return this;
    }
    compileShader(zauga, zaugb) {
        var zaugc = this.gl;
        if (!zaugc) return null;
        var zaugd = zaugc.createShader(zauga);
        zaugc.shaderSource(zaugd, zaugb);
        zaugc.compileShader(zaugd);
        if (!zaugc.getShaderParameter(zaugd, zaugc.COMPILE_STATUS)) {
            zaugc.deleteShader(zaugd);
            return null;
        }
        return zaugd;
    }
    getShaderProgram(zauga, zaugb) {
        var zaugc = this.gl;
        if (!zaugc) return null;
        var zaugd = !!this.isWebGL2 && (zauga.glslVersion === 300 || zauga.glslVersion === "300 es" || /^\s*#version\s+300\s+es/m.test(zauga.vertexShader) || /^\s*#version\s+300\s+es/m.test(zauga.fragmentShader));
        var zauge = zaugd ? "in" : "attribute";
        var zaugf = !!(zaugb && zaugb instanceof InstancedMesh);
        var zaugg = zaugf && !!(zaugb && (zaugb.instanceColor || zaugb.geometry && zaugb.geometry.attributes && zaugb.geometry.attributes.instanceColor));
        var zaugh = !!(zaugb && zaugb.geometry && zaugb.geometry.attributes && (zaugb.geometry.attributes.color || zaugb.geometry.attributes.colors));
        var zaugi = "";
        var zaugj = zauga.defines || {};
        for (var zaugk in zaugj) zaugi += "#define " + zaugk + (zaugj[zaugk] === true || zaugj[zaugk] === 1 ? "" : " " + zaugj[zaugk]) + "\n";
        if (zaugf) zaugi += "#define USE_INSTANCING\n";
        if (zaugg) zaugi += "#define USE_INSTANCING_COLOR\n";
        if (zaugh) zaugi += "#define USE_COLOR\n";
        var zaugl = "";
        var zaugm = [ [ "position", "vec3", zauge + " vec3 position;" ], [ "normal", "vec3", zauge + " vec3 normal;" ], [ "uv", "vec2", zauge + " vec2 uv;" ], [ "color", "vec3", zauge + " vec3 color;" ], [ "instanceMatrix", "mat4", zauge + " mat4 instanceMatrix;" ], [ "instanceColor", "vec3", zauge + " vec3 instanceColor;" ] ];
        for (var zaugn = 0; zaugn < zaugm.length; zaugn++) {
            var zaugo = new RegExp("(?:layout\\s*\\([^)]*\\)\\s*)?(?:attribute|in)\\s+(?:(?:lowp|mediump|highp)\\s+)?\\w+\\s+" + zaugm[zaugn][0] + "\\s*;");
            if (!zaugo.test(zauga.vertexShader)) zaugl += zaugm[zaugn][2] + "\n";
        }
        var zaugp = [ "modelMatrix", "modelViewMatrix", "viewMatrix", "projectionMatrix", "normalMatrix" ];
        for (var zaugq = 0; zaugq < zaugp.length; zaugq++) {
            var zaugr = zaugp[zaugq] === "normalMatrix" ? "mat3" : "mat4";
            if (zauga.vertexShader.indexOf("uniform " + zaugr + " " + zaugp[zaugq]) < 0) zaugl += "uniform " + zaugr + " " + zaugp[zaugq] + ";\n";
        }
        var zaugs = faoxomprepareshadersource(zaugi + zaugl + zauga.vertexShader, "vertex", zaugd);
        var zaugt = faoxomprepareshadersource(zaugi + zauga.fragmentShader, "fragment", zaugd);
        var zaugu = (zauga.side || 0) + ":" + (zaugf ? "i" : "ni") + ":" + (zaugg ? "c" : "nc");
        if (zauga._cachedProgKey === zaugu && zauga._cachedProg && !zauga.needsUpdate) return zauga._cachedProg;
        var zaugv = "shader:" + zaugs + "\n---\n" + zaugt + ":" + zaugu;
        if (this.programCache[zaugv]) return this.programCache[zaugv];
        var zaugw = this.compileShader(zaugc.VERTEX_SHADER, zaugs);
        var zaugx = this.compileShader(zaugc.FRAGMENT_SHADER, zaugt);
        if (!zaugw || !zaugx) return null;
        var zaugy = zaugc.createProgram();
        zaugc.attachShader(zaugy, zaugw);
        zaugc.attachShader(zaugy, zaugx);
        zaugc.bindAttribLocation(zaugy, 0, "position");
        zaugc.bindAttribLocation(zaugy, 1, "normal");
        zaugc.bindAttribLocation(zaugy, 2, "uv");
        zaugc.bindAttribLocation(zaugy, 3, "color");
        zaugc.bindAttribLocation(zaugy, 6, "instanceMatrix");
        zaugc.bindAttribLocation(zaugy, 10, "instanceColor");
        zaugc.linkProgram(zaugy);
        if (!zaugc.getProgramParameter(zaugy, zaugc.LINK_STATUS)) return null;
        zaugy.customShader = true;
        zaugy.uniforms = {};
        var zaugz = {};
        var zaugaa = (zaugs + "\n" + zaugt).matchAll ? (zaugs + "\n" + zaugt).matchAll(/uniform\s+\w+\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?\s*;/g) : [];
        for (var zaugab of zaugaa) zaugz[zaugab[1]] = zaugab[2] ? Number(zaugab[2]) : 0;
        for (var zaugac in zaugz) {
            zaugy.uniforms[zaugac] = zaugc.getUniformLocation(zaugy, zaugz[zaugac] ? zaugac + "[0]" : zaugac);
            if (zaugz[zaugac]) {
                for (var zaugad = 0; zaugad < zaugz[zaugac]; zaugad++) {
                    zaugy.uniforms[zaugac + "[" + zaugad + "]"] = zaugc.getUniformLocation(zaugy, zaugac + "[" + zaugad + "]");
                }
            }
        }
        for (var zaugae = 0; zaugae < zaugp.length; zaugae++) {
            var zaugaf = zaugp[zaugae];
            if (!zaugy.uniforms[zaugaf]) zaugy.uniforms[zaugaf] = zaugc.getUniformLocation(zaugy, zaugaf);
        }
        this.programCache[zaugv] = zaugy;
        zauga._cachedProgKey = zaugu;
        zauga._cachedProg = zaugy;
        return zaugy;
    }
    setShaderUniform(zauga, zaugb, zaugc) {
        var zaugd = this.gl;
        if (!zaugd || zauga === null || zauga === undefined || zaugb === undefined) return;
        if (zaugb && zaugb.value !== undefined) zaugb = zaugb.value;
        var zauge = zaugb && (zaugb.isTexture || zaugb.isDepthTexture || zaugb.glTexture || zaugb.hdrData || zaugb.compressed || typeof WebGLTexture !== "undefined" && zaugb instanceof WebGLTexture || zaugb.isWebGLTexture || zaugb.source !== undefined && zaugb.minFilter !== undefined);
        if (zauge) {
            var zaugf = this._shaderTextureUnit || 0;
            this._shaderTextureUnit = zaugf + 1;
            if (zaugd.activeTexture) zaugd.activeTexture(zaugd.TEXTURE0 + zaugf);
            var zaugg = null;
            if (typeof WebGLTexture !== "undefined" && zaugb instanceof WebGLTexture) zaugg = zaugb; else if (zaugb.glTexture) zaugg = zaugb.glTexture; else if (zaugb.texture && typeof WebGLTexture !== "undefined" && zaugb.texture instanceof WebGLTexture) zaugg = zaugb.texture; else if (this.getTexture) zaugg = this.getTexture(zaugb);
            zaugd.bindTexture(zaugb.isArrayTexture && this.isWebGL2 ? zaugd.TEXTURE_2D_ARRAY : zaugd.TEXTURE_2D, zaugg);
            zaugd.uniform1i(zauga, zaugf);
            return;
        }
        if (zaugb instanceof Matrix4) zaugd.uniformMatrix4fv(zauga, false, new Float32Array(zaugb.elements)); else if (zaugb instanceof Matrix3) zaugd.uniformMatrix3fv(zauga, false, new Float32Array(zaugb.elements)); else if (zaugb instanceof Vector2) zaugd.uniform2f(zauga, zaugb.x, zaugb.y); else if (zaugb instanceof Vector3) zaugd.uniform3f(zauga, zaugb.x, zaugb.y, zaugb.z); else if (zaugb instanceof Vector4) zaugd.uniform4f(zauga, zaugb.x, zaugb.y, zaugb.z, zaugb.w); else if (zaugb instanceof Color) zaugd.uniform3f(zauga, zaugb.r, zaugb.g, zaugb.b); else if (typeof zaugb === "boolean") zaugd.uniform1i(zauga, zaugb ? 1 : 0); else if (typeof zaugb === "number") zaugd.uniform1f(zauga, zaugb); else if (Array.isArray(zaugb) || ArrayBuffer.isView(zaugb)) {
            if (!zaugb.length) return;
            if (zaugb[0] instanceof Matrix4) {
                var zaugh = [];
                for (var zaugi = 0; zaugi < zaugb.length; zaugi++) zaugh.push.apply(zaugh, Array.from(zaugb[zaugi].elements));
                zaugd.uniformMatrix4fv(zauga, false, new Float32Array(zaugh));
            } else if (zaugb[0] instanceof Matrix3) {
                var zaugj = [];
                for (var zaugk = 0; zaugk < zaugb.length; zaugk++) zaugj.push.apply(zaugj, Array.from(zaugb[zaugk].elements));
                zaugd.uniformMatrix3fv(zauga, false, new Float32Array(zaugj));
            } else if (zaugb[0] instanceof Vector3 || zaugb[0] instanceof Color) {
                var zaugl = [];
                for (var zaugm = 0; zaugm < zaugb.length; zaugm++) {
                    var zaugn = zaugb[zaugm];
                    zaugl.push(zaugn.x !== undefined ? zaugn.x : zaugn.r, zaugn.y !== undefined ? zaugn.y : zaugn.g, zaugn.z !== undefined ? zaugn.z : zaugn.b);
                }
                zaugd.uniform3fv(zauga, new Float32Array(zaugl));
            } else if (zaugb[0] instanceof Vector4) {
                var zaugo = [];
                for (var zaugp = 0; zaugp < zaugb.length; zaugp++) zaugo.push(zaugb[zaugp].x, zaugb[zaugp].y, zaugb[zaugp].z, zaugb[zaugp].w);
                zaugd.uniform4fv(zauga, new Float32Array(zaugo));
            } else if (zaugb.length === 16) zaugd.uniformMatrix4fv(zauga, false, new Float32Array(zaugb)); else if (zaugb.length === 9) zaugd.uniformMatrix3fv(zauga, false, new Float32Array(zaugb)); else if (zaugc && (zaugc.indexOf("Ink") >= 0 || zaugc.indexOf("Color") >= 0) && zaugb.length % 3 === 0) zaugd.uniform3fv(zauga, new Float32Array(zaugb)); else if (zaugb.length === 4) zaugd.uniform4fv(zauga, new Float32Array(zaugb)); else if (zaugb.length === 3) zaugd.uniform3fv(zauga, new Float32Array(zaugb)); else if (zaugb.length === 2) zaugd.uniform2fv(zauga, new Float32Array(zaugb)); else zaugd.uniform1fv(zauga, new Float32Array(zaugb));
        }
    }
    drawShaderMesh(zauga, zaugb) {
        var zaugc = this.gl, zaugd = zauga.material, zauge = zauga.geometry;
        var zaugf = this.getShaderProgram(zaugd, zauga);
        if (!zaugf) return;
        zaugc.useProgram(zaugf);
        this.currentProgram = zaugf;
        this._basicState = null;
        var zaugg = zauge.attributes || {};
        var zaugh = function(zauga, zaugb, zaugd) {
            if (!zaugd) {
                zaugc.disableVertexAttribArray(zauga);
                return;
            }
            zaugc.bindBuffer(zaugc.ARRAY_BUFFER, this.getBuffer(zauge, zaugb, zaugd));
            zaugc.enableVertexAttribArray(zauga);
            zaugc.vertexAttribPointer(zauga, zaugd.itemSize, this.getAttributeType(zaugd), !!zaugd.normalized, 0, 0);
        }.bind(this);
        zaugh(0, "position", zaugg.position);
        zaugh(1, "normal", zaugg.normal);
        zaugh(2, "uv", zaugg.uv);
        zaugh(3, "color", zaugg.color || zaugg.colors);
        var zaugi = zauga instanceof InstancedMesh && zauga.count > 0;
        var zaugj = zaugi ? this.getInstanceExtension() : null;
        if (zaugi) {
            var zaugk = this.instanceBufferCache ? this.instanceBufferCache.get(zauga) : null;
            if (!zaugk) {
                zaugk = {};
                if (this.instanceBufferCache) this.instanceBufferCache.set(zauga, zaugk);
            }
            var zaugl = zaugk.instanceBuffer || zaugc.createBuffer();
            var zaugm = zauga.instanceMatrix && zauga.instanceMatrix.array ? zauga.instanceMatrix.array : zauga.instanceMatrices;
            if (!zaugk.instanceBuffer || zauga.instanceNeedsUpdate || zauga.instanceMatrix && zauga.instanceMatrix.needsUpdate) {
                zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugl);
                zaugc.bufferData(zaugc.ARRAY_BUFFER, zaugm, zaugc.DYNAMIC_DRAW);
                zaugk.instanceBuffer = zaugl;
                zauga.instanceNeedsUpdate = false;
                if (zauga.instanceMatrix) zauga.instanceMatrix.needsUpdate = false;
            }
            zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugl);
            for (var zaugn = 0; zaugn < 4; zaugn++) {
                var zaugo = 6 + zaugn;
                zaugc.enableVertexAttribArray(zaugo);
                zaugc.vertexAttribPointer(zaugo, 4, zaugc.FLOAT, false, 64, zaugn * 16);
                this.setInstanceDivisor(zaugo, 1);
            }
            var zaugp = zauga.instanceColor || zauge.attributes && zauge.attributes.instanceColor;
            if (zaugp) {
                var zaugq = zaugk.instanceColorBuffer || zaugc.createBuffer();
                var zaugr = zaugp.array || zaugp;
                if (!zaugk.instanceColorBuffer || zaugp.needsUpdate) {
                    zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugq);
                    zaugc.bufferData(zaugc.ARRAY_BUFFER, zaugr, zaugc.DYNAMIC_DRAW);
                    zaugk.instanceColorBuffer = zaugq;
                    zaugp.needsUpdate = false;
                }
                zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugq);
                zaugc.enableVertexAttribArray(10);
                zaugc.vertexAttribPointer(10, zaugp.itemSize || 3, zaugc.FLOAT, false, 0, 0);
                this.setInstanceDivisor(10, 1);
            } else {
                zaugc.disableVertexAttribArray(10);
                this.setInstanceDivisor(10, 0);
            }
        } else {
            for (var zaugs = 6; zaugs < 10; zaugs++) {
                zaugc.disableVertexAttribArray(zaugs);
                this.setInstanceDivisor(zaugs, 0);
            }
            zaugc.disableVertexAttribArray(10);
            this.setInstanceDivisor(10, 0);
        }
        var zaugt = zauga.matrixWorld;
        var zaugu = zaugb.matrixWorldInverse;
        var zaugv = this._tempModelView || (this._tempModelView = new Matrix4);
        zaugv.multiplyMatrices(zaugu, zaugt);
        var zaugw = this._tempNormalMat3 || (this._tempNormalMat3 = new Matrix3);
        zaugw.getNormalMatrix(zaugv);
        var zaugx = {
            modelMatrix: zaugt,
            modelViewMatrix: zaugv,
            viewMatrix: zaugu,
            projectionMatrix: zaugb.projectionMatrix,
            normalMatrix: zaugw
        };
        for (var zaugy in zaugx) this.setShaderUniform(zaugf.uniforms[zaugy], zaugx[zaugy], zaugy);
        this._shaderTextureUnit = 0;
        var zaugz = zaugd.uniforms || {};
        for (var zaugaa in zaugz) this.setShaderUniform(zaugf.uniforms[zaugaa], zaugz[zaugaa], zaugaa);
        if (zaugf.uniforms.pointSize) zaugc.uniform1f(zaugf.uniforms.pointSize, zaugd.size || zaugd.pointSize || 1);
        if (zauga instanceof Line && zaugc.lineWidth) zaugc.lineWidth(zaugd.linewidth || zaugd.width || 1);
        if (zaugd.depthTest !== false) zaugc.enable(zaugc.DEPTH_TEST); else zaugc.disable(zaugc.DEPTH_TEST);
        zaugc.depthMask(zaugd.depthWrite !== false);
        var zaugab = zaugd.blendEquation && zaugd.blendEquation !== "add" ? zaugd.blendEquation : null;
        if (zaugd.transparent || zaugd.blending === AdditiveBlending || zaugd.blending === NormalBlending || zaugd.blending === SubtractiveBlending || zaugd.blending === MultiplyBlending || zaugab) {
            zaugc.enable(zaugc.BLEND);
            if (zaugab === "min" || zaugab === "max") zaugc.blendFunc(zaugc.ONE, zaugc.ONE); else if (zaugd.blending === AdditiveBlending) zaugc.blendFunc(zaugc.ONE, zaugc.ONE); else if (zaugd.blending === SubtractiveBlending) zaugc.blendFunc(zaugc.ZERO, zaugc.ONE_MINUS_SRC_COLOR); else if (zaugd.blending === MultiplyBlending) zaugc.blendFunc(zaugc.DST_COLOR, zaugc.ZERO); else zaugc.blendFunc(zaugc.SRC_ALPHA, zaugc.ONE_MINUS_SRC_ALPHA);
            if (zaugab) {
                var zaugac = null;
                if (zaugab === "subtract") zaugac = zaugc.FUNC_SUBTRACT; else if (zaugab === "reverseSubtract") zaugac = zaugc.FUNC_REVERSE_SUBTRACT; else if (zaugab === "min") {
                    var zaugad = this.getBlendMinMaxExtension();
                    zaugac = zaugc.MIN !== undefined ? zaugc.MIN : zaugad ? zaugad.MIN_EXT : null;
                } else if (zaugab === "max") {
                    var zaugae = this.getBlendMinMaxExtension();
                    zaugac = zaugc.MAX !== undefined ? zaugc.MAX : zaugae ? zaugae.MAX_EXT : null;
                }
                if (zaugac !== null && zaugac !== undefined) zaugc.blendEquation(zaugac);
            } else if (zaugc.blendEquation) zaugc.blendEquation(zaugc.FUNC_ADD);
        } else zaugc.disable(zaugc.BLEND);
        if (zaugd.side === FrontSide || zaugd.side === 0) {
            zaugc.enable(zaugc.CULL_FACE);
            zaugc.cullFace(zaugc.BACK);
        } else if (zaugd.side === BackSide || zaugd.side === 1) {
            zaugc.enable(zaugc.CULL_FACE);
            zaugc.cullFace(zaugc.FRONT);
        } else {
            zaugc.disable(zaugc.CULL_FACE);
        }
        var zaugaf = zauge.index, zaugag = zauge.drawRange || {
            start: 0,
            count: Infinity
        };
        var zaugah = zaugag.start || 0;
        var zaugai = zauga instanceof Points ? zaugc.POINTS : zauga instanceof LineSegments ? zaugc.LINES : zauga instanceof LineLoop ? zaugc.LINE_LOOP : zauga instanceof Line ? zaugc.LINE_STRIP : zaugc.TRIANGLES;
        if (zaugaf) {
            var zaugaj = zaugaf.array || (Array.isArray(zaugaf) ? zaugaf : null);
            var zaugak = zaugaf.count !== undefined ? zaugaf.count : zaugaj ? zaugaj.length : zaugaf.length || 0;
            var zaugal = Math.min(zaugak - zaugah, zaugag.count !== undefined ? zaugag.count : Infinity);
            var zaugam = zaugaj instanceof Uint32Array || zaugaf instanceof Uint32Array;
            var zaugan = zaugam ? zaugc.UNSIGNED_INT : zaugc.UNSIGNED_SHORT;
            var zaugao = zaugam ? 4 : 2;
            zaugc.bindBuffer(zaugc.ELEMENT_ARRAY_BUFFER, this.getIndexBuffer(zauge, zaugaf));
            if (zaugi && zaugj) {
                if (zaugj.drawElementsInstanced) zaugj.drawElementsInstanced(zaugai, zaugal, zaugan, zaugah * zaugao, zauga.count); else if (zaugj.drawElementsInstancedANGLE) zaugj.drawElementsInstancedANGLE(zaugai, zaugal, zaugan, zaugah * zaugao, zauga.count);
            } else {
                zaugc.drawElements(zaugai, zaugal, zaugan, zaugah * zaugao);
            }
            this.info.render.triangles += Math.floor(zaugal / 3) * (zaugi ? zauga.count : 1);
        } else {
            var zaugap = zaugg.position;
            var zaugaq = zaugap ? zaugap.count !== undefined ? zaugap.count : zaugap.array ? zaugap.array.length / (zaugap.itemSize || 3) : 0 : 0;
            var zaugar = Math.min(zaugaq - zaugah, zaugag.count !== undefined ? zaugag.count : Infinity);
            if (zaugi && zaugj) {
                if (zaugj.drawArraysInstanced) zaugj.drawArraysInstanced(zaugai, zaugah, zaugar, zauga.count); else if (zaugj.drawArraysInstancedANGLE) zaugj.drawArraysInstancedANGLE(zaugai, zaugah, zaugar, zauga.count);
            } else {
                zaugc.drawArrays(zaugai, zaugah, zaugar);
            }
            this.info.render.triangles += Math.floor(zaugar / 3) * (zaugi ? zauga.count : 1);
        }
        this.info.render.calls++;
    }
    programSignature(zauga) {
        if (!zauga) return "";
        if (zauga instanceof ShaderMaterial) return "shader:" + (zauga.type || "ShaderMaterial") + ":" + (zauga.vertexShader ? zauga.vertexShader.length : 0) + "-" + (zauga.fragmentShader ? zauga.fragmentShader.length : 0);
        return zauga.type + (zauga.wireframe ? "w" : "s") + (zauga.vertexColors ? "v" : "n") + (zauga.diffuseMap ? "t" : "c") + (zauga.normalMap ? "n" : "f") + (zauga.envMap ? "e" : "x") + (zauga.displacementMap ? "d" : "x") + (zauga.parallaxMap ? "p" : "x");
    }
    getProgram(zauga, zaugb) {
        if (zauga instanceof ShaderMaterial) return this.getShaderProgram(zauga, zaugb);
        var zaugc = this.gl;
        if (!zaugc) return null;
        var zaugd = zaugb && zaugb.skeleton && zaugb.skeleton.bones && zaugb.skeleton.bones.length > 64 ? Math.ceil(zaugb.skeleton.bones.length / 16) * 16 : 64;
        var zauge = this.programSignature(zauga) + "|bones" + zaugd;
        if (this.programCache[zauge]) return this.programCache[zauge];
        var zaugf = "attribute vec3 position; attribute vec3 normal; attribute vec2 uv; attribute vec3 colorAttribute; attribute vec4 skinIndex; attribute vec4 skinWeight; attribute vec4 instanceMatrix0; attribute vec4 instanceMatrix1; attribute vec4 instanceMatrix2; attribute vec4 instanceMatrix3; attribute vec4 tangent; attribute vec2 uv1; uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix; uniform mat4 boneMatrices[" + zaugd + "]; uniform sampler2D displacementMap; uniform int useDisplacementMap; uniform float displacementScale; uniform float displacementBias; uniform int useSkinning; uniform int useInstancing; uniform float pointSize; uniform float uLogDepthFC; varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv; varying vec3 vColor; varying vec3 vTangent; varying float vTangentSign; varying float vDepth; varying vec2 vUv1; void main(){ vec4 local=vec4(position,1.0); vec3 localNormal=normal; vec3 localTangent=tangent.xyz; if(useSkinning==1){ mat4 skin=boneMatrices[int(skinIndex.x)]*skinWeight.x+boneMatrices[int(skinIndex.y)]*skinWeight.y+boneMatrices[int(skinIndex.z)]*skinWeight.z+boneMatrices[int(skinIndex.w)]*skinWeight.w; local=skin*local; localNormal=mat3(skin)*normal; localTangent=mat3(skin)*localTangent; } if(useDisplacementMap==1) local.xyz+=localNormal*(texture2D(displacementMap,uv).r*2.0-1.0)*displacementScale+localNormal*displacementBias; if(useInstancing==1){ mat4 instance=mat4(instanceMatrix0,instanceMatrix1,instanceMatrix2,instanceMatrix3); local=instance*local; localNormal=mat3(instance)*localNormal; localTangent=mat3(instance)*localTangent; } vec4 world=modelMatrix*local; vec4 viewPosition=viewMatrix*world; vPosition=world.xyz; vDepth=-viewPosition.z; vNormal=normalize(normalMatrix*localNormal); vTangent=normalize(normalMatrix*localTangent); vTangentSign=tangent.w; vUv=uv; vUv1=uv1; vColor=colorAttribute; gl_Position=projectionMatrix*viewPosition; if(uLogDepthFC>0.0){gl_Position.z=(log2(max(1e-6,gl_Position.w+1.0))*uLogDepthFC-1.0)*gl_Position.w;} gl_PointSize=pointSize; }";
        var zaugg = "precision highp float; const float PI=3.14159265359; uniform vec3 color; uniform vec3 emissive; uniform float opacity; uniform int alphaTest; uniform float alphaCutoff; uniform vec3 cameraPosition; uniform int lightCount; uniform vec3 lightPosition[8]; uniform vec3 lightDirection[8]; uniform vec3 lightColor[8]; uniform vec3 lightGroundColor[8]; uniform float lightIntensity[8]; uniform float lightDistance[8]; uniform float lightCone[8]; uniform float lightPenumbra[8]; uniform int lightType[8]; uniform vec4 lightArea[8]; uniform vec3 lightRectRight[8]; uniform sampler2D ltcMatTexture; uniform sampler2D ltcAmpTexture; uniform sampler2D lightEmissiveTexture; uniform sampler2D diffuseMap; uniform sampler2D normalMap; uniform sampler2D roughnessMap; uniform sampler2D metalnessMap; uniform sampler2D aoMap; uniform sampler2D emissiveMap; uniform sampler2D alphaMap; uniform sampler2D shadowMap0; uniform sampler2D shadowMap1; uniform sampler2D shadowMap2; uniform sampler2D shadowMap3; uniform samplerCube pointShadowMap; uniform samplerCube envMap; uniform mat4 shadowMatrix0; uniform mat4 shadowMatrix1; uniform mat4 shadowMatrix2; uniform mat4 shadowMatrix3; uniform vec4 shadowSplits; uniform int shadowCascadeCount; uniform int useDiffuseMap; uniform int useNormalMap; uniform int useRoughnessMap; uniform int useMetalnessMap; uniform int useAoMap; uniform int useEmissiveMap; uniform int useAlphaMap; uniform int useEnvMap; uniform int useShadow; uniform int shadowMode; uniform float shadowBias; uniform float shadowFar; uniform vec3 shadowLightPosition; uniform int contactShadowEnabled; uniform float contactShadowDistance; uniform float contactShadowStrength; uniform float envMapIntensity; uniform float aoMapIntensity; uniform vec2 normalScale; uniform float metallic; uniform float roughness; uniform float clearcoat; uniform float clearcoatRoughness; uniform float sheen; uniform vec3 sheenColor; uniform float sheenRoughness; uniform float transmission; uniform float ior; uniform float iridescence; uniform float iridescenceIor; uniform float iridescenceThickness; uniform float anisotropy; uniform float anisotropyRotation; uniform float specularIntensity; uniform vec3 specularColor; uniform float thickness; uniform float attenuationDistance; uniform vec3 attenuationColor; uniform float dispersion; uniform float subsurface; uniform vec3 subsurfaceColor; uniform float subsurfaceRadius; uniform sampler2D parallaxMap; uniform int useParallaxMap; uniform float parallaxScale; uniform float parallaxMinLayers; uniform float parallaxMaxLayers; uniform mat3 diffuseMapTransform; uniform int diffuseUvChannel; uniform float exposure; uniform float gammaValue; uniform int toneMapping; uniform vec4 uClipPlanes[8]; uniform int uClipPlaneCount; uniform int useVertexColor; uniform int unlit; uniform int fogEnabled; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv; varying vec2 vUv1; varying vec3 vColor; varying vec3 vTangent; varying float vTangentSign; varying float vDepth; float distributionGGX(vec3 N,vec3 H,float a){ float a2=a*a; float n=max(dot(N,H),0.0); float n2=n*n; float dterm=n2*(a2-1.0)+1.0; return a2/max(PI*dterm*dterm,0.00000001); } float geometrySchlickGGX(float n,float k){ return n/max(n*(1.0-k)+k,0.0001); } float geometrySmith(vec3 N,vec3 V,vec3 L,float k){ return geometrySchlickGGX(max(dot(N,V),0.0),k)*geometrySchlickGGX(max(dot(N,L),0.0),k); } vec3 fresnelSchlick(float c,vec3 F0){ return F0+(1.0-F0)*pow(1.0-c,5.0); } float fresnelScalar(float c,float f0){ return f0+(1.0-f0)*pow(1.0-c,5.0); } float distributionGGXAnisotropic(vec3 N,vec3 H,vec3 Tp,vec3 Bp,float at,float ab){ float NdotH=max(dot(N,H),0.0); float TdotH=dot(Tp,H)/at; float BdotH=dot(Bp,H)/ab; float denom=TdotH*TdotH+BdotH*BdotH+NdotH*NdotH; return 1.0/max(PI*at*ab*denom*denom,0.00000001); } vec3 thinFilmF0(vec3 f0,float eta2,float thickness,float cosTheta1){ if(thickness<=0.0) return f0; float sin2=(1.0-cosTheta1*cosTheta1)/(eta2*eta2); if(sin2>=1.0) return f0; float cos2=sqrt(1.0-sin2); float r12a=(eta2*cosTheta1-cos2)/(eta2*cosTheta1+cos2); float R12=r12a*r12a; vec3 R23=clamp(f0,vec3(0.0),vec3(1.0)); vec3 delta=4.0*PI*eta2*thickness*cos2/vec3(680.0,550.0,440.0); vec3 interference=2.0*sqrt(R12*R23)*cos(delta); return clamp((R12+R23+interference)/max(1.0+R12*R23+interference,vec3(0.0001)),vec3(0.0),vec3(1.0)); } float pcf0(vec4 coord){ vec3 sc=coord.xyz/max(coord.w,0.0001); if(sc.x<0.0||sc.x>1.0||sc.y<0.0||sc.y>1.0||sc.z<0.0||sc.z>1.0) return 1.0; float result=0.0; for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){ float d=texture2D(shadowMap0,sc.xy+vec2(float(x),float(y))*0.0015).r; result+=sc.z-shadowBias>d?0.0:1.0; } return result/9.0; } float pcf1(vec4 coord){ vec3 sc=coord.xyz/max(coord.w,0.0001); if(sc.x<0.0||sc.x>1.0||sc.y<0.0||sc.y>1.0||sc.z<0.0||sc.z>1.0) return 1.0; float result=0.0; for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){ float d=texture2D(shadowMap1,sc.xy+vec2(float(x),float(y))*0.0015).r; result+=sc.z-shadowBias>d?0.0:1.0; } return result/9.0; } float pcf2(vec4 coord){ vec3 sc=coord.xyz/max(coord.w,0.0001); if(sc.x<0.0||sc.x>1.0||sc.y<0.0||sc.y>1.0||sc.z<0.0||sc.z>1.0) return 1.0; float result=0.0; for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){ float d=texture2D(shadowMap2,sc.xy+vec2(float(x),float(y))*0.0015).r; result+=sc.z-shadowBias>d?0.0:1.0; } return result/9.0; } float pcf3(vec4 coord){ vec3 sc=coord.xyz/max(coord.w,0.0001); if(sc.x<0.0||sc.x>1.0||sc.y<0.0||sc.y>1.0||sc.z<0.0||sc.z>1.0) return 1.0; float result=0.0; for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++){ float d=texture2D(shadowMap3,sc.xy+vec2(float(x),float(y))*0.0015).r; result+=sc.z-shadowBias>d?0.0:1.0; } return result/9.0; } float cascadeShadow(){ if(shadowCascadeCount<=1) return pcf0(shadowMatrix0*vec4(vPosition,1.0)); if(vDepth<=shadowSplits.x) return pcf0(shadowMatrix0*vec4(vPosition,1.0)); if(vDepth<=shadowSplits.y) return pcf1(shadowMatrix1*vec4(vPosition,1.0)); if(vDepth<=shadowSplits.z) return pcf2(shadowMatrix2*vec4(vPosition,1.0)); return pcf3(shadowMatrix3*vec4(vPosition,1.0)); } vec3 toneMapColor(vec3 c){ if(toneMapping==1) return c/(c+vec3(1.0)); if(toneMapping==2){ c=max(vec3(0.0),c-0.004); return (c*(6.2*c+0.5))/(c*(6.2*c+1.7)+0.06); } return c; } vec3 ltcEdge(vec3 v1,vec3 v2){ vec3 c=cross(v1,v2); float l=length(c); if(l<1e-12) return vec3(0.0); float th=acos(clamp(dot(v1,v2),-0.9999,0.9999)); return c/l*th; } float ltcEvaluate(vec3 a,vec3 b,vec3 c,vec3 d){ vec3 o0=vec3(0.0),o1=vec3(0.0),o2=vec3(0.0),o3=vec3(0.0),o4=vec3(0.0); int n=0; if(a.z>=0.0){ if(n==0)o0=a; else if(n==1)o1=a; else if(n==2)o2=a; else if(n==3)o3=a; n++; } if((a.z>=0.0)!=(b.z>=0.0)){ float t=a.z/(a.z-b.z); vec3 p=mix(a,b,t); if(n==0)o0=p; else if(n==1)o1=p; else if(n==2)o2=p; else if(n==3)o3=p; n++; } if(b.z>=0.0){ if(n==0)o0=b; else if(n==1)o1=b; else if(n==2)o2=b; else if(n==3)o3=b; n++; } if((b.z>=0.0)!=(c.z>=0.0)){ float t=b.z/(b.z-c.z); vec3 p=mix(b,c,t); if(n==0)o0=p; else if(n==1)o1=p; else if(n==2)o2=p; else if(n==3)o3=p; n++; } if(c.z>=0.0){ if(n==0)o0=c; else if(n==1)o1=c; else if(n==2)o2=c; else if(n==3)o3=c; n++; } if((c.z>=0.0)!=(d.z>=0.0)){ float t=c.z/(c.z-d.z); vec3 p=mix(c,d,t); if(n==0)o0=p; else if(n==1)o1=p; else if(n==2)o2=p; else if(n==3)o3=p; n++; } if(d.z>=0.0){ if(n==0)o0=d; else if(n==1)o1=d; else if(n==2)o2=d; else if(n==3)o3=d; n++; } if((d.z>=0.0)!=(a.z>=0.0)){ float t=d.z/(d.z-a.z); vec3 p=mix(d,a,t); if(n==0)o0=p; else if(n==1)o1=p; else if(n==2)o2=p; else if(n==3)o3=p; n++; } if(n<3) return 0.0; vec3 e=vec3(0.0); if(n==3){ e=ltcEdge(o0,o1)+ltcEdge(o1,o2)+ltcEdge(o2,o0); } else if(n==4){ e=ltcEdge(o0,o1)+ltcEdge(o1,o2)+ltcEdge(o2,o3)+ltcEdge(o3,o0); } else { e=ltcEdge(o0,o1)+ltcEdge(o1,o2)+ltcEdge(o2,o3)+ltcEdge(o3,o4)+ltcEdge(o4,o0); } return 0.5*e.z; } void main(){ vec2 baseUv=diffuseUvChannel==1?vUv1:vUv; baseUv=(diffuseMapTransform*vec3(baseUv,1.0)).xy; vec3 N=normalize(vNormal); vec3 V=normalize(cameraPosition-vPosition); vec3 T=normalize(vTangent-dot(vTangent,N)*N); vec3 B=normalize(cross(N,T))*vTangentSign; if(useParallaxMap==1){ vec3 Vtan=normalize(vec3(dot(V,T),dot(V,B),dot(V,N))); float numLayers=mix(parallaxMaxLayers,parallaxMinLayers,max(dot(vec3(0.0,0.0,1.0),Vtan),0.0)); float layerDepth=1.0/max(numLayers,1.0); float currentLayerDepth=0.0; vec2 deltaUv=(Vtan.xy*parallaxScale)/max(numLayers,1.0); vec2 currentUv=baseUv; float currentDepthMapValue=1.0-texture2D(parallaxMap,currentUv).r; for(int pStep=0;pStep<32;pStep++){ if(float(pStep)>=numLayers||currentLayerDepth>=currentDepthMapValue) break; currentUv-=deltaUv; currentDepthMapValue=1.0-texture2D(parallaxMap,currentUv).r; currentLayerDepth+=layerDepth; } vec2 prevUv=currentUv+deltaUv; float afterDepth=currentDepthMapValue-currentLayerDepth; float beforeDepth=1.0-texture2D(parallaxMap,prevUv).r-currentLayerDepth+layerDepth; float weight=afterDepth/max(afterDepth-beforeDepth,0.0001); baseUv=prevUv*weight+currentUv*(1.0-weight); } vec3 base=color; float alpha=opacity; if(useDiffuseMap==1){ vec4 diffuseSample=texture2D(diffuseMap,baseUv); base*=diffuseSample.rgb; alpha*=diffuseSample.a; } if(useAlphaMap==1) alpha*=texture2D(alphaMap,baseUv).r; for(int clipIndex=0;clipIndex<8;clipIndex++){ if(clipIndex>=uClipPlaneCount) break; if(dot(vPosition,uClipPlanes[clipIndex].xyz)+uClipPlanes[clipIndex].w>0.0) discard; } if(alphaTest==1 && alpha<alphaCutoff) discard; if(useVertexColor==1) base*=vColor; if(unlit==1){ gl_FragColor=vec4(base,alpha); return; } float m=metallic; float r=clamp(roughness,0.04,1.0); if(useMetalnessMap==1) m*=texture2D(metalnessMap,baseUv).r; if(useRoughnessMap==1) r*=texture2D(roughnessMap,baseUv).g; float ao=1.0; if(useAoMap==1) ao=mix(1.0,texture2D(aoMap,baseUv).r,aoMapIntensity); if(useNormalMap==1){ vec3 map=texture2D(normalMap,baseUv).xyz*2.0-1.0; map.xy*=normalScale; N=normalize(T*map.x+B*map.y+N*map.z); } vec3 dielectricF0=0.04*specularColor*specularIntensity; vec3 F0=mix(dielectricF0,base,m); if(iridescence>0.0) F0=mix(F0,thinFilmF0(F0,max(iridescenceIor,1.001),iridescenceThickness,max(dot(N,V),0.0)),clamp(iridescence,0.0,1.0)); float aniso=clamp(anisotropy,0.0,1.0); vec3 anisoT=T; vec3 anisoB=B; float aBase=r*r; float at=aBase; float ab=aBase; if(aniso>0.0){ float rotCa=cos(anisotropyRotation); float rotSa=sin(anisotropyRotation); anisoT=T*rotCa+B*rotSa; anisoB=B*rotCa-T*rotSa; at=max(aBase*(1.0+aniso*0.9),0.0001); ab=max(aBase*(1.0-aniso*0.9),0.0001); } float coatR=clamp(clearcoatRoughness,0.04,1.0); float coatA=coatR*coatR; float NdotV=max(dot(N,V),0.001); vec3 Lo=vec3(0.0); float shadow=1.0; if(useShadow==1){ if(shadowMode==3){ vec3 toLight=vPosition-shadowLightPosition; float depth=textureCube(pointShadowMap,normalize(toLight)).r; shadow=length(toLight)/max(shadowFar,0.001)-shadowBias>depth?0.35:1.0; } else shadow=cascadeShadow(); } for(int i=0;i<8;i++){ if(i>=lightCount) break; vec3 L; float attenuation=1.0; float intensity=lightIntensity[i]; if(lightType[i]==0){ Lo+=base*lightColor[i]*intensity; continue; } if(lightType[i]==5||lightType[i]==6){ if(lightType[i]==6){ vec3 axis=lightDirection[i]; vec3 toTube=lightPosition[i]-vPosition; float halfLen=lightArea[i].x; float tProj=clamp(dot(-toTube,axis),-halfLen,halfLen); vec3 cpt=lightPosition[i]+axis*tProj; vec3 toC=cpt-vPosition; float dC=length(toC); float rT=max(lightArea[i].z,0.001); if(dC>rT&&dC>1e-4){ vec3 L=toC/dC; float NoL=max(dot(N,L),0.0); if(NoL>0.0){ float sa=PI*rT*rT/(dC*dC); vec3 radianceT=lightColor[i]*intensity; vec3 H=normalize(V+L); float rPrime=clamp(r+rT/dC,0.04,1.0); float D2=distributionGGX(N,H,rPrime*rPrime); float G2=geometrySmith(N,V,L,(r+1.0)*(r+1.0)/8.0); vec3 F2=fresnelSchlick(max(dot(H,V),0.0),F0); Lo+=(base*(1.0-m)/PI+(D2*G2*F2)/max(4.0*NdotV*NoL,0.001))*radianceT*sa*NoL; } } continue; } float hw=lightArea[i].x; float hh=lightArea[i].y; vec3 nrm=lightDirection[i]; vec3 rgt=lightRectRight[i]; vec3 relA=lightPosition[i]-vPosition; if(hw>0.0&&hh>0.0&&(lightCone[i]>0.5||dot(nrm,relA)<0.0)){ vec3 upv=cross(nrm,rgt); vec3 xh=V-N*dot(V,N); float xl2=length(xh); xh=xl2>1e-5?xh/xl2:vec3(1.0,0.0,0.0); vec3 yh=cross(N,xh); vec3 lc=vec3(dot(relA,xh),dot(relA,yh),dot(relA,N)); vec3 lrA=vec3(dot(rgt,xh),dot(rgt,yh),dot(rgt,N)); vec3 luA=vec3(dot(upv,xh),dot(upv,yh),dot(upv,N)); vec3 pc0=lc-lrA*hw-luA*hh; vec3 pc1=lc+lrA*hw-luA*hh; vec3 pc2=lc+lrA*hw+luA*hh; vec3 pc3=lc-lrA*hw+luA*hh; if(dot(nrm,relA)<0.0){ vec3 pcSwap=pc1; pc1=pc3; pc3=pcSwap; } vec3 p0=normalize(pc0); vec3 p1=normalize(pc1); vec3 p2=normalize(pc2); vec3 p3=normalize(pc3); float Ed=ltcEvaluate(p0,p1,p2,p3); if(Ed>0.0){ vec3 radiance=lightColor[i]*intensity; if(lightArea[i].w>0.5){ vec3 dirL=normalize(relA); float den=dot(dirL,nrm); vec2 uvE=vec2(0.5); if(abs(den)>1e-5){ float tHit=dot(relA,nrm)/den; if(tHit>0.0){ vec3 hrel=dirL*tHit-relA; uvE=vec2(dot(hrel,rgt)/(2.0*hw)+0.5,dot(hrel,upv)/(2.0*hh)+0.5); } } radiance*=texture2D(lightEmissiveTexture,clamp(uvE,0.0,1.0)).rgb; } Lo+=base*(1.0-m)/PI*radiance*Ed; vec2 luv=vec2((clamp(r,0.15,1.0)-0.1)/0.9,sqrt(1.0-max(0.3,NdotV))); vec4 M4=texture2D(ltcMatTexture,luv); float amp=texture2D(ltcAmpTexture,luv).r; vec3 q0=normalize(vec3(M4.x*p0.x+M4.y*p0.z,M4.z*p0.y,M4.y*p0.x+M4.w*p0.z)); vec3 q1=normalize(vec3(M4.x*p1.x+M4.y*p1.z,M4.z*p1.y,M4.y*p1.x+M4.w*p1.z)); vec3 q2=normalize(vec3(M4.x*p2.x+M4.y*p2.z,M4.z*p2.y,M4.y*p2.x+M4.w*p2.z)); vec3 q3=normalize(vec3(M4.x*p3.x+M4.y*p3.z,M4.z*p3.y,M4.y*p3.x+M4.w*p3.z)); float Es=ltcEvaluate(q0,q1,q2,q3); vec3 F2=fresnelSchlick(NdotV,F0); Lo+=F2*radiance*max(amp*Es,0.0); } } continue; } if(lightType[i]==1){ L=normalize(-lightDirection[i]); } else { vec3 delta=lightPosition[i]-vPosition; float distanceToLight=length(delta); L=normalize(delta); if(lightDistance[i]>0.0) attenuation=max(0.0,1.0-distanceToLight/lightDistance[i]); attenuation*=1.0/(1.0+distanceToLight*distanceToLight*0.015); if(lightType[i]==3){ float cone=dot(normalize(-lightDirection[i]),-L); float edge=lightCone[i]; float inner=edge*(1.0-lightPenumbra[i]); attenuation*=smoothstep(edge,inner,cone); } } vec3 radiance=lightColor[i]*intensity*attenuation; float contactFactor=contactShadowEnabled==1?clamp(1.0-length(vPosition-shadowLightPosition)/max(contactShadowDistance,0.001),0.0,1.0):0.0; float contactBoost=shadow<0.99?mix(1.0,shadow,contactFactor*contactShadowStrength):1.0; float lightShadow=lightType[i]==1?shadow*contactBoost:1.0; if(subsurface>0.0){ float sssWrap=clamp(subsurfaceRadius,0.1,1.0); float wrapNdotL=max((dot(N,L)+sssWrap)/(1.0+sssWrap),0.0); float backLight=pow(clamp(dot(V,-L),0.0,1.0),3.0); float sssRim=pow(1.0-NdotV,2.0); vec3 sssTint=mix(base,subsurfaceColor,0.7); Lo+=sssTint*radiance*subsurface*(wrapNdotL*0.45+backLight*(1.0+sssWrap)*1.2+sssRim*0.35)*(1.0-m)*lightShadow; } float NdotL=max(dot(N,L),0.0); if(NdotL<=0.0) continue; vec3 H=normalize(V+L); float D=aniso>0.0?distributionGGXAnisotropic(N,H,anisoT,anisoB,at,ab):distributionGGX(N,H,aBase); float G=geometrySmith(N,V,L,(r+1.0)*(r+1.0)/8.0); vec3 F=fresnelSchlick(max(dot(H,V),0.0),F0); vec3 specular=(D*G*F)/max(4.0*max(dot(N,V),0.0)*NdotL,0.001); vec3 kS=F; vec3 kD=(vec3(1.0)-kS)*(1.0-m); float coatFres=fresnelScalar(max(dot(H,V),0.0),0.04); float coatAtten=1.0-clearcoat*coatFres; Lo+=((kD*base/PI+specular)*coatAtten)*radiance*NdotL*lightShadow; if(clearcoat>0.0){ float coatD=distributionGGX(N,H,coatA); float coatG=geometrySmith(N,V,L,(coatR+1.0)*(coatR+1.0)/8.0); Lo+=vec3(clearcoat*coatD*coatG*coatFres/max(4.0*NdotV*NdotL,0.001))*radiance*NdotL*lightShadow; } if(sheen>0.0){ float sheenR=clamp(sheenRoughness,0.05,1.0); float invAlpha=1.0/(sheenR*sheenR); float sNdotH=max(dot(N,H),0.0); float sin2h=max(1.0-sNdotH*sNdotH,0.0001); float sheenD=(2.0+invAlpha)/(2.0*PI)*pow(sin2h,invAlpha*0.5); float sheenV=1.0/max(4.0*(NdotL+NdotV-NdotL*NdotV),0.001); Lo+=sheen*sheenColor*sheenD*sheenV*radiance*NdotL*lightShadow; } } vec3 ambient=base*(1.0-m)*0.03*ao; if(useEnvMap==1){ vec3 irradiance=textureCube(envMap,N).rgb; vec3 reflection=reflect(-V,N); if(aniso>0.0) reflection=normalize(reflection-anisoT*dot(reflection,anisoT)*aniso*0.5); vec3 prefiltered=textureCube(envMap,reflection).rgb; vec3 F=fresnelSchlick(max(dot(N,V),0.0),F0); ambient+=((1.0-F)*base*(1.0-m)+prefiltered*F)*envMapIntensity*ao; ambient+=irradiance*base*(1.0-m)*0.08*envMapIntensity; if(clearcoat>0.0) ambient+=vec3(clearcoat*fresnelScalar(max(dot(N,V),0.0),0.04))*prefiltered*envMapIntensity*ao; if(sheen>0.0) ambient+=sheen*sheenColor*pow(1.0-max(dot(N,V),0.0),5.0)*prefiltered*envMapIntensity*ao; } vec3 finalColor=ambient+Lo; float viewFacing=max(dot(N,V),0.0); if(transmission>0.0){ float transIOR=max(ior,1.001); vec3 refracted=refract(-V,N,1.0/transIOR); vec3 transmitted=vec3(0.0); if(useEnvMap==1){ if(dispersion>0.0){ float halfSpread=clamp(dispersion*0.05*(transIOR-1.0),0.0,0.2); transmitted=vec3(textureCube(envMap,refract(-V,N,1.0/max(transIOR+halfSpread,1.001))).r,textureCube(envMap,refracted).g,textureCube(envMap,refract(-V,N,1.0/max(transIOR-halfSpread,1.001))).b); } else transmitted=textureCube(envMap,refracted).rgb; transmitted*=mix(vec3(1.0),base,0.25); } else { transmitted=base*0.4; } float path=max(thickness,0.001); vec3 sigma=max(vec3(1.0)-attenuationColor,vec3(0.0))/max(attenuationDistance>0.0&&attenuationDistance<1000000.0?attenuationDistance:1000000.0,0.0001); transmitted*=exp(-sigma*path); float transF0=pow((transIOR-1.0)/(transIOR+1.0),2.0); float transFresnel=transF0+(1.0-transF0)*pow(1.0-viewFacing,5.0); vec3 reflected=useEnvMap==1?textureCube(envMap,reflect(-V,N)).rgb:vec3(0.0); float transAmount=clamp(transmission,0.0,1.0); finalColor=mix(finalColor,transmitted,transAmount*(1.0-transFresnel))+reflected*transFresnel*transAmount; } if(useEmissiveMap==1) finalColor+=texture2D(emissiveMap,baseUv).rgb; finalColor+=emissive; finalColor=toneMapColor(finalColor*exposure); finalColor=pow(max(finalColor,vec3(0.0)),vec3(1.0/max(gammaValue,0.1))); if(fogEnabled==1){ float fogFactor=clamp((fogFar-length(cameraPosition-vPosition))/(fogFar-fogNear),0.0,1.0); finalColor=mix(fogColor,finalColor,fogFactor); } gl_FragColor=vec4(finalColor,alpha); }";
        var zaugh = this.compileShader(zaugc.VERTEX_SHADER, zaugf);
        var zaugi = this.compileShader(zaugc.FRAGMENT_SHADER, zaugg);
        if (!zaugh || !zaugi) return null;
        var zaugj = zaugc.createProgram();
        zaugc.attachShader(zaugj, zaugh);
        zaugc.attachShader(zaugj, zaugi);
        zaugc.bindAttribLocation(zaugj, 0, "position");
        zaugc.bindAttribLocation(zaugj, 1, "normal");
        zaugc.bindAttribLocation(zaugj, 2, "uv");
        zaugc.bindAttribLocation(zaugj, 3, "colorAttribute");
        zaugc.bindAttribLocation(zaugj, 4, "skinIndex");
        zaugc.bindAttribLocation(zaugj, 5, "skinWeight");
        zaugc.bindAttribLocation(zaugj, 6, "instanceMatrix0");
        zaugc.bindAttribLocation(zaugj, 7, "instanceMatrix1");
        zaugc.bindAttribLocation(zaugj, 8, "instanceMatrix2");
        zaugc.bindAttribLocation(zaugj, 9, "instanceMatrix3");
        zaugc.bindAttribLocation(zaugj, 10, "tangent");
        zaugc.bindAttribLocation(zaugj, 11, "uv1");
        zaugc.linkProgram(zaugj);
        if (!zaugc.getProgramParameter(zaugj, zaugc.LINK_STATUS)) return null;
        zaugj.uniforms = {};
        var zaugk = [ "modelMatrix", "viewMatrix", "projectionMatrix", "normalMatrix", "boneMatrices[0]", "displacementMap", "useDisplacementMap", "displacementScale", "displacementBias", "useSkinning", "useInstancing", "pointSize", "color", "emissive", "opacity", "alphaTest", "alphaCutoff", "cameraPosition", "lightCount", "diffuseMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap", "alphaMap", "shadowMap0", "shadowMap1", "shadowMap2", "shadowMap3", "pointShadowMap", "envMap", "shadowMatrix0", "shadowMatrix1", "shadowMatrix2", "shadowMatrix3", "shadowSplits", "shadowCascadeCount", "useDiffuseMap", "useNormalMap", "useRoughnessMap", "useMetalnessMap", "useAoMap", "useEmissiveMap", "useAlphaMap", "useEnvMap", "useShadow", "shadowMode", "shadowBias", "shadowFar", "shadowLightPosition", "contactShadowEnabled", "contactShadowDistance", "contactShadowStrength", "envMapIntensity", "aoMapIntensity", "normalScale", "metallic", "roughness", "clearcoat", "clearcoatRoughness", "sheen", "sheenColor", "sheenRoughness", "transmission", "ior", "iridescence", "iridescenceIor", "iridescenceThickness", "anisotropy", "anisotropyRotation", "specularIntensity", "specularColor", "thickness", "attenuationDistance", "attenuationColor", "dispersion", "subsurface", "subsurfaceColor", "subsurfaceRadius", "parallaxMap", "useParallaxMap", "parallaxScale", "parallaxMinLayers", "parallaxMaxLayers", "diffuseMapTransform", "diffuseUvChannel", "exposure", "gammaValue", "toneMapping", "useVertexColor", "unlit", "fogEnabled", "fogColor", "fogNear", "fogFar" ];
        for (var zaugl = 0; zaugl < 8; zaugl++) zaugk.push("lightPosition[" + zaugl + "]", "lightDirection[" + zaugl + "]", "lightColor[" + zaugl + "]", "lightGroundColor[" + zaugl + "]", "lightIntensity[" + zaugl + "]", "lightDistance[" + zaugl + "]", "lightCone[" + zaugl + "]", "lightPenumbra[" + zaugl + "]", "lightType[" + zaugl + "]", "lightArea[" + zaugl + "]", "lightRectRight[" + zaugl + "]");
        zaugk.push("ltcMatTexture", "ltcAmpTexture", "lightEmissiveTexture");
        for (var zaugm = 0; zaugm < 8; zaugm++) zaugk.push("uClipPlanes[" + zaugm + "]");
        zaugk.push("uClipPlaneCount");
        for (var zaugn = 0; zaugn < zaugk.length; zaugn++) zaugj.uniforms[zaugk[zaugn]] = zaugc.getUniformLocation(zaugj, zaugk[zaugn]);
        this.programCache[zauge] = zaugj;
        return zaugj;
    }
    getBuffer(zauga, zaugb, zaugc) {
        var zaugd = this.gl;
        if (!zaugd) return null;
        var zauge = this.bufferCache ? this.bufferCache.get(zauga) : null;
        if (!zauge) {
            zauge = {
                versions: {}
            };
            if (this.bufferCache) this.bufferCache.set(zauga, zauge);
        }
        var zaugf = zaugc.version || 0;
        if (zauge[zaugb] && !zaugc.needsUpdate && zauge.versions[zaugb] === zaugf) return zauge[zaugb];
        var zaugg = zauge[zaugb] || zaugd.createBuffer();
        zaugd.bindBuffer(zaugd.ARRAY_BUFFER, zaugg);
        if (zauge[zaugb] && zaugd.bufferSubData) zaugd.bufferSubData(zaugd.ARRAY_BUFFER, 0, zaugc.array); else zaugd.bufferData(zaugd.ARRAY_BUFFER, zaugc.array, zaugd.DYNAMIC_DRAW || zaugd.STATIC_DRAW);
        zauge[zaugb] = zaugg;
        zauge.versions[zaugb] = zaugf;
        zaugc.needsUpdate = false;
        return zaugg;
    }
    getIndexBuffer(zauga, zaugb) {
        var zaugc = this.gl;
        var zaugd = this.bufferCache ? this.bufferCache.get(zauga) : null;
        if (!zaugd) {
            zaugd = {};
            if (this.bufferCache) this.bufferCache.set(zauga, zaugd);
        }
        var zauge = zaugb === zauga.index ? "index" : "wireIndex";
        if (zaugd[zauge]) return zaugd[zauge];
        zaugd[zauge] = zaugc.createBuffer();
        zaugc.bindBuffer(zaugc.ELEMENT_ARRAY_BUFFER, zaugd[zauge]);
        zaugc.bufferData(zaugc.ELEMENT_ARRAY_BUFFER, zaugb, zaugc.STATIC_DRAW);
        return zaugd[zauge];
    }
    getCubeTexture(zauga) {
        var zaugb = this.gl;
        if (!zaugb || !zauga) return null;
        var zaugc = this.cubeTextureCache ? this.cubeTextureCache.get(zauga) : null;
        if (zaugc && !zauga.needsUpdate) return zaugc;
        var zaugd = zaugc || zaugb.createTexture();
        zaugb.bindTexture(zaugb.TEXTURE_CUBE_MAP, zaugd);
        var zauge = [ zaugb.TEXTURE_CUBE_MAP_POSITIVE_X, zaugb.TEXTURE_CUBE_MAP_NEGATIVE_X, zaugb.TEXTURE_CUBE_MAP_POSITIVE_Y, zaugb.TEXTURE_CUBE_MAP_NEGATIVE_Y, zaugb.TEXTURE_CUBE_MAP_POSITIVE_Z, zaugb.TEXTURE_CUBE_MAP_NEGATIVE_Z ];
        if (zauga.compressed && zauga.compressed.target === "cubemap" && zauga.compressed.levels) {
            for (var zaugf = 0; zaugf < zauga.compressed.levels.length; zaugf++) {
                var zaugg = zauga.compressed.levels[zaugf];
                for (var zaugh = 0; zaugh < 6; zaugh++) {
                    var zaugi = zaugg.slices[zaugh];
                    if (!zaugi) continue;
                    if (zaugg.compressed && zaugb.compressedTexImage2D) zaugb.compressedTexImage2D(zauge[zaugh], zaugg.level, zaugg.internalFormat, zaugg.width, zaugg.height, 0, zaugi.data); else zaugb.texImage2D(zauge[zaugh], zaugg.level, zaugb.RGBA, zaugg.width, zaugg.height, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, zaugi.data);
                }
            }
            zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_MIN_FILTER, zaugb.LINEAR);
            zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_MAG_FILTER, zaugb.LINEAR);
            zaugb.bindTexture(zaugb.TEXTURE_CUBE_MAP, null);
            if (this.cubeTextureCache) this.cubeTextureCache.set(zauga, zaugd);
            zauga.needsUpdate = false;
            return zaugd;
        }
        var zaugj = this.isWebGL2 || zaugb.getExtension && !!zaugb.getExtension("OES_texture_float");
        var zaugk = this.isWebGL2 && zaugb.RGBA32F ? zaugb.RGBA32F : zaugb.RGBA;
        for (var zaugl = 0; zaugl < 6; zaugl++) {
            var zaugm = zauga.images && zauga.images[zaugl];
            if (zaugm && zaugm.data && zaugm.width && zaugm.height && zaugj) zaugb.texImage2D(zauge[zaugl], 0, zaugk, zaugm.width, zaugm.height, 0, zaugb.RGBA, zaugb.FLOAT, zaugm.data); else if (zaugm && zaugm.width && zaugm.height) zaugb.texImage2D(zauge[zaugl], 0, zaugb.RGBA, zaugb.RGBA, zaugb.UNSIGNED_BYTE, zaugm); else zaugb.texImage2D(zauge[zaugl], 0, zaugb.RGBA, 1, 1, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, new Uint8Array([ 128, 128, 128, 255 ]));
        }
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_MIN_FILTER, zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_MAG_FILTER, zaugb.LINEAR);
        var zaugn = this.getAnisotropyExtension();
        if (zaugn && zauga.anisotropy > 1) {
            var zaugo = zaugb.getParameter(zaugn.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            zaugb.texParameterf(zaugb.TEXTURE_CUBE_MAP, zaugn.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(zauga.anisotropy, zaugo));
        }
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_WRAP_S, zaugb.CLAMP_TO_EDGE);
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_WRAP_T, zaugb.CLAMP_TO_EDGE);
        if (zaugb.generateMipmap && zauga.generateMipmaps !== false && zauga.minFilter && zauga.minFilter.toLowerCase().indexOf("mipmap") !== -1) zaugb.generateMipmap(zaugb.TEXTURE_CUBE_MAP);
        zaugb.bindTexture(zaugb.TEXTURE_CUBE_MAP, null);
        if (this.cubeTextureCache) this.cubeTextureCache.set(zauga, zaugd);
        zauga.needsUpdate = false;
        return zaugd;
    }
    getCubeTextureHandle(zauga) {
        return zauga && zauga.texture ? zauga.texture : zauga && zauga.handle ? zauga.handle : zauga;
    }
    getWireframeIndex(zauga) {
        var zaugb = this.bufferCache ? this.bufferCache.get(zauga) : null;
        if (zaugb && zaugb.wireData) return zaugb.wireData;
        var zaugc = zauga.index;
        var zaugd = [];
        if (zaugc) for (var zauge = 0; zauge < zaugc.length; zauge += 3) {
            var zaugf = zaugc[zauge], zaugg = zaugc[zauge + 1], zaugh = zaugc[zauge + 2];
            zaugd.push(zaugf, zaugg, zaugg, zaugh, zaugh, zaugf);
        } else {
            var zaugi = zauga.attributes.position.array.length / zauga.attributes.position.itemSize;
            for (var zaugj = 0; zaugj < zaugi; zaugj += 3) zaugd.push(zaugj, zaugj + 1, zaugj + 1, zaugj + 2, zaugj + 2, zaugj);
        }
        var zaugk = zaugd.length > 65535 ? new Uint32Array(zaugd) : new Uint16Array(zaugd);
        if (!zaugb) {
            zaugb = {};
            if (this.bufferCache) this.bufferCache.set(zauga, zaugb);
        }
        zaugb.wireData = zaugk;
        return zaugk;
    }
    getTexture(zauga) {
        var zaugb = this.gl;
        if (!zaugb || !zauga) return null;
        var zaugc = this.textureCache ? this.textureCache.get(zauga) : null;
        if (zauga.isArrayTexture) return this.getDataArrayTexture(zauga);
        if (zaugc && !zauga.needsUpdate) return zaugc;
        var zaugd = zaugc || zaugb.createTexture();
        zaugb.bindTexture(zaugb.TEXTURE_2D, zaugd);
        var zauge = zauga.image;
        var zaugf = zauge && zauge.videoWidth !== undefined ? zauge.videoWidth : zauge ? zauge.width : 0;
        var zaugg = zauge && zauge.videoHeight !== undefined ? zauge.videoHeight : zauge ? zauge.height : 0;
        if (zauge && zaugf && zaugg) {
            if (zaugb.pixelStorei) zaugb.pixelStorei(zaugb.UNPACK_FLIP_Y_WEBGL, !!zauga.flipY);
            zaugb.texImage2D(zaugb.TEXTURE_2D, 0, zauga.colorSpace === "srgb" && zaugb.SRGB8_ALPHA8 ? zaugb.SRGB8_ALPHA8 : zaugb.RGBA, zaugb.RGBA, zaugb.UNSIGNED_BYTE, zauge);
        } else if (!(zauga.isDataTexture && zauga.data) && !zauga.hdrData) {
            zaugb.texImage2D(zaugb.TEXTURE_2D, 0, zaugb.RGBA, 1, 1, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, new Uint8Array([ 255, 255, 255, 255 ]));
        }
        var zaugh = function(zauga) {
            return zauga === "clamp" ? zaugb.CLAMP_TO_EDGE : zauga === "mirror" ? zaugb.MIRRORED_REPEAT : zaugb.REPEAT;
        };
        var zaugi = function(zauga, zaugc) {
            if (zauga === "nearest") return zaugb.NEAREST;
            if (zauga === "nearestMipmapNearest") return zaugb.NEAREST_MIPMAP_NEAREST;
            if (zauga === "nearestMipmapLinear") return zaugb.NEAREST_MIPMAP_LINEAR;
            if (zauga === "linearMipmapNearest") return zaugb.LINEAR_MIPMAP_NEAREST;
            if (zauga === "linearMipmapLinear") return zaugb.LINEAR_MIPMAP_LINEAR;
            return zaugb.LINEAR;
        };
        if (zauga.isDataTexture && zauga.data) {
            var zaugj = zauga.format === "red" || zauga.format === "r" ? this.isWebGL2 && zaugb.RED ? zaugb.RED : zaugb.RGBA : zauga.format === "rg" ? this.isWebGL2 && zaugb.RG ? zaugb.RG : zaugb.RGBA : zaugb.RGBA;
            var zaugk = zauga.type === "float" ? this.isWebGL2 || zaugb.getExtension && zaugb.getExtension("OES_texture_float") ? zaugb.FLOAT : zaugb.UNSIGNED_BYTE : zauga.type === "halfFloat" ? this.isWebGL2 && zaugb.HALF_FLOAT ? zaugb.HALF_FLOAT : zaugb.getExtension && zaugb.getExtension("OES_texture_half_float") ? zaugb.getExtension("OES_texture_half_float").HALF_FLOAT_OES : zaugb.UNSIGNED_BYTE : zaugb.UNSIGNED_BYTE;
            var zaugl = zaugj === zaugb.RED ? 1 : zaugj === zaugb.RG ? 2 : 4;
            var zaugm = this.isWebGL2 ? zaugk === zaugb.FLOAT ? zaugj === zaugb.RED ? zaugb.R32F : zaugj === zaugb.RG ? zaugb.RG32F : zaugb.RGBA32F : zaugk === zaugb.HALF_FLOAT ? zaugj === zaugb.RED ? zaugb.R16F : zaugj === zaugb.RG ? zaugb.RG16F : zaugb.RGBA16F : zaugj === zaugb.RED ? zaugb.R8 : zaugj === zaugb.RG ? zaugb.RG8 : zaugb.RGBA8 : zaugb.RGBA;
            var zaugn = zaugk === zaugb.UNSIGNED_BYTE ? 1 : zaugk === zaugb.HALF_FLOAT ? 2 : 4;
            if (zauga.data.byteLength !== undefined && zauga.data.byteLength < zauga.width * zauga.height * zaugl * zaugn) zauga.data = new (zaugk === zaugb.UNSIGNED_BYTE ? Uint8Array : Float32Array)(zauga.width * zauga.height * zaugl);
            zaugb.texImage2D(zaugb.TEXTURE_2D, 0, zaugm, zauga.width, zauga.height, 0, zaugj, zaugk, zauga.data);
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_S, zaugh(zauga.wrapS));
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_T, zaugh(zauga.wrapT));
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MIN_FILTER, zaugi(zauga.minFilter, true));
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MAG_FILTER, zaugi(zauga.magFilter, false));
            if (zauga.generateMipmaps === true && zauga.minFilter && zauga.minFilter.toLowerCase().indexOf("mipmap") !== -1 && zaugb.generateMipmap) zaugb.generateMipmap(zaugb.TEXTURE_2D);
            zaugb.bindTexture(zaugb.TEXTURE_2D, null);
            if (this.textureCache) this.textureCache.set(zauga, zaugd);
            zauga.needsUpdate = false;
            return zaugd;
        }
        if (zauga.hdrData) {
            var zaugo = zaugb.FLOAT;
            var zaugp = zaugb.getExtension && zaugb.getExtension("OES_texture_float");
            if (!this.isWebGL2 && !zaugp) zaugo = zaugb.UNSIGNED_BYTE;
            if (zaugo === zaugb.FLOAT) zaugb.texImage2D(zaugb.TEXTURE_2D, 0, this.isWebGL2 && zaugb.RGBA32F ? zaugb.RGBA32F : zaugb.RGBA, zauga.width, zauga.height, 0, zaugb.RGBA, zaugo, zauga.hdrData); else {
                var zaugq = new Uint8Array(zauga.hdrData.length);
                for (var zaugr = 0; zaugr < zauga.hdrData.length; zaugr++) zaugq[zaugr] = Math.min(255, Math.floor(Math.pow(Math.max(0, zauga.hdrData[zaugr]), 1 / 2.2) * 255));
                zaugb.texImage2D(zaugb.TEXTURE_2D, 0, zaugb.RGBA, zauga.width, zauga.height, 0, zaugb.RGBA, zaugo, zaugq);
            }
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MIN_FILTER, zaugb.LINEAR);
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MAG_FILTER, zaugb.LINEAR);
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_S, zaugb.CLAMP_TO_EDGE);
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_T, zaugb.CLAMP_TO_EDGE);
            zaugb.bindTexture(zaugb.TEXTURE_2D, null);
            if (this.textureCache) this.textureCache.set(zauga, zaugd);
            zauga.needsUpdate = false;
            return zaugd;
        }
        if (zauga.compressed && zauga.compressed.levels) {
            var zaugs = zauga.compressed;
            for (var zaugt = 0; zaugt < zaugs.levels.length; zaugt++) {
                var zaugu = zaugs.levels[zaugt];
                if (zaugu.compressed && zaugb.compressedTexImage2D) zaugb.compressedTexImage2D(zaugb.TEXTURE_2D, zaugu.level, zaugu.internalFormat, zaugu.width, zaugu.height, 0, zaugu.data); else zaugb.texImage2D(zaugb.TEXTURE_2D, zaugu.level, zaugb.RGBA, zaugu.width, zaugu.height, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, zaugu.data);
            }
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MIN_FILTER, zaugi(zauga.minFilter, true));
            zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MAG_FILTER, zaugi(zauga.magFilter, false));
            zaugb.bindTexture(zaugb.TEXTURE_2D, null);
            if (this.textureCache) this.textureCache.set(zauga, zaugd);
            zauga.needsUpdate = false;
            return zaugd;
        }
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_S, zaugh(zauga.wrapS));
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_T, zaugh(zauga.wrapT));
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MIN_FILTER, zaugi(zauga.minFilter, true));
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MAG_FILTER, zaugi(zauga.magFilter, false));
        var zaugv = this.getAnisotropyExtension();
        if (zaugv && zauga.anisotropy > 1) {
            var zaugw = zaugb.getParameter(zaugv.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            zaugb.texParameterf(zaugb.TEXTURE_2D, zaugv.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(zauga.anisotropy, zaugw));
        }
        if (zauga.generateMipmaps !== false && zauga.mipmapsAutoUpdate !== false && zauga.minFilter && zauga.minFilter.toLowerCase().indexOf("mipmap") !== -1 && zaugb.generateMipmap) zaugb.generateMipmap(zaugb.TEXTURE_2D);
        zaugb.bindTexture(zaugb.TEXTURE_2D, null);
        if (this.textureCache) this.textureCache.set(zauga, zaugd);
        zauga.needsUpdate = false;
        return zaugd;
    }
    getDataArrayTexture(zauga) {
        var zaugb = this.gl;
        if (!zaugb || !this.isWebGL2 || !zauga || !zauga.data) return null;
        var zaugc = this.textureCache ? this.textureCache.get(zauga) : null;
        if (zaugc && !zauga.needsUpdate) return zaugc;
        var zaugd = zaugc || zaugb.createTexture();
        var zauge = zauga.format === "red" || zauga.format === "r" ? zaugb.RED : zauga.format === "rg" ? zaugb.RG : zaugb.RGBA;
        var zaugf = zauga.type === "float" ? zaugb.FLOAT : zauga.type === "halfFloat" ? zaugb.HALF_FLOAT : zaugb.UNSIGNED_BYTE;
        var zaugg = zaugf === zaugb.FLOAT ? zauge === zaugb.RED ? zaugb.R32F : zauge === zaugb.RG ? zaugb.RG32F : zaugb.RGBA32F : zaugf === zaugb.HALF_FLOAT ? zauge === zaugb.RED ? zaugb.R16F : zauge === zaugb.RG ? zaugb.RG16F : zaugb.RGBA16F : zauge === zaugb.RED ? zaugb.R8 : zauge === zaugb.RG ? zaugb.RG8 : zaugb.RGBA8;
        zaugb.bindTexture(zaugb.TEXTURE_2D_ARRAY, zaugd);
        zaugb.texImage3D(zaugb.TEXTURE_2D_ARRAY, 0, zaugg, zauga.width, zauga.height, zauga.depth, 0, zauge, zaugf, zauga.data);
        zaugb.texParameteri(zaugb.TEXTURE_2D_ARRAY, zaugb.TEXTURE_MIN_FILTER, zauga.minFilter === "nearest" ? zaugb.NEAREST : zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_2D_ARRAY, zaugb.TEXTURE_MAG_FILTER, zauga.magFilter === "nearest" ? zaugb.NEAREST : zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_2D_ARRAY, zaugb.TEXTURE_WRAP_S, zaugb.CLAMP_TO_EDGE);
        zaugb.texParameteri(zaugb.TEXTURE_2D_ARRAY, zaugb.TEXTURE_WRAP_T, zaugb.CLAMP_TO_EDGE);
        zaugb.bindTexture(zaugb.TEXTURE_2D_ARRAY, null);
        if (this.textureCache) this.textureCache.set(zauga, zaugd);
        zauga.needsUpdate = false;
        return zaugd;
    }
    getInstanceExtension() {
        if (this.instanceExtension !== undefined) return this.instanceExtension;
        if (this.gl.vertexAttribDivisor && this.gl.drawElementsInstanced) this.instanceExtension = this.gl; else this.instanceExtension = this.gl.getExtension ? this.gl.getExtension("ANGLE_instanced_arrays") : null;
        return this.instanceExtension;
    }
    getTextureArray(zauga) {
        if (!this.gl || !this.isWebGL2 || !zauga || !zauga.compressed) return null;
        var zaugb = this.gl;
        var zaugc = zauga.target === "3d" ? zaugb.TEXTURE_3D : zaugb.TEXTURE_2D_ARRAY;
        var zaugd = zaugb.createTexture();
        zaugb.bindTexture(zaugc, zaugd);
        var zauge = zauga.compressed;
        for (var zaugf = 0; zaugf < zauge.levels.length; zaugf++) {
            var zaugg = zauge.levels[zaugf];
            var zaugh = zaugg.slices || [];
            var zaugi = zauga.target === "3d" ? Math.max(1, Math.floor(zauge.depth / Math.pow(2, zaugf))) : Math.max(1, Math.floor(zauge.layers));
            var zaugj = 0;
            for (var zaugk = 0; zaugk < zaugh.length; zaugk++) zaugj += zaugh[zaugk].data.byteLength;
            var zaugl = new Uint8Array(zaugj);
            var zaugm = 0;
            for (var zaugn = 0; zaugn < zaugh.length; zaugn++) {
                zaugl.set(zaugh[zaugn].data, zaugm);
                zaugm += zaugh[zaugn].data.byteLength;
            }
            if (zaugg.compressed && zaugb.compressedTexImage3D) zaugb.compressedTexImage3D(zaugc, zaugg.level, zaugg.internalFormat, zaugg.width, zaugg.height, zaugi, 0, zaugl); else if (zaugb.texImage3D) {
                zaugb.texImage3D(zaugc, zaugg.level, zaugb.RGBA, zaugg.width, zaugg.height, zaugi, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, null);
                for (var zaugo = 0; zaugo < zaugh.length; zaugo++) zaugb.texSubImage3D(zaugc, zaugg.level, 0, 0, zaugo, zaugg.width, zaugg.height, 1, zaugb.RGBA, zaugb.UNSIGNED_BYTE, zaugh[zaugo].data);
            }
        }
        zaugb.texParameteri(zaugc, zaugb.TEXTURE_MIN_FILTER, zauge.levels.length > 1 ? zaugb.LINEAR_MIPMAP_LINEAR : zaugb.LINEAR);
        zaugb.texParameteri(zaugc, zaugb.TEXTURE_MAG_FILTER, zaugb.LINEAR);
        zaugb.texParameteri(zaugc, zaugb.TEXTURE_WRAP_S, zaugb.CLAMP_TO_EDGE);
        zaugb.texParameteri(zaugc, zaugb.TEXTURE_WRAP_T, zaugb.CLAMP_TO_EDGE);
        zaugb.bindTexture(zaugc, null);
        zauga.needsUpdate = false;
        return zaugd;
    }
    getTexture3D(zauga) {
        if (!zauga) return null;
        zauga.target = "3d";
        return this.getTextureArray(zauga);
    }
    renderXRView(zauga, zaugb, zaugc, zaugd, zauge) {
        if (!this.gl || !zaugd) return this;
        return this.renderScene(zauga, zaugb, {
            framebuffer: zaugc,
            width: zaugd.width,
            height: zaugd.height,
            viewport: zaugd,
            clear: zauge !== false
        });
    }
    getCapabilities() {
        var zauga = this.gl;
        if (!zauga) return {
            webgl2: false,
            maxTextureSize: 0,
            maxTextureUnits: 0,
            compressedTextureFormats: [],
            extensions: {}
        };
        var zaugb = [ "WEBGL_compressed_texture_s3tc", "WEBGL_compressed_texture_etc", "WEBGL_compressed_texture_astc", "WEBGL_compressed_texture_pvrtc", "WEBKIT_WEBGL_compressed_texture_pvrtc", "EXT_texture_filter_anisotropic", "OES_texture_float_linear", "OES_texture_half_float_linear", "ANGLE_instanced_arrays" ];
        var zaugc = {};
        for (var zaugd = 0; zaugd < zaugb.length; zaugd++) zaugc[zaugb[zaugd]] = !!(zauga.getExtension && zauga.getExtension(zaugb[zaugd]));
        var zauge = zauga.getParameter(zauga.COMPRESSED_TEXTURE_FORMATS) || [];
        return {
            webgl2: !!this.isWebGL2,
            maxTextureSize: zauga.getParameter(zauga.MAX_TEXTURE_SIZE) || 0,
            maxCubeTextureSize: zauga.getParameter(zauga.MAX_CUBE_MAP_TEXTURE_SIZE) || 0,
            maxTextureUnits: zauga.getParameter(zauga.MAX_TEXTURE_IMAGE_UNITS) || 0,
            maxVertexTextures: zauga.getParameter(zauga.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0,
            maxVertexUniformVectors: zauga.getParameter(zauga.MAX_VERTEX_UNIFORM_VECTORS) || 0,
            maxFragmentUniformVectors: zauga.getParameter(zauga.MAX_FRAGMENT_UNIFORM_VECTORS) || 0,
            compressedTextureFormats: Array.prototype.slice.call(zauge),
            extensions: zaugc
        };
    }
    getAnisotropyExtension() {
        if (this.anisotropyExtension !== undefined) return this.anisotropyExtension;
        var zauga = this.gl;
        this.anisotropyExtension = zauga && zauga.getExtension ? zauga.getExtension("EXT_texture_filter_anisotropic") || zauga.getExtension("WEBKIT_EXT_texture_filter_anisotropic") || zauga.getExtension("MOZ_EXT_texture_filter_anisotropic") : null;
        return this.anisotropyExtension;
    }
    getBlendMinMaxExtension() {
        if (this.blendMinMaxExtension !== undefined) return this.blendMinMaxExtension;
        var zauga = this.gl;
        this.blendMinMaxExtension = zauga && !this.isWebGL2 && zauga.getExtension ? zauga.getExtension("EXT_blend_minmax") : null;
        return this.blendMinMaxExtension;
    }
    setInstanceDivisor(zauga, zaugb) {
        var zaugc = this.getInstanceExtension();
        if (!zaugc) return;
        if (zaugc.vertexAttribDivisor) zaugc.vertexAttribDivisor(zauga, zaugb); else zaugc.vertexAttribDivisorANGLE(zauga, zaugb);
    }
    drawElementsInstanced(zauga, zaugb, zaugc, zaugd, zauge) {
        var zaugf = this.getInstanceExtension();
        if (!zaugf) return;
        if (zaugf.drawElementsInstanced) zaugf.drawElementsInstanced(zauga, zaugb, zaugc, zaugd, zauge); else if (zaugf.drawElementsInstancedANGLE) zaugf.drawElementsInstancedANGLE(zauga, zaugb, zaugc, zaugd, zauge);
    }
    drawArraysInstanced(zauga, zaugb, zaugc, zaugd) {
        var zauge = this.getInstanceExtension();
        if (!zauge) return;
        if (zauge.drawArraysInstanced) zauge.drawArraysInstanced(zauga, zaugb, zaugc, zaugd); else if (zauge.drawArraysInstancedANGLE) zauge.drawArraysInstancedANGLE(zauga, zaugb, zaugc, zaugd);
    }
    getShadowTarget(zauga) {
        var zaugb = this.gl;
        var zaugc = zauga.shadow.mapSize || this.shadowMap.size;
        var zaugd = zauga.shadow.target;
        if (zaugd && zaugd.size === zaugc) return zaugd;
        var zauge = zaugb.createTexture();
        zaugb.bindTexture(zaugb.TEXTURE_2D, zauge);
        zaugb.texImage2D(zaugb.TEXTURE_2D, 0, zaugb.RGBA, zaugc, zaugc, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, null);
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MIN_FILTER, zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_MAG_FILTER, zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_S, zaugb.CLAMP_TO_EDGE);
        zaugb.texParameteri(zaugb.TEXTURE_2D, zaugb.TEXTURE_WRAP_T, zaugb.CLAMP_TO_EDGE);
        var zaugf = zaugb.createFramebuffer();
        zaugb.bindFramebuffer(zaugb.FRAMEBUFFER, zaugf);
        zaugb.framebufferTexture2D(zaugb.FRAMEBUFFER, zaugb.COLOR_ATTACHMENT0, zaugb.TEXTURE_2D, zauge, 0);
        var zaugg = zaugb.createRenderbuffer();
        zaugb.bindRenderbuffer(zaugb.RENDERBUFFER, zaugg);
        zaugb.renderbufferStorage(zaugb.RENDERBUFFER, zaugb.DEPTH_COMPONENT16, zaugc, zaugc);
        zaugb.framebufferRenderbuffer(zaugb.FRAMEBUFFER, zaugb.DEPTH_ATTACHMENT, zaugb.RENDERBUFFER, zaugg);
        zaugb.bindFramebuffer(zaugb.FRAMEBUFFER, null);
        zaugd = {
            size: zaugc,
            texture: zauge,
            framebuffer: zaugf,
            depth: zaugg
        };
        zauga.shadow.target = zaugd;
        zauga.shadow.map = zauge;
        return zaugd;
    }
    getShadowProgram() {
        var zauga = this.gl;
        if (this.shadowProgram) return this.shadowProgram;
        var zaugb = this.compileShader(zauga.VERTEX_SHADER, "attribute vec3 position; attribute vec4 instanceMatrix0; attribute vec4 instanceMatrix1; attribute vec4 instanceMatrix2; attribute vec4 instanceMatrix3; uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; uniform int useInstancing; void main(){ vec4 local=vec4(position,1.0); if(useInstancing==1) local=mat4(instanceMatrix0,instanceMatrix1,instanceMatrix2,instanceMatrix3)*local; gl_Position=projectionMatrix*viewMatrix*modelMatrix*local; }");
        var zaugc = this.compileShader(zauga.FRAGMENT_SHADER, "precision mediump float; void main(){ gl_FragColor=vec4(vec3(gl_FragCoord.z),1.0); }");
        if (!zaugb || !zaugc) return null;
        var zaugd = zauga.createProgram();
        zauga.attachShader(zaugd, zaugb);
        zauga.attachShader(zaugd, zaugc);
        zauga.bindAttribLocation(zaugd, 0, "position");
        zauga.bindAttribLocation(zaugd, 1, "instanceMatrix0");
        zauga.bindAttribLocation(zaugd, 2, "instanceMatrix1");
        zauga.bindAttribLocation(zaugd, 3, "instanceMatrix2");
        zauga.bindAttribLocation(zaugd, 4, "instanceMatrix3");
        zauga.linkProgram(zaugd);
        if (!zauga.getProgramParameter(zaugd, zauga.LINK_STATUS)) return null;
        zaugd.useInstancing = zauga.getUniformLocation(zaugd, "useInstancing");
        zaugd.modelMatrix = zauga.getUniformLocation(zaugd, "modelMatrix");
        zaugd.viewMatrix = zauga.getUniformLocation(zaugd, "viewMatrix");
        zaugd.projectionMatrix = zauga.getUniformLocation(zaugd, "projectionMatrix");
        this.shadowProgram = zaugd;
        return zaugd;
    }
    getShadowCascadeTarget(zauga, zaugb) {
        var zaugc = this.gl;
        var zaugd = zauga.shadow.mapSize || this.shadowMap.size;
        zauga.shadow.targets = zauga.shadow.targets || [];
        var zauge = zauga.shadow.targets[zaugb];
        if (zauge && zauge.size === zaugd) return zauge;
        var zaugf = zaugc.createTexture();
        zaugc.bindTexture(zaugc.TEXTURE_2D, zaugf);
        zaugc.texImage2D(zaugc.TEXTURE_2D, 0, zaugc.RGBA, zaugd, zaugd, 0, zaugc.RGBA, zaugc.UNSIGNED_BYTE, null);
        zaugc.texParameteri(zaugc.TEXTURE_2D, zaugc.TEXTURE_MIN_FILTER, zaugc.LINEAR);
        zaugc.texParameteri(zaugc.TEXTURE_2D, zaugc.TEXTURE_MAG_FILTER, zaugc.LINEAR);
        zaugc.texParameteri(zaugc.TEXTURE_2D, zaugc.TEXTURE_WRAP_S, zaugc.CLAMP_TO_EDGE);
        zaugc.texParameteri(zaugc.TEXTURE_2D, zaugc.TEXTURE_WRAP_T, zaugc.CLAMP_TO_EDGE);
        var zaugg = zaugc.createFramebuffer();
        zaugc.bindFramebuffer(zaugc.FRAMEBUFFER, zaugg);
        zaugc.framebufferTexture2D(zaugc.FRAMEBUFFER, zaugc.COLOR_ATTACHMENT0, zaugc.TEXTURE_2D, zaugf, 0);
        var zaugh = zaugc.createRenderbuffer();
        zaugc.bindRenderbuffer(zaugc.RENDERBUFFER, zaugh);
        zaugc.renderbufferStorage(zaugc.RENDERBUFFER, zaugc.DEPTH_COMPONENT16, zaugd, zaugd);
        zaugc.framebufferRenderbuffer(zaugc.FRAMEBUFFER, zaugc.DEPTH_ATTACHMENT, zaugc.RENDERBUFFER, zaugh);
        zaugc.bindFramebuffer(zaugc.FRAMEBUFFER, null);
        zauge = {
            size: zaugd,
            texture: zaugf,
            framebuffer: zaugg,
            depth: zaugh
        };
        zauga.shadow.targets[zaugb] = zauge;
        return zauge;
    }
    renderDepthTarget(zauga, zaugb, zaugc) {
        var zaugd = this.gl;
        var zauge = this.getShadowProgram();
        if (!zauge) return false;
        var zaugf = this;
        zaugd.bindFramebuffer(zaugd.FRAMEBUFFER, zaugc.framebuffer);
        zaugd.viewport(0, 0, zaugc.size, zaugc.size);
        zaugd.clearColor(1, 1, 1, 1);
        zaugd.clear(zaugd.COLOR_BUFFER_BIT | zaugd.DEPTH_BUFFER_BIT);
        zaugd.enable(zaugd.DEPTH_TEST);
        zaugd.depthMask(true);
        zaugd.useProgram(zauge);
        this.currentProgram = zauge;
        zauga.traverseVisible(function(zauga) {
            if (!(zauga instanceof Mesh) || !zauga.geometry || !zauga.geometry.attributes.position) return;
            zauga.updateMatrixWorld(true);
            var zaugc = zauga.geometry.attributes.position;
            zaugd.bindBuffer(zaugd.ARRAY_BUFFER, zaugf.getBuffer(zauga.geometry, "position", zaugc));
            zaugd.enableVertexAttribArray(0);
            zaugd.vertexAttribPointer(0, zaugc.itemSize, zaugf.getAttributeType(zaugc), !!zaugc.normalized, 0, 0);
            if (zauge.useInstancing) zaugd.uniform1i(zauge.useInstancing, 0);
            for (var zaugg = 0; zaugg < 4; zaugg++) {
                zaugd.disableVertexAttribArray(1 + zaugg);
                zaugf.setInstanceDivisor(1 + zaugg, 0);
            }
            if (zauge.viewMatrix) zaugd.uniformMatrix4fv(zauge.viewMatrix, false, zaugb.matrixWorldInverse.elements);
            if (zauge.projectionMatrix) zaugd.uniformMatrix4fv(zauge.projectionMatrix, false, zaugb.projectionMatrix.elements);
            if (zauge.modelMatrix) zaugd.uniformMatrix4fv(zauge.modelMatrix, false, zauga.matrixWorld.elements);
            if (zauga.geometry.index) {
                var zaugh = zauga.geometry.index;
                zaugd.bindBuffer(zaugd.ELEMENT_ARRAY_BUFFER, zaugf.getIndexBuffer(zauga.geometry, zaugh));
                zaugd.drawElements(zaugd.TRIANGLES, zaugh.length, zaugh instanceof Uint32Array ? zaugd.UNSIGNED_INT : zaugd.UNSIGNED_SHORT, 0);
            } else zaugd.drawArrays(zaugd.TRIANGLES, 0, zaugc.array.length / zaugc.itemSize);
        });
        zaugd.bindFramebuffer(zaugd.FRAMEBUFFER, null);
        return true;
    }
    renderShadowMap(zauga, zaugb, zaugc) {
        if (Array.isArray(zaugb)) {
            for (var zaugd = 0; zaugd < zaugb.length; zaugd++) if (zaugb[zaugd].type === "DirectionalLight") {
                zaugb = zaugb[zaugd];
                break;
            }
        }
        if (!this.gl || !zaugb || !zaugb.shadow) return false;
        var zauge = this.gl;
        if (zaugb.type !== "DirectionalLight" || !zaugc || zaugb.shadow.cascades <= 1) {
            var zaugf = this.getShadowTarget(zaugb);
            var zaugg = zaugb.shadow.camera;
            zaugg.position.setFromMatrixPosition(zaugb.matrixWorld);
            if (zaugb.target) zaugb.target.updateMatrixWorld(true);
            zaugg.lookAt(zaugb.target ? (new Vector3).setFromMatrixPosition(zaugb.target.matrixWorld) : new Vector3);
            zaugg.updateMatrixWorld(true);
            var zaugh = (new Matrix4).set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
            zaugb.shadow.matrix.multiplyMatrices(zaugh, zaugg.projectionMatrix).multiply(zaugg.matrixWorldInverse);
            zaugb.shadow.maps = [ zaugf.texture ];
            zaugb.shadow.matrices = [ zaugb.shadow.matrix ];
            zaugb.shadow.splits = [ zaugc ? zaugc.far : 100 ];
            return this.renderDepthTarget(zauga, zaugg, zaugf);
        }
        zaugc.updateMatrixWorld(true);
        var zaugi = Math.max(1, Math.min(4, Math.floor(zaugb.shadow.cascades || 4)));
        var zaugj = Math.max(.01, zaugc.near || .1);
        var zaugk = zaugc.far || 1e3;
        var zaugl = faoxomclamp(zaugb.shadow.splitLambda === undefined ? .65 : zaugb.shadow.splitLambda, 0, 1);
        var zaugm = [];
        for (var zaugn = 1; zaugn <= zaugi; zaugn++) {
            var zaugo = zaugn / zaugi;
            var zaugp = zaugj * Math.pow(zaugk / zaugj, zaugo);
            var zaugq = zaugj + (zaugk - zaugj) * zaugo;
            zaugm.push(zaugq * (1 - zaugl) + zaugp * zaugl);
        }
        var zaugr = new Vector3;
        var zaugs = (new Vector3).setFromMatrixPosition(zaugb.matrixWorld);
        var zaugt = zaugb.target ? (new Vector3).setFromMatrixPosition(zaugb.target.matrixWorld) : new Vector3;
        zaugr.subVectors(zaugt, zaugs).normalize();
        if (zaugr.lengthSq() < 1e-8) zaugr.set(0, -1, 0);
        var zaugu = new Vector3(zaugc.matrixWorld.elements[0], zaugc.matrixWorld.elements[1], zaugc.matrixWorld.elements[2]).normalize();
        var zaugv = new Vector3(zaugc.matrixWorld.elements[4], zaugc.matrixWorld.elements[5], zaugc.matrixWorld.elements[6]).normalize();
        var zaugw = zaugc.getWorldDirection(new Vector3);
        var zaugx = zaugj;
        var zaugy = [], zaugz = [], zaugaa = [];
        for (var zaugab = 0; zaugab < zaugi; zaugab++) {
            var zaugac = zaugm[zaugab];
            var zaugad = [];
            var zaugae = [ zaugx, zaugac ];
            for (var zaugaf = 0; zaugaf < 2; zaugaf++) {
                var zaugag = zaugae[zaugaf];
                var zaugah = zaugc instanceof PerspectiveCamera ? Math.tan(zaugc.fov * Math.PI / 360) * zaugag : (zaugc.top - zaugc.bottom) * .5;
                var zaugai = zaugc instanceof PerspectiveCamera ? zaugah * zaugc.aspect : (zaugc.right - zaugc.left) * .5;
                var zaugaj = (new Vector3).setFromMatrixPosition(zaugc.matrixWorld).addScaledVector(zaugw, zaugag);
                zaugad.push(zaugaj.clone().addScaledVector(zaugv, zaugah).addScaledVector(zaugu, -zaugai), zaugaj.clone().addScaledVector(zaugv, zaugah).addScaledVector(zaugu, zaugai), zaugaj.clone().addScaledVector(zaugv, -zaugah).addScaledVector(zaugu, -zaugai), zaugaj.clone().addScaledVector(zaugv, -zaugah).addScaledVector(zaugu, zaugai));
            }
            var zaugak = new Vector3;
            for (var zaugal = 0; zaugal < zaugad.length; zaugal++) zaugak.add(zaugad[zaugal]);
            zaugak.multiplyScalar(1 / zaugad.length);
            var zaugam = 0;
            for (var zaugan = 0; zaugan < zaugad.length; zaugan++) zaugam = Math.max(zaugam, zaugak.distanceTo(zaugad[zaugan]));
            zaugam = Math.ceil(zaugam * 16) / 16;
            var zaugao = new OrthographicCamera(-zaugam, zaugam, zaugam, -zaugam, .1, zaugam * 6 + zaugac);
            zaugao.position.copy(zaugak).addScaledVector(zaugr, -zaugam * 3);
            zaugao.lookAt(zaugak);
            zaugao.updateMatrixWorld(true);
            var zaugap = this.getShadowCascadeTarget(zaugb, zaugab);
            this.renderDepthTarget(zauga, zaugao, zaugap);
            var zaugaq = (new Matrix4).set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
            var zaugar = (new Matrix4).multiplyMatrices(zaugaq, zaugao.projectionMatrix).multiply(zaugao.matrixWorldInverse);
            zaugy.push(zaugap.texture);
            zaugz.push(zaugar);
            zaugaa.push(zaugao);
            zaugx = zaugac;
        }
        zaugb.shadow.maps = zaugy;
        zaugb.shadow.map = zaugy[0];
        zaugb.shadow.matrices = zaugz;
        zaugb.shadow.matrix = zaugz[0];
        zaugb.shadow.cameras = zaugaa;
        zaugb.shadow.splits = zaugm;
        return true;
    }
    drawOcclusion(zauga, zaugb) {
        var zaugc = this.gl;
        if (!zaugc || !zauga || !zauga.geometry || !zauga.geometry.attributes.position) return;
        var zaugd = this.getShadowProgram();
        if (!zaugd) return;
        var zauge = zauga.geometry.attributes.position;
        zaugc.useProgram(zaugd);
        this.currentProgram = zaugd;
        zaugc.bindBuffer(zaugc.ARRAY_BUFFER, this.getBuffer(zauga.geometry, "position", zauge));
        zaugc.enableVertexAttribArray(0);
        zaugc.vertexAttribPointer(0, zauge.itemSize, this.getAttributeType(zauge), !!zauge.normalized, 0, 0);
        if (zaugd.modelMatrix) zaugc.uniformMatrix4fv(zaugd.modelMatrix, false, zauga.matrixWorld.elements);
        if (zaugd.viewMatrix) zaugc.uniformMatrix4fv(zaugd.viewMatrix, false, zaugb.matrixWorldInverse.elements);
        if (zaugd.projectionMatrix) zaugc.uniformMatrix4fv(zaugd.projectionMatrix, false, zaugb.projectionMatrix.elements);
        if (zaugd.useInstancing) zaugc.uniform1i(zaugd.useInstancing, 0);
        var zaugf = zaugc.colorMask ? true : false;
        if (zaugc.colorMask) zaugc.colorMask(false, false, false, false);
        zaugc.depthMask(false);
        if (zauga.geometry.index) {
            var zaugg = zauga.geometry.index;
            zaugc.bindBuffer(zaugc.ELEMENT_ARRAY_BUFFER, this.getIndexBuffer(zauga.geometry, zaugg));
            zaugc.drawElements(zaugc.TRIANGLES, zaugg.length, zaugg instanceof Uint32Array ? zaugc.UNSIGNED_INT : zaugc.UNSIGNED_SHORT, 0);
        } else zaugc.drawArrays(zaugc.TRIANGLES, 0, zauge.array.length / zauge.itemSize);
        if (zaugc.colorMask && zaugf) zaugc.colorMask(true, true, true, true);
        zaugc.depthMask(true);
    }
    batchRenderQueue(zauga) {
        if (!this.autoBatch || !this.getInstanceExtension()) return zauga;
        var zaugb = {};
        var zaugc = [];
        for (var zaugd = 0; zaugd < zauga.length; zaugd++) {
            var zauge = zauga[zaugd];
            var zaugf = zauge.object;
            var zaugg = zaugf.material;
            var zaugh = zaugf.geometry;
            var zaugi = zaugf instanceof Mesh && !(zaugf instanceof Line) && !(zaugf instanceof Points) && !(zaugf instanceof InstancedMesh) && !zauge.transparent && zaugg && zaugh && !(zaugf.morphTargetInfluences && zaugf.morphTargetInfluences.length) && !zaugf.skeleton && !(zaugf.userData && zaugf.userData.noAutoBatch);
            if (zaugi) {
                var zaugj = zaugf.matrixWorld.elements;
                var zaugk = Math.sqrt(zaugj[0] * zaugj[0] + zaugj[1] * zaugj[1] + zaugj[2] * zaugj[2]);
                var zaugl = Math.sqrt(zaugj[4] * zaugj[4] + zaugj[5] * zaugj[5] + zaugj[6] * zaugj[6]);
                var zaugm = Math.sqrt(zaugj[8] * zaugj[8] + zaugj[9] * zaugj[9] + zaugj[10] * zaugj[10]);
                zaugi = Math.abs(zaugk - zaugl) < 1e-4 * Math.max(1, zaugk, zaugl) && Math.abs(zaugk - zaugm) < 1e-4 * Math.max(1, zaugk, zaugm);
            }
            if (!zaugi) {
                zaugc.push(zauge);
                continue;
            }
            var zaugn = zaugh.id + ":" + zaugg.id + ":" + zauge.order;
            if (!zaugb[zaugn]) zaugb[zaugn] = [];
            zaugb[zaugn].push(zauge);
        }
        for (var zaugn in zaugb) {
            var zaugo = zaugb[zaugn];
            if (zaugo.length < this.autoBatchMin) {
                for (var zaugp = 0; zaugp < zaugo.length; zaugp++) zaugc.push(zaugo[zaugp]);
                continue;
            }
            var zaugq = zaugo[0];
            var zaugr = this.autoBatchCache[zaugn];
            if (!zaugr || zaugr.capacity < zaugo.length) {
                var zaugs = zaugr ? Math.max(zaugo.length, zaugr.capacity * 2) : zaugo.length;
                zaugr = new InstancedMesh(zaugq.object.geometry, zaugq.object.material, zaugs);
                zaugr.capacity = zaugs;
                zaugr.sourceObjects = [];
                zaugr.sourceVersions = [];
                this.autoBatchCache[zaugn] = zaugr;
            }
            zaugr.count = zaugo.length;
            zaugr.matrixWorld.identity();
            zaugr.frustumCulled = false;
            zaugr.userData.autoBatch = true;
            var zaugt = !zaugr.sourceObjects || zaugr.sourceObjects.length !== zaugo.length;
            if (!zaugt) for (var zaugu = 0; zaugu < zaugo.length && !zaugt; zaugu++) if (zaugr.sourceObjects[zaugu] !== zaugo[zaugu].object || zaugr.sourceVersions[zaugu] !== zaugo[zaugu].object._transformVersion) zaugt = true;
            for (var zaugv = 0; zaugv < zaugo.length; zaugv++) {
                var zaugw = zaugo[zaugv].object;
                if (zaugt) zaugr.setMatrixAt(zaugv, zaugw.matrixWorld);
                zaugr.sourceObjects[zaugv] = zaugw;
                zaugr.sourceVersions[zaugv] = zaugw._transformVersion;
            }
            if (zaugt) zaugr.instanceNeedsUpdate = true;
            zaugc.push({
                object: zaugr,
                distance: zaugq.distance,
                order: zaugq.order,
                transparent: false
            });
        }
        zaugc.sort(function(zauga, zaugb) {
            if (zauga.transparent !== zaugb.transparent) return zauga.transparent ? 1 : -1;
            return zauga.transparent ? zaugb.distance - zauga.distance : zauga.order - zaugb.order || zauga.distance - zaugb.distance;
        });
        return zaugc;
    }
    computeStaticSignature(zauga, zaugb) {
        var zaugc = 2166136261;
        var zaugd = [ zauga ];
        while (zaugd.length) {
            var zauge = zaugd.pop();
            var zaugf = zauge.children;
            for (var zaugg = 0; zaugg < zaugf.length; zaugg++) {
                var zaugh = zaugf[zaugg];
                if (!zaugh.visible) continue;
                zaugc = Math.imul(zaugc ^ (zaugh.id | 0), 16777619);
                zaugc = Math.imul(zaugc ^ (zaugh._transformVersion || 0), 2246822519);
                zaugc = Math.imul(zaugc ^ (zaugh.renderOrder || 0), 3266489917);
                zaugc = Math.imul(zaugc ^ (zaugh.material ? zaugh.material.id | 0 : 0), 668265263);
                zaugc = Math.imul(zaugc ^ (zaugh.geometry ? zaugh.geometry.id | 0 : 0), 374761393);
                zaugd.push(zaugh);
            }
        }
        var zaugi = zaugb.matrixWorldInverse ? zaugb.matrixWorldInverse.elements : null, zaugj = zaugb.projectionMatrix ? zaugb.projectionMatrix.elements : null;
        if (zaugi) for (var zaugk = 0; zaugk < 16; zaugk += 2) zaugc = Math.imul(zaugc ^ Math.round(zaugi[zaugk] * 4096), 2654435761);
        if (zaugj) for (var zaugl = 0; zaugl < 16; zaugl += 2) zaugc = Math.imul(zaugc ^ Math.round(zaugj[zaugl] * 4096), 2246822519);
        return zaugc | 0;
    }
    collect(zauga, zaugb) {
        if (zauga.matrixAutoUpdate === false && this.staticSceneCache) {
            var zaugc = this.staticSceneCache.get(zauga);
            var zaugd = this.computeStaticSignature(zauga, zaugb);
            if (zaugc && zaugc.camera === zaugb && zaugc.signature === zaugd) {
                this.renderQueue = zaugc.queue;
                return this.renderQueue;
            }
        }
        var zauge = this, zaugf = zaugb.position;
        this.renderQueue = [];
        zauga.traverseVisible(function(zauga) {
            if (zauga.renderLayers && zaugb.renderLayers && !zaugb.renderLayers.shares(zauga.renderLayers)) return;
            if (zauga instanceof Sprite) zauga.faceCamera(zaugb);
            if (zauga instanceof LOD) zauga.update(zaugb);
            if (!(zauga instanceof Mesh) || !zauga.geometry || !zauga.material) return;
            if (zauge.occlusionCuller && !zauge.occlusionCuller.shouldRender(zauga)) return;
            zauga.updateMatrixWorld(false);
            if (zauga.frustumCulled && !faoxomfrustumvisible(zauga, zaugb)) return;
            var zaugc = zauga.material, zaugd = !zaugc.transparent && zaugc.depthTest !== false, zaugg = zauga.matrixWorld.elements, zaugh = zaugg[12] - zaugf.x, zaugi = zaugg[13] - zaugf.y, zaugj = zaugg[14] - zaugf.z;
            zauge.renderQueue.push({
                object: zauga,
                distance: zaugd ? 0 : Math.sqrt(zaugh * zaugh + zaugi * zaugi + zaugj * zaugj),
                order: zauga.renderOrder + zaugc.renderOrder,
                transparent: !zaugd
            });
        });
        this.renderQueue = this.batchRenderQueue(this.renderQueue);
        if (zauga.matrixAutoUpdate === false && this.staticSceneCache) this.staticSceneCache.set(zauga, {
            camera: zaugb,
            signature: zaugd,
            queue: this.renderQueue
        });
        return this.renderQueue;
    }
    getAttributeType(zauga) {
        var zaugb = zauga.array;
        if (zaugb instanceof Uint8Array || zaugb instanceof Uint8ClampedArray) return this.gl.UNSIGNED_BYTE;
        if (zaugb instanceof Int8Array) return this.gl.BYTE;
        if (zaugb instanceof Uint16Array) return this.gl.UNSIGNED_SHORT;
        if (zaugb instanceof Int16Array) return this.gl.SHORT;
        if (zaugb instanceof Uint32Array) return this.gl.UNSIGNED_INT;
        if (zaugb instanceof Int32Array) return this.gl.INT;
        return this.gl.FLOAT;
    }
    getBasicProgram(zauga) {
        var zaugb = this.gl, zaugc = zauga ? "__faoxomBasicInstanced" : "__faoxomBasic";
        if (this.programCache[zaugc]) return this.programCache[zaugc];
        var zaugd = zauga ? "attribute vec3 position; attribute vec4 instanceMatrix0; attribute vec4 instanceMatrix1; attribute vec4 instanceMatrix2; attribute vec4 instanceMatrix3; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; void main(){ mat4 model=mat4(instanceMatrix0,instanceMatrix1,instanceMatrix2,instanceMatrix3); gl_Position=projectionMatrix*viewMatrix*model*vec4(position,1.0); }" : "attribute vec3 position; uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; void main(){ gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }";
        var zauge = "precision mediump float; uniform vec3 color; uniform float opacity; void main(){ gl_FragColor=vec4(color,opacity); }";
        var zaugf = this.compileShader(zaugb.VERTEX_SHADER, zaugd), zaugg = this.compileShader(zaugb.FRAGMENT_SHADER, zauge);
        if (!zaugf || !zaugg) return null;
        var zaugh = zaugb.createProgram();
        zaugb.attachShader(zaugh, zaugf);
        zaugb.attachShader(zaugh, zaugg);
        zaugb.bindAttribLocation(zaugh, 0, "position");
        if (zauga) for (var zaugi = 0; zaugi < 4; zaugi++) zaugb.bindAttribLocation(zaugh, 6 + zaugi, "instanceMatrix" + zaugi);
        zaugb.linkProgram(zaugh);
        if (!zaugb.getProgramParameter(zaugh, zaugb.LINK_STATUS)) return null;
        zaugh.uniforms = {
            modelMatrix: zaugb.getUniformLocation(zaugh, "modelMatrix"),
            viewMatrix: zaugb.getUniformLocation(zaugh, "viewMatrix"),
            projectionMatrix: zaugb.getUniformLocation(zaugh, "projectionMatrix"),
            color: zaugb.getUniformLocation(zaugh, "color"),
            opacity: zaugb.getUniformLocation(zaugh, "opacity")
        };
        this.programCache[zaugc] = zaugh;
        return zaugh;
    }
    drawBasicMesh(zauga, zaugb) {
        var zaugc = this.gl, zaugd = zauga.material, zauge = zauga.geometry, zaugf = zauge.attributes || {}, zaugg = zaugf.position, zaugh = zauga instanceof InstancedMesh && zauga.count > 0, zaugi = zaugh ? this.getInstanceExtension() : null, zaugj = this.getBasicProgram(!!(zaugh && zaugi));
        if (!zaugj || !zaugg) return;
        var zaugk = this._basicState || (this._basicState = {});
        if (zaugk.program !== zaugj || this.currentProgram !== zaugj) {
            zaugc.useProgram(zaugj);
            this.currentProgram = zaugj;
            zaugk.program = zaugj;
            zaugk.geometry = null;
            zaugk.camera = null;
        }
        if (zaugk.camera !== zaugb) {
            zaugc.uniformMatrix4fv(zaugj.uniforms.viewMatrix, false, zaugb.matrixWorldInverse.elements);
            zaugc.uniformMatrix4fv(zaugj.uniforms.projectionMatrix, false, zaugb.projectionMatrix.elements);
            zaugk.camera = zaugb;
        }
        if (zaugk.geometry !== zauge) {
            zaugc.bindBuffer(zaugc.ARRAY_BUFFER, this.getBuffer(zauge, "position", zaugg));
            zaugc.enableVertexAttribArray(0);
            zaugc.vertexAttribPointer(0, zaugg.itemSize, this.getAttributeType(zaugg), !!zaugg.normalized, 0, 0);
            zaugk.geometry = zauge;
        }
        if (zaugh && zaugi) {
            var zaugl = this.instanceBufferCache ? this.instanceBufferCache.get(zauga) : null;
            if (!zaugl) {
                zaugl = {};
                if (this.instanceBufferCache) this.instanceBufferCache.set(zauga, zaugl);
            }
            var zaugm = zaugl.instanceBuffer || zaugc.createBuffer();
            if (!zaugl.instanceBuffer || zauga.instanceNeedsUpdate) {
                zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugm);
                zaugc.bufferData(zaugc.ARRAY_BUFFER, zauga.instanceMatrices, zaugc.DYNAMIC_DRAW || zaugc.STATIC_DRAW);
                zaugl.instanceBuffer = zaugm;
                zauga.instanceNeedsUpdate = false;
            }
            if (zaugk.instanceMesh !== zauga) {
                zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugm);
                for (var zaugn = 0; zaugn < 4; zaugn++) {
                    var zaugo = 6 + zaugn;
                    zaugc.enableVertexAttribArray(zaugo);
                    zaugc.vertexAttribPointer(zaugo, 4, zaugc.FLOAT, false, 64, zaugn * 16);
                    this.setInstanceDivisor(zaugo, 1);
                }
                zaugk.instanceMesh = zauga;
                zaugk.instanceEnabled = true;
            }
        } else if (zaugk.instanceEnabled) {
            for (var zaugp = 0; zaugp < 4; zaugp++) {
                zaugc.disableVertexAttribArray(6 + zaugp);
                this.setInstanceDivisor(6 + zaugp, 0);
            }
            zaugk.instanceEnabled = false;
            zaugk.instanceMesh = null;
        }
        if (zaugd.depthTest !== false && !zaugk.depthTest) {
            zaugc.enable(zaugc.DEPTH_TEST);
            zaugk.depthTest = true;
        } else if (zaugd.depthTest === false && zaugk.depthTest !== false) {
            zaugc.disable(zaugc.DEPTH_TEST);
            zaugk.depthTest = false;
        }
        var zaugq = zaugd.depthWrite !== false && !zaugd.transparent;
        if (zaugk.depthWrite !== zaugq) {
            zaugc.depthMask(zaugq);
            zaugk.depthWrite = zaugq;
        }
        var zaugr = !!(zaugd.transparent || zaugd.blending === AdditiveBlending || zaugd.blending === NormalBlending || zaugd.blending === SubtractiveBlending || zaugd.blending === MultiplyBlending || zaugd.blendEquation && zaugd.blendEquation !== "add");
        if (zaugk.blending !== zaugr) {
            if (zaugr) zaugc.enable(zaugc.BLEND); else zaugc.disable(zaugc.BLEND);
            zaugk.blending = zaugr;
        }
        if (zaugr && zaugk.blendMode !== zaugd.blending) {
            if (zaugd.blending === AdditiveBlending) zaugc.blendFunc(zaugc.ONE, zaugc.ONE); else if (zaugd.blending === SubtractiveBlending) zaugc.blendFunc(zaugc.ZERO, zaugc.ONE_MINUS_SRC_COLOR); else if (zaugd.blending === MultiplyBlending) zaugc.blendFunc(zaugc.DST_COLOR, zaugc.ZERO); else zaugc.blendFunc(zaugc.SRC_ALPHA, zaugc.ONE_MINUS_SRC_ALPHA);
            zaugk.blendMode = zaugd.blending;
        }
        var zaugs = zaugd.blendEquation && zaugd.blendEquation !== "add" ? zaugd.blendEquation : null;
        if (zaugk.blendEquation !== zaugs) {
            if (zaugs === "min" || zaugs === "max") zaugc.blendFunc(zaugc.ONE, zaugc.ONE);
            if (zaugs) {
                var zaugt = null;
                if (zaugs === "subtract") zaugt = zaugc.FUNC_SUBTRACT; else if (zaugs === "reverseSubtract") zaugt = zaugc.FUNC_REVERSE_SUBTRACT; else if (zaugs === "min") {
                    var zaugu = this.getBlendMinMaxExtension();
                    zaugt = zaugc.MIN !== undefined ? zaugc.MIN : zaugu ? zaugu.MIN_EXT : null;
                } else if (zaugs === "max") {
                    var zaugv = this.getBlendMinMaxExtension();
                    zaugt = zaugc.MAX !== undefined ? zaugc.MAX : zaugv ? zaugv.MAX_EXT : null;
                }
                if (zaugt !== null && zaugt !== undefined) zaugc.blendEquation(zaugt);
            } else if (zaugc.blendEquation) zaugc.blendEquation(zaugc.FUNC_ADD);
            zaugk.blendEquation = zaugs;
        }
        var zaugw = zaugd.side === DoubleSide || zaugd.side === "double" ? 0 : zaugd.side === BackSide || zaugd.side === "back" ? 1 : 2;
        if (zaugk.side !== zaugw) {
            if (!zaugw) zaugc.disable(zaugc.CULL_FACE); else {
                zaugc.enable(zaugc.CULL_FACE);
                zaugc.cullFace(zaugw === 1 ? zaugc.FRONT : zaugc.BACK);
            }
            zaugk.side = zaugw;
        }
        if (zaugk.color !== zaugd.color || zaugk.opacity !== zaugd.opacity) {
            zaugc.uniform3f(zaugj.uniforms.color, zaugd.color.r, zaugd.color.g, zaugd.color.b);
            zaugc.uniform1f(zaugj.uniforms.opacity, zaugd.opacity);
            zaugk.color = zaugd.color;
            zaugk.opacity = zaugd.opacity;
        }
        if (!zaugh && zaugj.uniforms.modelMatrix) zaugc.uniformMatrix4fv(zaugj.uniforms.modelMatrix, false, zauga.matrixWorld.elements);
        var zaugx = zauge.index, zaugy = zauge.drawRange || {
            start: 0,
            count: Infinity
        }, zaugz = zaugc.TRIANGLES;
        if (zaugx) {
            var zaugaa = Math.min(zaugx.length - zaugy.start, zaugy.count);
            if (zaugk.indexArray !== zaugx) {
                zaugc.bindBuffer(zaugc.ELEMENT_ARRAY_BUFFER, this.getIndexBuffer(zauge, zaugx));
                zaugk.indexArray = zaugx;
            }
            if (zaugh && zaugi) {
                if (zaugi.drawElementsInstanced) zaugi.drawElementsInstanced(zaugz, zaugx.length, zaugx instanceof Uint32Array ? zaugc.UNSIGNED_INT : zaugc.UNSIGNED_SHORT, 0, zauga.count); else zaugi.drawElementsInstancedANGLE(zaugz, zaugx.length, zaugx instanceof Uint32Array ? zaugc.UNSIGNED_INT : zaugc.UNSIGNED_SHORT, 0, zauga.count);
            } else zaugc.drawElements(zaugz, zaugaa, zaugx instanceof Uint32Array ? zaugc.UNSIGNED_INT : zaugc.UNSIGNED_SHORT, zaugy.start * (zaugx instanceof Uint32Array ? 4 : 2));
            this.info.render.triangles += Math.floor(zaugaa / 3) * (zaugh && zaugi ? zauga.count : 1);
        } else {
            var zaugab = Math.min(zaugg.array.length / zaugg.itemSize - zaugy.start, zaugy.count);
            if (zaugh && zaugi) {
                if (zaugi.drawArraysInstanced) zaugi.drawArraysInstanced(zaugz, 0, zaugg.array.length / zaugg.itemSize, zauga.count); else zaugi.drawArraysInstancedANGLE(zaugz, 0, zaugg.array.length / zaugg.itemSize, zauga.count);
            } else zaugc.drawArrays(zaugz, zaugy.start, zaugab);
            this.info.render.triangles += Math.floor(zaugab / 3) * (zaugh && zaugi ? zauga.count : 1);
        }
        this.info.render.calls++;
    }
    draw(zauga, zaugb, zaugc, zaugd, zauge) {
        if (zauga.material instanceof BasicMaterial && !zauga.material.diffuseMap && !zauga.material.normalMap && !zauga.material.vertexColors && !zauga.material.wireframe && !zauga.material.alphaTest && !zauga.morphTargetInfluences.length && !zauga.skeleton && !(this.clippingPlanes && this.clippingPlanes.length) && !(zauga.material.clippingPlanes && zauga.material.clippingPlanes.length) && !this.logarithmicDepthBuffer) {
            this.drawBasicMesh(zauga, zaugb);
            return;
        }
        if (zauga.material instanceof ShaderMaterial) {
            this.drawShaderMesh(zauga, zaugb);
            return;
        }
        var zaugf = this.gl;
        var zaugg = zauga.material;
        var zaugh = zauga.geometry;
        if (zauga.morphTargetInfluences && zauga.morphTargetInfluences.length) zauga.applyMorphTargets();
        if (zaugg.normalMap && !zaugh.attributes.tangent && zaugh.attributes.uv && zaugh.attributes.normal) zaugh.computeTangents();
        var zaugi = this.getProgram(zaugg, zauga);
        if (!zaugi) return;
        var zaugj = zaugi.uniforms;
        zaugf.useProgram(zaugi);
        this.currentProgram = zaugi;
        this._basicState = null;
        if (zaugj.diffuseMap) zaugf.uniform1i(zaugj.diffuseMap, 0);
        if (zaugj.normalMap) zaugf.uniform1i(zaugj.normalMap, 1);
        if (zaugj.roughnessMap) zaugf.uniform1i(zaugj.roughnessMap, 2);
        if (zaugj.metalnessMap) zaugf.uniform1i(zaugj.metalnessMap, 3);
        if (zaugj.aoMap) zaugf.uniform1i(zaugj.aoMap, 4);
        if (zaugj.emissiveMap) zaugf.uniform1i(zaugj.emissiveMap, 5);
        if (zaugj.alphaMap) zaugf.uniform1i(zaugj.alphaMap, 6);
        if (zaugj.envMap) zaugf.uniform1i(zaugj.envMap, 7);
        if (zaugj.shadowMap0) zaugf.uniform1i(zaugj.shadowMap0, 8);
        if (zaugj.shadowMap1) zaugf.uniform1i(zaugj.shadowMap1, 9);
        if (zaugj.shadowMap2) zaugf.uniform1i(zaugj.shadowMap2, 10);
        if (zaugj.shadowMap3) zaugf.uniform1i(zaugj.shadowMap3, 11);
        if (zaugj.pointShadowMap) zaugf.uniform1i(zaugj.pointShadowMap, 12);
        if (zaugg.depthTest) zaugf.enable(zaugf.DEPTH_TEST); else zaugf.disable(zaugf.DEPTH_TEST);
        zaugf.depthMask(zaugg.depthWrite !== false && !zaugg.transparent);
        var zaugk = zaugg.blendEquation && zaugg.blendEquation !== "add" ? zaugg.blendEquation : null;
        if (zaugg.transparent || zaugg.blending === AdditiveBlending || zaugg.blending === NormalBlending || zaugg.blending === SubtractiveBlending || zaugg.blending === MultiplyBlending || zaugk) {
            zaugf.enable(zaugf.BLEND);
            if (zaugk === "min" || zaugk === "max") zaugf.blendFunc(zaugf.ONE, zaugf.ONE); else if (zaugg.blending === AdditiveBlending) zaugf.blendFunc(zaugf.ONE, zaugf.ONE); else if (zaugg.blending === SubtractiveBlending) zaugf.blendFunc(zaugf.ZERO, zaugf.ONE_MINUS_SRC_COLOR); else if (zaugg.blending === MultiplyBlending) zaugf.blendFunc(zaugf.DST_COLOR, zaugf.ZERO); else zaugf.blendFunc(zaugf.SRC_ALPHA, zaugf.ONE_MINUS_SRC_ALPHA);
            if (zaugk) {
                var zaugl = null;
                if (zaugk === "subtract") zaugl = zaugf.FUNC_SUBTRACT; else if (zaugk === "reverseSubtract") zaugl = zaugf.FUNC_REVERSE_SUBTRACT; else if (zaugk === "min") {
                    var zaugm = this.getBlendMinMaxExtension();
                    zaugl = zaugf.MIN !== undefined ? zaugf.MIN : zaugm ? zaugm.MIN_EXT : null;
                } else if (zaugk === "max") {
                    var zaugn = this.getBlendMinMaxExtension();
                    zaugl = zaugf.MAX !== undefined ? zaugf.MAX : zaugn ? zaugn.MAX_EXT : null;
                }
                if (zaugl !== null && zaugl !== undefined) zaugf.blendEquation(zaugl);
            } else if (zaugf.blendEquation) zaugf.blendEquation(zaugf.FUNC_ADD);
        } else zaugf.disable(zaugf.BLEND);
        if (zaugg.side === DoubleSide || zaugg.side === "double") zaugf.disable(zaugf.CULL_FACE); else {
            zaugf.enable(zaugf.CULL_FACE);
            zaugf.cullFace(zaugg.side === BackSide || zaugg.side === "back" ? zaugf.FRONT : zaugf.BACK);
        }
        var zaugo = zaugh.attributes;
        var zaugp = zaugo.position;
        var zaugq = zaugo.normal;
        var zaugr = zaugo.uv;
        var zaugs = zaugo.color || zaugo.colors;
        var zaugt = zaugo.skinIndex;
        var zaugu = zaugo.skinWeight;
        var zaugv = zaugo.tangent;
        var zaugw = function(zauga, zaugb, zaugc) {
            if (!zaugc) {
                zaugf.disableVertexAttribArray(zauga);
                return;
            }
            zaugf.bindBuffer(zaugf.ARRAY_BUFFER, this.getBuffer(zaugh, zaugb, zaugc));
            zaugf.enableVertexAttribArray(zauga);
            zaugf.vertexAttribPointer(zauga, zaugc.itemSize, this.getAttributeType(zaugc), !!zaugc.normalized, 0, 0);
        }.bind(this);
        zaugw(0, "position", zaugp);
        zaugw(1, "normal", zaugq);
        zaugw(2, "uv", zaugr);
        if (zaugs && zaugg.vertexColors) zaugw(3, "color", zaugs); else {
            zaugf.disableVertexAttribArray(3);
            if (zaugf.vertexAttrib3f) zaugf.vertexAttrib3f(3, 1, 1, 1);
        }
        zaugw(4, "skinIndex", zaugt);
        zaugw(5, "skinWeight", zaugu);
        zaugw(10, "tangent", zaugv);
        zaugw(11, "uv1", zaugo.uv1);
        if (!zaugq) {
            zaugf.vertexAttrib3f(1, 0, 1, 0);
        }
        if (!zaugv && zaugf.vertexAttrib4f) {
            zaugf.vertexAttrib4f(10, 1, 0, 0, 1);
        }
        var zaugx = zauga instanceof InstancedMesh && zauga.count > 0;
        var zaugy = zaugx ? this.getInstanceExtension() : null;
        if (zaugx && zaugy) {
            var zaugz = this.instanceBufferCache ? this.instanceBufferCache.get(zauga) : null;
            if (!zaugz) {
                zaugz = {};
                if (this.instanceBufferCache) this.instanceBufferCache.set(zauga, zaugz);
            }
            var zaugaa = zaugz.instanceBuffer || zaugf.createBuffer();
            if (!zaugz.instanceBuffer || zauga.instanceNeedsUpdate) {
                zaugf.bindBuffer(zaugf.ARRAY_BUFFER, zaugaa);
                zaugf.bufferData(zaugf.ARRAY_BUFFER, zauga.instanceMatrices, zaugf.DYNAMIC_DRAW || zaugf.STATIC_DRAW);
                zaugz.instanceBuffer = zaugaa;
                zauga.instanceNeedsUpdate = false;
            }
            zaugf.bindBuffer(zaugf.ARRAY_BUFFER, zaugaa);
            for (var zaugab = 0; zaugab < 4; zaugab++) {
                var zaugac = 6 + zaugab;
                zaugf.enableVertexAttribArray(zaugac);
                zaugf.vertexAttribPointer(zaugac, 4, zaugf.FLOAT, false, 64, zaugab * 16);
                this.setInstanceDivisor(zaugac, 1);
            }
        } else {
            for (var zaugad = 0; zaugad < 4; zaugad++) {
                zaugf.disableVertexAttribArray(6 + zaugad);
                this.setInstanceDivisor(6 + zaugad, 0);
            }
        }
        var zaugae = zauga.matrixWorld.clone().invert().transpose().elements;
        var zaugaf = new Float32Array([ zaugae[0], zaugae[1], zaugae[2], zaugae[4], zaugae[5], zaugae[6], zaugae[8], zaugae[9], zaugae[10] ]);
        if (zaugj.viewMatrix) zaugf.uniformMatrix4fv(zaugj.viewMatrix, false, zaugb.matrixWorldInverse.elements);
        if (zaugj.projectionMatrix) zaugf.uniformMatrix4fv(zaugj.projectionMatrix, false, zaugb.projectionMatrix.elements);
        if (zaugj.uLogDepthFC) zaugf.uniform1f(zaugj.uLogDepthFC, this.logarithmicDepthBuffer ? 2 / (Math.log(zaugb.far + 1) / Math.LN2) : 0);
        if (zaugj.uClipPlaneCount) {
            var zaugag = (this.clippingPlanes || []).concat(zauga.material && zauga.material.clippingPlanes || []);
            var zaugah = Math.min(8, zaugag.length);
            zaugf.uniform1i(zaugj.uClipPlaneCount, zaugah);
            for (var zaugai = 0; zaugai < zaugah; zaugai++) {
                var zaugaj = zaugag[zaugai];
                var zaugak = zaugj["uClipPlanes[" + zaugai + "]"];
                if (zaugak && zaugaj && zaugaj.normal) zaugf.uniform4f(zaugak, zaugaj.normal.x, zaugaj.normal.y, zaugaj.normal.z, zaugaj.constant || 0);
            }
        }
        if (zaugj.normalMatrix && zaugf.uniformMatrix3fv) zaugf.uniformMatrix3fv(zaugj.normalMatrix, false, zaugaf);
        if (zaugj.viewMatrix) zaugf.uniformMatrix4fv(zaugj.viewMatrix, false, zaugb.matrixWorldInverse.elements);
        if (zaugj.projectionMatrix) zaugf.uniformMatrix4fv(zaugj.projectionMatrix, false, zaugb.projectionMatrix.elements);
        if (zaugj.uLogDepthFC) zaugf.uniform1f(zaugj.uLogDepthFC, this.logarithmicDepthBuffer ? 2 / (Math.log(zaugb.far + 1) / Math.LN2) : 0);
        if (zaugj.uClipPlaneCount) {
            var zaugag = (this.clippingPlanes || []).concat(zauga.material && zauga.material.clippingPlanes || []);
            var zaugah = Math.min(8, zaugag.length);
            zaugf.uniform1i(zaugj.uClipPlaneCount, zaugah);
            for (var zaugai = 0; zaugai < zaugah; zaugai++) {
                var zaugaj = zaugag[zaugai];
                var zaugak = zaugj["uClipPlanes[" + zaugai + "]"];
                if (zaugak && zaugaj && zaugaj.normal) zaugf.uniform4f(zaugak, zaugaj.normal.x, zaugaj.normal.y, zaugaj.normal.z, zaugaj.constant || 0);
            }
        }
        if (zaugj.normalMatrix && zaugf.uniformMatrix3fv) zaugf.uniformMatrix3fv(zaugj.normalMatrix, false, zaugaf);
        if (zaugj.useSkinning) zaugf.uniform1i(zaugj.useSkinning, zauga.skeleton ? 1 : 0);
        if (zauga.skeleton) {
            zauga.skeleton.update();
            if (zaugj["boneMatrices[0]"]) zaugf.uniformMatrix4fv(zaugj["boneMatrices[0]"], false, zauga.skeleton.boneMatrices);
        }
        if (zaugj.useInstancing) zaugf.uniform1i(zaugj.useInstancing, zaugx && zaugy ? 1 : 0);
        if (zaugj.color) zaugf.uniform3f(zaugj.color, zaugg.color.r, zaugg.color.g, zaugg.color.b);
        if (zaugj.emissive) zaugf.uniform3f(zaugj.emissive, zaugg.emissive.r, zaugg.emissive.g, zaugg.emissive.b);
        if (zaugj.opacity) zaugf.uniform1f(zaugj.opacity, zaugg.opacity);
        if (zaugj.alphaTest) zaugf.uniform1i(zaugj.alphaTest, zaugg.alphaTest > 0 ? 1 : 0);
        if (zaugj.alphaCutoff) zaugf.uniform1f(zaugj.alphaCutoff, zaugg.alphaTest || .5);
        if (zaugj.metallic) zaugf.uniform1f(zaugj.metallic, zaugg.metalness || 0);
        if (zaugj.roughness) zaugf.uniform1f(zaugj.roughness, zaugg.roughness === undefined ? .5 : zaugg.roughness);
        if (zaugj.envMapIntensity) zaugf.uniform1f(zaugj.envMapIntensity, zaugg.envMapIntensity === undefined ? 1 : zaugg.envMapIntensity);
        if (zaugj.aoMapIntensity) zaugf.uniform1f(zaugj.aoMapIntensity, zaugg.aoMapIntensity === undefined ? 1 : zaugg.aoMapIntensity);
        if (zaugj.normalScale) zaugf.uniform2f(zaugj.normalScale, zaugg.normalScale ? zaugg.normalScale.x : 1, zaugg.normalScale ? zaugg.normalScale.y : 1);
        if (zaugj.clearcoat) zaugf.uniform1f(zaugj.clearcoat, zaugg.clearcoat || 0);
        if (zaugj.clearcoatRoughness) zaugf.uniform1f(zaugj.clearcoatRoughness, zaugg.clearcoatRoughness === undefined ? .03 : zaugg.clearcoatRoughness);
        if (zaugj.sheen) zaugf.uniform1f(zaugj.sheen, zaugg.sheen || 0);
        if (zaugj.sheenRoughness) zaugf.uniform1f(zaugj.sheenRoughness, zaugg.sheenRoughness === undefined ? .5 : zaugg.sheenRoughness);
        if (zaugj.sheenColor) {
            var zaugal = zaugg.sheenColor || [ 0, 0, 0 ];
            zaugf.uniform3f(zaugj.sheenColor, zaugal.r === undefined ? zaugal[0] || 0 : zaugal.r, zaugal.g === undefined ? zaugal[1] || 0 : zaugal.g, zaugal.b === undefined ? zaugal[2] || 0 : zaugal.b);
        }
        if (zaugj.transmission) zaugf.uniform1f(zaugj.transmission, zaugg.transmission || 0);
        if (zaugj.ior) zaugf.uniform1f(zaugj.ior, zaugg.ior || 1.5);
        if (zaugj.iridescence) zaugf.uniform1f(zaugj.iridescence, zaugg.iridescence || 0);
        if (zaugj.iridescenceIor) zaugf.uniform1f(zaugj.iridescenceIor, zaugg.iridescenceIor || 1.3);
        if (zaugj.iridescenceThickness) zaugf.uniform1f(zaugj.iridescenceThickness, zaugg.iridescenceThicknessRange && zaugg.iridescenceThicknessRange.length ? zaugg.iridescenceThicknessRange[1] : 400);
        if (zaugj.anisotropy) zaugf.uniform1f(zaugj.anisotropy, zaugg.anisotropy || 0);
        if (zaugj.anisotropyRotation) zaugf.uniform1f(zaugj.anisotropyRotation, zaugg.anisotropyRotation || 0);
        if (zaugj.specularIntensity) zaugf.uniform1f(zaugj.specularIntensity, zaugg.specularIntensity === undefined ? 1 : zaugg.specularIntensity);
        if (zaugj.specularColor) {
            var zaugam = zaugg.specularColor || new Color(16777215);
            zaugf.uniform3f(zaugj.specularColor, zaugam.r, zaugam.g, zaugam.b);
        }
        if (zaugj.thickness) zaugf.uniform1f(zaugj.thickness, zaugg.thickness || 0);
        if (zaugj.attenuationDistance) zaugf.uniform1f(zaugj.attenuationDistance, zaugg.attenuationDistance === undefined ? 1e20 : zaugg.attenuationDistance);
        if (zaugj.attenuationColor) {
            var zaugan = zaugg.attenuationColor || new Color(16777215);
            zaugf.uniform3f(zaugj.attenuationColor, zaugan.r, zaugan.g, zaugan.b);
        }
        if (zaugj.dispersion) zaugf.uniform1f(zaugj.dispersion, zaugg.dispersion || 0);
        if (zaugj.subsurface) zaugf.uniform1f(zaugj.subsurface, zaugg.subsurface || 0);
        if (zaugj.subsurfaceColor) {
            var zaugao = zaugg.subsurfaceColor || new Color(16777215);
            zaugf.uniform3f(zaugj.subsurfaceColor, zaugao.r, zaugao.g, zaugao.b);
        }
        if (zaugj.subsurfaceRadius) zaugf.uniform1f(zaugj.subsurfaceRadius, zaugg.subsurfaceRadius || 1);
        if (zaugj.parallaxScale) zaugf.uniform1f(zaugj.parallaxScale, zaugg.parallaxScale || .05);
        if (zaugj.parallaxMinLayers) zaugf.uniform1f(zaugj.parallaxMinLayers, zaugg.parallaxMinLayers || 8);
        if (zaugj.parallaxMaxLayers) zaugf.uniform1f(zaugj.parallaxMaxLayers, zaugg.parallaxMaxLayers || 32);
        if (zaugj.diffuseMapTransform) {
            var zaugap = zaugg.diffuseMap;
            if (zaugap && zaugap.matrix) {
                if (zaugap.matrixAutoUpdate) zaugap.updateMatrix();
                zaugf.uniformMatrix3fv(zaugj.diffuseMapTransform, false, zaugap.matrix.elements);
            } else zaugf.uniformMatrix3fv(zaugj.diffuseMapTransform, false, (new Matrix3).elements);
        }
        if (zaugj.diffuseUvChannel) zaugf.uniform1i(zaugj.diffuseUvChannel, zaugg.diffuseMap && zaugg.diffuseMap.channel ? 1 : 0);
        if (zaugj.exposure) zaugf.uniform1f(zaugj.exposure, this.exposure);
        if (zaugj.gammaValue) zaugf.uniform1f(zaugj.gammaValue, this.gamma);
        if (zaugj.toneMapping) zaugf.uniform1i(zaugj.toneMapping, this.toneMapping);
        if (zaugj.useVertexColor) zaugf.uniform1i(zaugj.useVertexColor, zaugg.vertexColors && zaugs ? 1 : 0);
        if (zaugj.cameraPosition) zaugf.uniform3f(zaugj.cameraPosition, zaugb.position.x, zaugb.position.y, zaugb.position.z);
        if (zaugj.pointSize) zaugf.uniform1f(zaugj.pointSize, zaugg.size || zaugg.pointSize || 1);
        if (zauga instanceof Line && zaugf.lineWidth) zaugf.lineWidth(zaugg.linewidth || zaugg.width || 1);
        var zaugaq = function(zauga, zaugb) {
            if (!zauga) return false;
            if (zaugf.activeTexture) zaugf.activeTexture(zaugf.TEXTURE0 + zaugb);
            zaugf.bindTexture(zaugf.TEXTURE_2D, this.getTexture(zauga));
            return true;
        }.bind(this);
        var zaugar = zaugg.diffuseMap || null;
        var zaugas = zaugg.normalMap || null;
        var zaugat = zaugg.roughnessMap || null;
        var zaugau = zaugg.metalnessMap || zaugg.metallicMap || null;
        var zaugav = zaugg.aoMap || null;
        var zaugaw = zaugg.emissiveMap || null;
        if (zaugj.unlit) zaugf.uniform1i(zaugj.unlit, zaugg instanceof BasicMaterial && !(zaugg instanceof LineMaterial) || zaugg instanceof PointsMaterial || zaugg instanceof LineBasicMaterial ? 1 : 0);
        if (zaugj.useDiffuseMap) zaugf.uniform1i(zaugj.useDiffuseMap, zaugar ? 1 : 0);
        if (zaugj.useNormalMap) zaugf.uniform1i(zaugj.useNormalMap, zaugas && zaugv ? 1 : 0);
        if (zaugj.useRoughnessMap) zaugf.uniform1i(zaugj.useRoughnessMap, zaugat ? 1 : 0);
        if (zaugj.useMetalnessMap) zaugf.uniform1i(zaugj.useMetalnessMap, zaugau ? 1 : 0);
        if (zaugj.useAoMap) zaugf.uniform1i(zaugj.useAoMap, zaugav ? 1 : 0);
        if (zaugj.useEmissiveMap) zaugf.uniform1i(zaugj.useEmissiveMap, zaugaw ? 1 : 0);
        if (zaugj.useAlphaMap) zaugf.uniform1i(zaugj.useAlphaMap, zaugg.alphaMap ? 1 : 0);
        if (zaugar) {
            zaugaq(zaugar, 0);
            if (zaugj.diffuseMap) zaugf.uniform1i(zaugj.diffuseMap, 0);
        }
        if (zaugas && zaugv) {
            zaugaq(zaugas, 1);
            if (zaugj.normalMap) zaugf.uniform1i(zaugj.normalMap, 1);
        }
        if (zaugat) {
            zaugaq(zaugat, 2);
            if (zaugj.roughnessMap) zaugf.uniform1i(zaugj.roughnessMap, 2);
        }
        if (zaugau) {
            zaugaq(zaugau, 3);
            if (zaugj.metalnessMap) zaugf.uniform1i(zaugj.metalnessMap, 3);
        }
        if (zaugav) {
            zaugaq(zaugav, 4);
            if (zaugj.aoMap) zaugf.uniform1i(zaugj.aoMap, 4);
        }
        if (zaugaw) {
            zaugaq(zaugaw, 5);
            if (zaugj.emissiveMap) zaugf.uniform1i(zaugj.emissiveMap, 5);
        }
        var zaugax = zaugg.alphaMap || null;
        if (zaugax) {
            zaugaq(zaugax, 6);
            if (zaugj.alphaMap) zaugf.uniform1i(zaugj.alphaMap, 6);
        }
        var zaugay = zaugg.envMap || zauge || null;
        if (zaugj.useEnvMap) zaugf.uniform1i(zaugj.useEnvMap, zaugay && zaugay.images ? 1 : 0);
        if (zaugay && zaugay.images) {
            if (zaugf.activeTexture) zaugf.activeTexture(zaugf.TEXTURE0 + 7);
            zaugf.bindTexture(zaugf.TEXTURE_CUBE_MAP, this.getCubeTexture(zaugay));
            if (zaugj.envMap) zaugf.uniform1i(zaugj.envMap, 7);
        }
        var zaugaz = null;
        for (var zaugba = 0; zaugba < zaugc.length; zaugba++) if (zaugc[zaugba].shadow && (zaugc[zaugba].shadow.map || zaugc[zaugba].shadow.maps && zaugc[zaugba].shadow.maps.length || zaugc[zaugba].shadow.cubeMap)) {
            zaugaz = zaugc[zaugba];
            break;
        }
        if (zaugj.useShadow) zaugf.uniform1i(zaugj.useShadow, zaugaz ? 1 : 0);
        if (zaugj.contactShadowEnabled) zaugf.uniform1i(zaugj.contactShadowEnabled, zaugaz && zaugaz.shadow && zaugaz.shadow.contactShadows ? 1 : 0);
        if (zaugj.contactShadowDistance) zaugf.uniform1f(zaugj.contactShadowDistance, zaugaz && zaugaz.shadow ? zaugaz.shadow.contactShadowDistance || 10 : 10);
        if (zaugj.contactShadowStrength) zaugf.uniform1f(zaugj.contactShadowStrength, zaugaz && zaugaz.shadow ? zaugaz.shadow.contactShadowStrength || .5 : .5);
        if (zaugaz) {
            var zaugbb = zaugaz.type === "PointLight" ? 3 : zaugaz.type === "SpotLight" ? 2 : 1;
            if (zaugj.shadowMode) zaugf.uniform1i(zaugj.shadowMode, zaugbb);
            if (zaugj.shadowBias) zaugf.uniform1f(zaugj.shadowBias, zaugaz.shadow.bias || .001);
            var zaugbc = (new Vector3).setFromMatrixPosition(zaugaz.matrixWorld);
            if (zaugj.shadowLightPosition) zaugf.uniform3f(zaugj.shadowLightPosition, zaugbc.x, zaugbc.y, zaugbc.z);
            if (zaugj.shadowFar) zaugf.uniform1f(zaugj.shadowFar, zaugaz.shadow.camera ? zaugaz.shadow.camera.far : 100);
            if (zaugbb === 3 && zaugaz.shadow.cubeMap) {
                if (zaugf.activeTexture) zaugf.activeTexture(zaugf.TEXTURE0 + 12);
                zaugf.bindTexture(zaugf.TEXTURE_CUBE_MAP, this.getCubeTextureHandle(zaugaz.shadow.cubeMap));
                if (zaugj.pointShadowMap) zaugf.uniform1i(zaugj.pointShadowMap, 12);
                if (zaugj.shadowCascadeCount) zaugf.uniform1i(zaugj.shadowCascadeCount, 1);
            } else {
                var zaugbd = zaugaz.shadow.maps && zaugaz.shadow.maps.length ? zaugaz.shadow.maps : [ zaugaz.shadow.map ];
                var zaugbe = zaugaz.shadow.matrices && zaugaz.shadow.matrices.length ? zaugaz.shadow.matrices : [ zaugaz.shadow.matrix ];
                var zaugbf = Math.min(4, zaugbd.length);
                if (zaugj.shadowCascadeCount) zaugf.uniform1i(zaugj.shadowCascadeCount, zaugbf);
                var zaugbg = zaugaz.shadow.splits || [];
                if (zaugj.shadowSplits) zaugf.uniform4f(zaugj.shadowSplits, zaugbg[0] || 0, zaugbg[1] || 0, zaugbg[2] || 0, zaugbg[3] || 0);
                for (var zaugbh = 0; zaugbh < 4; zaugbh++) {
                    var zaugbi = zaugbd[zaugbh] || zaugbd[zaugbd.length - 1];
                    var zaugbj = zaugbe[zaugbh] || zaugbe[zaugbe.length - 1];
                    if (zaugbi) {
                        if (zaugf.activeTexture) zaugf.activeTexture(zaugf.TEXTURE0 + 8 + zaugbh);
                        zaugf.bindTexture(zaugf.TEXTURE_2D, zaugbi);
                        if (zaugj["shadowMap" + zaugbh]) zaugf.uniform1i(zaugj["shadowMap" + zaugbh], 8 + zaugbh);
                    }
                    if (zaugbj && zaugj["shadowMatrix" + zaugbh]) zaugf.uniformMatrix4fv(zaugj["shadowMatrix" + zaugbh], false, zaugbj.elements);
                }
            }
        }
        if (zaugj.fogEnabled) zaugf.uniform1i(zaugj.fogEnabled, zaugd ? 1 : 0);
        if (zaugd) {
            if (zaugj.fogColor) zaugf.uniform3f(zaugj.fogColor, zaugd.color && zaugd.color.r !== undefined ? zaugd.color.r : .5, zaugd.color && zaugd.color.g !== undefined ? zaugd.color.g : .5, zaugd.color && zaugd.color.b !== undefined ? zaugd.color.b : .5);
            if (zaugj.fogNear) zaugf.uniform1f(zaugj.fogNear, faoxomvalue(zaugd.near, 1));
            if (zaugj.fogFar) zaugf.uniform1f(zaugj.fogFar, faoxomvalue(zaugd.far, 1e3));
        }
        var zaugbk = -1;
        for (var zaugbl = 0; zaugbl < zaugc.length; zaugbl++) {
            var zaugbm = zaugc[zaugbl];
            if (zaugbm && zaugbm.isAreaLight && zaugbk < 0 && zaugbm.emissiveMap && zaugbm.shape !== "tube") zaugbk = zaugbl;
        }
        if (zaugj.lightCount) zaugf.uniform1i(zaugj.lightCount, zaugc.length);
        for (var zaugbn = 0; zaugbn < zaugc.length; zaugbn++) {
            var zaugbo = zaugc[zaugbn];
            var zaugbp = (new Vector3).setFromMatrixPosition(zaugbo.matrixWorld);
            var zaugbq = zaugbo.target ? (new Vector3).setFromMatrixPosition(zaugbo.target.matrixWorld).sub(zaugbp).normalize() : new Vector3(0, -1, 0);
            var zaugbr = zaugbo.type === "AmbientLight" ? 0 : zaugbo.type === "DirectionalLight" ? 1 : zaugbo.type === "SpotLight" ? 3 : zaugbo.type === "HemisphereLight" ? 4 : zaugbo.type === "RectAreaLight" ? 5 : zaugbo.type === "TubeLight" ? 6 : 2;
            var zaugbs = zaugj["lightPosition[" + zaugbn + "]"];
            var zaugbt = zaugj["lightDirection[" + zaugbn + "]"];
            var zaugbu = zaugj["lightColor[" + zaugbn + "]"];
            var zaugbv = zaugj["lightGroundColor[" + zaugbn + "]"];
            var zaugbw = zaugj["lightIntensity[" + zaugbn + "]"];
            var zaugbx = zaugj["lightDistance[" + zaugbn + "]"];
            var zaugby = zaugj["lightCone[" + zaugbn + "]"];
            var zaugbz = zaugj["lightPenumbra[" + zaugbn + "]"];
            var zaugca = zaugj["lightType[" + zaugbn + "]"];
            if (zaugbs) zaugf.uniform3f(zaugbs, zaugbp.x, zaugbp.y, zaugbp.z);
            if (zaugbt) zaugf.uniform3f(zaugbt, zaugbq.x, zaugbq.y, zaugbq.z);
            if (zaugbu) zaugf.uniform3f(zaugbu, zaugbo.color.r, zaugbo.color.g, zaugbo.color.b);
            if (zaugbv) {
                var zaugcb = zaugbo.groundColor || new Color(4473924);
                zaugf.uniform3f(zaugbv, zaugcb.r, zaugcb.g, zaugcb.b);
            }
            if (zaugbw) zaugf.uniform1f(zaugbw, zaugbo.intensity);
            if (zaugbx) zaugf.uniform1f(zaugbx, zaugbo.distance || 0);
            if (zaugby) zaugf.uniform1f(zaugby, zaugbo.angle ? Math.cos(zaugbo.angle) : -1);
            if (zaugbz) zaugf.uniform1f(zaugbz, zaugbo.penumbra || 0);
            if (zaugca) zaugf.uniform1i(zaugca, zaugbr);
            var zaugcc = zaugj["lightArea[" + zaugbn + "]"], zaugcd = zaugj["lightRectRight[" + zaugbn + "]"];
            if (zaugcc || zaugcd) {
                if (zaugbr === 5 || zaugbr === 6) {
                    var zaugce = zaugbo.matrixWorld ? zaugbo.matrixWorld.elements : null;
                    var zaugcf = zaugce ? zaugce[0] : 1, zaugcg = zaugce ? zaugce[1] : 0, zaugch = zaugce ? zaugce[2] : 0;
                    var zaugci = zaugce ? zaugce[8] : 0, zaugcj = zaugce ? zaugce[9] : 0, zaugck = zaugce ? zaugce[10] : 1;
                    var zaugcl = Math.sqrt(zaugcf * zaugcf + zaugcg * zaugcg + zaugch * zaugch) || 1;
                    zaugcf /= zaugcl;
                    zaugcg /= zaugcl;
                    zaugch /= zaugcl;
                    var zaugcm = Math.sqrt(zaugci * zaugci + zaugcj * zaugcj + zaugck * zaugck) || 1;
                    zaugci /= zaugcm;
                    zaugcj /= zaugcm;
                    zaugck /= zaugcm;
                    if (zaugbt) zaugf.uniform3f(zaugbt, zaugbr === 6 ? zaugcf : zaugci, zaugbr === 6 ? zaugcg : zaugcj, zaugbr === 6 ? zaugch : zaugck);
                    if (zaugby) zaugf.uniform1f(zaugby, zaugbo.doubleSided ? 1 : 0);
                    if (zaugcc) zaugf.uniform4f(zaugcc, (zaugbo.width || 10) / 2, (zaugbo.height || 10) / 2, zaugbo.radius || 0, zaugbk === zaugbn ? 1 : 0);
                    if (zaugcd) zaugf.uniform3f(zaugcd, zaugcf, zaugcg, zaugch);
                } else {
                    if (zaugcc) zaugf.uniform4f(zaugcc, 0, 0, 0, 0);
                    if (zaugcd) zaugf.uniform3f(zaugcd, 0, 0, 0);
                }
            }
        }
        var zaugcn = zaugg.displacementMap || null;
        if (zaugj.useDisplacementMap) zaugf.uniform1i(zaugj.useDisplacementMap, zaugcn ? 1 : 0);
        if (zaugj.displacementScale) zaugf.uniform1f(zaugj.displacementScale, zaugg.displacementScale === undefined ? .1 : zaugg.displacementScale);
        if (zaugj.displacementBias) zaugf.uniform1f(zaugj.displacementBias, zaugg.displacementBias || 0);
        if (zaugcn) {
            zaugaq(zaugcn, 8);
            if (zaugj.displacementMap) zaugf.uniform1i(zaugj.displacementMap, 8);
        }
        var zaugco = zaugg.parallaxMap || null;
        if (zaugj.useParallaxMap) zaugf.uniform1i(zaugj.useParallaxMap, zaugco && zaugv ? 1 : 0);
        if (zaugco && zaugv) {
            zaugaq(zaugco, 9);
            if (zaugj.parallaxMap) zaugf.uniform1i(zaugj.parallaxMap, 9);
        }
        if (zaugj.ltcMatTexture || zaugj.ltcAmpTexture || zaugj.lightEmissiveTexture) {
            var zaugcp = LTCLookup.getTextures(this);
            if (zaugcp) {
                if (zaugj.ltcMatTexture && zaugcp.matTexture) {
                    zaugaq(zaugcp.matTexture, 13);
                    zaugf.uniform1i(zaugj.ltcMatTexture, 13);
                }
                if (zaugj.ltcAmpTexture && zaugcp.ampTexture) {
                    zaugaq(zaugcp.ampTexture, 14);
                    zaugf.uniform1i(zaugj.ltcAmpTexture, 14);
                }
                var zaugcq = zaugbk >= 0 && zaugc[zaugbk].emissiveMap ? zaugc[zaugbk].emissiveMap : zaugcp.whiteTexture;
                if (zaugj.lightEmissiveTexture && zaugcq) {
                    zaugaq(zaugcq, 15);
                    zaugf.uniform1i(zaugj.lightEmissiveTexture, 15);
                }
            }
        }
        var zaugcr = zaugh.drawRange || {
            start: 0,
            count: Infinity
        };
        var zaugcs = function(zaugb, zaugc) {
            if (zaugj.modelMatrix) zaugf.uniformMatrix4fv(zaugj.modelMatrix, false, zaugb.elements);
            var zaugd = zaugg.wireframe ? this.getWireframeIndex(zaugh) : zaugh.index;
            var zauge = zaugg.wireframe ? zaugf.LINES : zauga instanceof Points ? zaugf.POINTS : zauga instanceof LineSegments ? zaugf.LINES : zauga instanceof LineLoop ? zaugf.LINE_LOOP : zauga instanceof Line ? zaugf.LINE_STRIP : zaugf.TRIANGLES;
            if (zaugd) {
                zaugf.bindBuffer(zaugf.ELEMENT_ARRAY_BUFFER, this.getIndexBuffer(zaugh, zaugd));
                var zaugi = zaugd instanceof Uint32Array ? zaugf.UNSIGNED_INT : zaugf.UNSIGNED_SHORT;
                if (zaugc && zaugy) {
                    if (zaugy.drawElementsInstanced) zaugy.drawElementsInstanced(zauge, zaugd.length, zaugi, 0, zaugc); else zaugy.drawElementsInstancedANGLE(zauge, zaugd.length, zaugi, 0, zaugc);
                } else {
                    var zaugk = Math.min(zaugd.length - zaugcr.start, zaugcr.count);
                    zaugf.drawElements(zauge, zaugk, zaugi, zaugcr.start * (zaugi === zaugf.UNSIGNED_INT ? 4 : 2));
                }
                this.info.render.triangles += Math.floor(Math.min(zaugd.length - zaugcr.start, zaugcr.count) / 3) * (zaugc || 1);
            } else if (zaugp) {
                var zaugl = zaugp.array.length / zaugp.itemSize;
                if (zaugc && zaugy) {
                    if (zaugy.drawArraysInstanced) zaugy.drawArraysInstanced(zauge, 0, zaugl, zaugc); else zaugy.drawArraysInstancedANGLE(zauge, 0, zaugl, zaugc);
                } else {
                    var zaugm = Math.min(zaugl - zaugcr.start, zaugcr.count);
                    zaugf.drawArrays(zauge, zaugcr.start, zaugm);
                }
                this.info.render.triangles += Math.floor(Math.min(zaugl - zaugcr.start, zaugcr.count) / 3) * (zaugc || 1);
            }
        }.bind(this);
        if (zaugx && !zaugy) {
            for (var zaugct = 0; zaugct < zauga.count; zaugct++) zaugcs(zauga.matrixWorld.clone().multiply(zauga.getMatrixAt(zaugct)), 0);
        } else zaugcs(zauga.matrixWorld, zaugx ? zauga.count : 0);
        this.info.render.calls++;
    }
    getPointShadowTarget(zauga) {
        var zaugb = this.gl;
        var zaugc = zauga.shadow.mapSize || this.shadowMap.size;
        var zaugd = zauga.shadow.target;
        if (zaugd && zaugd.size === zaugc) return zaugd;
        var zauge = zaugb.createTexture();
        zaugb.bindTexture(zaugb.TEXTURE_CUBE_MAP, zauge);
        var zaugf = [ zaugb.TEXTURE_CUBE_MAP_POSITIVE_X, zaugb.TEXTURE_CUBE_MAP_NEGATIVE_X, zaugb.TEXTURE_CUBE_MAP_POSITIVE_Y, zaugb.TEXTURE_CUBE_MAP_NEGATIVE_Y, zaugb.TEXTURE_CUBE_MAP_POSITIVE_Z, zaugb.TEXTURE_CUBE_MAP_NEGATIVE_Z ];
        for (var zaugg = 0; zaugg < 6; zaugg++) zaugb.texImage2D(zaugf[zaugg], 0, zaugb.RGBA, zaugc, zaugc, 0, zaugb.RGBA, zaugb.UNSIGNED_BYTE, null);
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_MIN_FILTER, zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_MAG_FILTER, zaugb.LINEAR);
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_WRAP_S, zaugb.CLAMP_TO_EDGE);
        zaugb.texParameteri(zaugb.TEXTURE_CUBE_MAP, zaugb.TEXTURE_WRAP_T, zaugb.CLAMP_TO_EDGE);
        var zaugh = zaugb.createFramebuffer();
        var zaugi = zaugb.createRenderbuffer();
        zaugb.bindRenderbuffer(zaugb.RENDERBUFFER, zaugi);
        zaugb.renderbufferStorage(zaugb.RENDERBUFFER, zaugb.DEPTH_COMPONENT16, zaugc, zaugc);
        zaugb.bindFramebuffer(zaugb.FRAMEBUFFER, null);
        zaugd = {
            size: zaugc,
            texture: zauge,
            framebuffer: zaugh,
            depth: zaugi
        };
        zauga.shadow.target = zaugd;
        zauga.shadow.cubeMap = zaugd;
        return zaugd;
    }
    getPointShadowProgram() {
        var zauga = this.gl;
        if (this.pointShadowProgram) return this.pointShadowProgram;
        var zaugb = this.compileShader(zauga.VERTEX_SHADER, "attribute vec3 position; uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; varying vec3 worldPosition; void main(){ vec4 world=modelMatrix*vec4(position,1.0); worldPosition=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }");
        var zaugc = this.compileShader(zauga.FRAGMENT_SHADER, "precision highp float; uniform vec3 lightPosition; uniform float shadowFar; varying vec3 worldPosition; void main(){ gl_FragColor=vec4(vec3(length(worldPosition-lightPosition)/shadowFar),1.0); }");
        if (!zaugb || !zaugc) return null;
        var zaugd = zauga.createProgram();
        zauga.attachShader(zaugd, zaugb);
        zauga.attachShader(zaugd, zaugc);
        zauga.bindAttribLocation(zaugd, 0, "position");
        zauga.linkProgram(zaugd);
        if (!zauga.getProgramParameter(zaugd, zauga.LINK_STATUS)) return null;
        zaugd.modelMatrix = zauga.getUniformLocation(zaugd, "modelMatrix");
        zaugd.viewMatrix = zauga.getUniformLocation(zaugd, "viewMatrix");
        zaugd.projectionMatrix = zauga.getUniformLocation(zaugd, "projectionMatrix");
        zaugd.lightPosition = zauga.getUniformLocation(zaugd, "lightPosition");
        zaugd.shadowFar = zauga.getUniformLocation(zaugd, "shadowFar");
        this.pointShadowProgram = zaugd;
        return zaugd;
    }
    renderPointShadowMap(zauga, zaugb) {
        if (!this.gl || !zaugb || !zaugb.shadow) return false;
        var zaugc = this.gl;
        var zaugd = this.getPointShadowTarget(zaugb);
        var zauge = this.getPointShadowProgram();
        if (!zauge) return false;
        var zaugf = (new Vector3).setFromMatrixPosition(zaugb.matrixWorld);
        var zaugg = zaugb.shadow.camera.far || zaugb.distance || 100;
        var zaugh = zaugb.shadow.camera.near || .1;
        var zaugi = (new Matrix4).makePerspective(90, 1, zaugh, zaugg);
        var zaugj = [ new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1) ];
        var zaugk = [ new Vector3(0, -1, 0), new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1), new Vector3(0, -1, 0), new Vector3(0, -1, 0) ];
        var zaugl = [ zaugc.TEXTURE_CUBE_MAP_POSITIVE_X, zaugc.TEXTURE_CUBE_MAP_NEGATIVE_X, zaugc.TEXTURE_CUBE_MAP_POSITIVE_Y, zaugc.TEXTURE_CUBE_MAP_NEGATIVE_Y, zaugc.TEXTURE_CUBE_MAP_POSITIVE_Z, zaugc.TEXTURE_CUBE_MAP_NEGATIVE_Z ];
        var zaugm = this;
        zaugc.useProgram(zauge);
        this.currentProgram = zauge;
        if (zauge.lightPosition) zaugc.uniform3f(zauge.lightPosition, zaugf.x, zaugf.y, zaugf.z);
        if (zauge.shadowFar) zaugc.uniform1f(zauge.shadowFar, zaugg);
        for (var zaugn = 0; zaugn < 6; zaugn++) {
            var zaugo = (new Matrix4).lookAt(zaugf, zaugf.clone().add(zaugj[zaugn]), zaugk[zaugn]).invert();
            zaugc.bindFramebuffer(zaugc.FRAMEBUFFER, zaugd.framebuffer);
            zaugc.framebufferTexture2D(zaugc.FRAMEBUFFER, zaugc.COLOR_ATTACHMENT0, zaugl[zaugn], zaugd.texture, 0);
            zaugc.framebufferRenderbuffer(zaugc.FRAMEBUFFER, zaugc.DEPTH_ATTACHMENT, zaugc.RENDERBUFFER, zaugd.depth);
            zaugc.viewport(0, 0, zaugd.size, zaugd.size);
            zaugc.clearColor(1, 1, 1, 1);
            zaugc.clear(zaugc.COLOR_BUFFER_BIT | zaugc.DEPTH_BUFFER_BIT);
            zaugc.enable(zaugc.DEPTH_TEST);
            zauga.traverseVisible(function(zauga) {
                if (!(zauga instanceof Mesh) || !zauga.geometry || !zauga.geometry.attributes.position) return;
                zauga.updateMatrixWorld(true);
                var zaugb = zauga.geometry.attributes.position;
                zaugc.bindBuffer(zaugc.ARRAY_BUFFER, zaugm.getBuffer(zauga.geometry, "position", zaugb));
                zaugc.enableVertexAttribArray(0);
                zaugc.vertexAttribPointer(0, zaugb.itemSize, zaugm.getAttributeType(zaugb), !!zaugb.normalized, 0, 0);
                if (zauge.modelMatrix) zaugc.uniformMatrix4fv(zauge.modelMatrix, false, zauga.matrixWorld.elements);
                if (zauge.viewMatrix) zaugc.uniformMatrix4fv(zauge.viewMatrix, false, zaugo.elements);
                if (zauge.projectionMatrix) zaugc.uniformMatrix4fv(zauge.projectionMatrix, false, zaugi.elements);
                if (zauga.geometry.index) {
                    var zaugd = zauga.geometry.index;
                    zaugc.bindBuffer(zaugc.ELEMENT_ARRAY_BUFFER, zaugm.getIndexBuffer(zauga.geometry, zaugd));
                    zaugc.drawElements(zaugc.TRIANGLES, zaugd.length, zaugd instanceof Uint32Array ? zaugc.UNSIGNED_INT : zaugc.UNSIGNED_SHORT, 0);
                } else zaugc.drawArrays(zaugc.TRIANGLES, 0, zaugb.array.length / zaugb.itemSize);
            });
        }
        zaugc.bindFramebuffer(zaugc.FRAMEBUFFER, null);
        zaugc.viewport(0, 0, this.canvas.width, this.canvas.height);
        return true;
    }
    getGBufferProgram() {
        var zauga = this.gl;
        if (!zauga || !this.isWebGL2) return null;
        if (this.gBufferProgram) return this.gBufferProgram;
        var zaugb = this.compileShader(zauga.VERTEX_SHADER, "#version 300 es\nin vec3 position; in vec3 normal; uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix; uniform mat3 normalMatrix; out vec3 worldNormal; void main(){ vec4 world=modelMatrix*vec4(position,1.0); worldNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*viewMatrix*world; }");
        var zaugc = this.compileShader(zauga.FRAGMENT_SHADER, "#version 300 es\nprecision highp float; uniform vec3 color; in vec3 worldNormal; layout(location=0) out vec4 outColor; layout(location=1) out vec4 outNormal; void main(){ outColor=vec4(color,1.0); outNormal=vec4(normalize(worldNormal)*0.5+0.5,1.0); }");
        if (!zaugb || !zaugc) return null;
        var zaugd = zauga.createProgram();
        zauga.attachShader(zaugd, zaugb);
        zauga.attachShader(zaugd, zaugc);
        zauga.bindAttribLocation(zaugd, 0, "position");
        zauga.bindAttribLocation(zaugd, 1, "normal");
        zauga.linkProgram(zaugd);
        if (!zauga.getProgramParameter(zaugd, zauga.LINK_STATUS)) return null;
        zaugd.modelMatrix = zauga.getUniformLocation(zaugd, "modelMatrix");
        zaugd.viewMatrix = zauga.getUniformLocation(zaugd, "viewMatrix");
        zaugd.projectionMatrix = zauga.getUniformLocation(zaugd, "projectionMatrix");
        zaugd.normalMatrix = zauga.getUniformLocation(zaugd, "normalMatrix");
        zaugd.color = zauga.getUniformLocation(zaugd, "color");
        this.gBufferProgram = zaugd;
        return zaugd;
    }
    renderGBuffer(zauga, zaugb, zaugc) {
        if (!this.gl || !this.isWebGL2 || !zaugc) return false;
        var zaugd = this.gl;
        var zauge = this.getGBufferProgram();
        if (!zauge) return false;
        zauga.updateMatrixWorld(true);
        zaugb.updateMatrixWorld(true);
        zaugd.bindFramebuffer(zaugd.FRAMEBUFFER, zaugc.framebuffer);
        zaugd.drawBuffers([ zaugd.COLOR_ATTACHMENT0, zaugd.COLOR_ATTACHMENT1 ]);
        zaugd.viewport(0, 0, zaugc.width, zaugc.height);
        zaugd.clear(zaugd.COLOR_BUFFER_BIT | zaugd.DEPTH_BUFFER_BIT);
        zaugd.useProgram(zauge);
        this.currentProgram = zauge;
        var zaugf = this;
        zauga.traverseVisible(function(zauga) {
            if (!(zauga instanceof Mesh) || !zauga.geometry || !zauga.geometry.attributes.position) return;
            zauga.updateMatrixWorld(true);
            var zaugc = zauga.geometry.attributes.position;
            var zaugg = zauga.geometry.attributes.normal;
            zaugd.bindBuffer(zaugd.ARRAY_BUFFER, zaugf.getBuffer(zauga.geometry, "position", zaugc));
            zaugd.enableVertexAttribArray(0);
            zaugd.vertexAttribPointer(0, zaugc.itemSize, zaugf.getAttributeType(zaugc), !!zaugc.normalized, 0, 0);
            if (zaugg) {
                zaugd.bindBuffer(zaugd.ARRAY_BUFFER, zaugf.getBuffer(zauga.geometry, "normal", zaugg));
                zaugd.enableVertexAttribArray(1);
                zaugd.vertexAttribPointer(1, zaugg.itemSize, zaugf.getAttributeType(zaugg), !!zaugg.normalized, 0, 0);
            } else {
                zaugd.disableVertexAttribArray(1);
                zaugd.vertexAttrib3f(1, 0, 1, 0);
            }
            var zaugh = zauga.matrixWorld.clone().invert().transpose().elements;
            var zaugi = new Float32Array([ zaugh[0], zaugh[1], zaugh[2], zaugh[4], zaugh[5], zaugh[6], zaugh[8], zaugh[9], zaugh[10] ]);
            zaugd.uniformMatrix4fv(zauge.modelMatrix, false, zauga.matrixWorld.elements);
            zaugd.uniformMatrix4fv(zauge.viewMatrix, false, zaugb.matrixWorldInverse.elements);
            zaugd.uniformMatrix4fv(zauge.projectionMatrix, false, zaugb.projectionMatrix.elements);
            zaugd.uniformMatrix3fv(zauge.normalMatrix, false, zaugi);
            zaugd.uniform3f(zauge.color, zauga.material.color.r, zauga.material.color.g, zauga.material.color.b);
            if (zauga.geometry.index) {
                var zaugj = zauga.geometry.index;
                zaugd.bindBuffer(zaugd.ELEMENT_ARRAY_BUFFER, zaugf.getIndexBuffer(zauga.geometry, zaugj));
                zaugd.drawElements(zaugd.TRIANGLES, zaugj.length, zaugj instanceof Uint32Array ? zaugd.UNSIGNED_INT : zaugd.UNSIGNED_SHORT, 0);
            } else zaugd.drawArrays(zaugd.TRIANGLES, 0, zaugc.array.length / zaugc.itemSize);
        });
        zaugd.bindFramebuffer(zaugd.FRAMEBUFFER, null);
        return true;
    }
    createOcclusionCuller() {
        this.occlusionCuller = this.occlusionCuller || new OcclusionCuller(this);
        return this.occlusionCuller;
    }
    getPostProgram(zauga) {
        var zaugb = this.gl;
        if (!zaugb) return null;
        this.postProgramCache = this.postProgramCache || {};
        if (this.postProgramCache[zauga]) return this.postProgramCache[zauga];
        var zaugc = "attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,0.0,1.0); }", zaugd = this.compileShader(zaugb.VERTEX_SHADER, zaugc), zauge = this.compileShader(zaugb.FRAGMENT_SHADER, zauga);
        if (!zaugd || !zauge) return null;
        var zaugf = zaugb.createProgram();
        zaugb.attachShader(zaugf, zaugd);
        zaugb.attachShader(zaugf, zauge);
        zaugb.bindAttribLocation(zaugf, 0, "position");
        zaugb.bindAttribLocation(zaugf, 1, "uv");
        zaugb.linkProgram(zaugf);
        if (!zaugb.getProgramParameter(zaugf, zaugb.LINK_STATUS)) return null;
        zaugf.uniforms = {};
        var zaugg = zaugc + "\n" + zauga, zaugh = zaugg.matchAll ? zaugg.matchAll(/uniform\s+(\w+)\s+(\w+)(?:\s*\[\s*(\d+)\s*\])?\s*;/g) : [];
        for (var zaugi of zaugh) {
            var zaugj = zaugi[2];
            zaugf.uniforms[zaugj] = zaugb.getUniformLocation(zaugf, zaugi[3] ? zaugj + "[0]" : zaugj);
            if (zaugi[3]) for (var zaugk = 0; zaugk < Number(zaugi[3]); zaugk++) zaugf.uniforms[zaugj + "[" + zaugk + "]"] = zaugb.getUniformLocation(zaugf, zaugj + "[" + zaugk + "]");
        }
        zaugf.inputTexture = zaugf.uniforms.inputTexture || zaugf.uniforms.tScene || null;
        zaugf.depthTexture = zaugf.uniforms.depthTexture || zaugf.uniforms.tDepth || zaugf.uniforms.depth || null;
        zaugf.texelSize = zaugf.uniforms.texelSize || null;
        zaugf.threshold = zaugf.uniforms.threshold || null;
        zaugf.strength = zaugf.uniforms.strength || null;
        zaugf.radius = zaugf.uniforms.radius || null;
        zaugf.exposure = zaugf.uniforms.exposure || null;
        zaugf.contrast = zaugf.uniforms.contrast || null;
        zaugf.saturation = zaugf.uniforms.saturation || null;
        zaugf.tint = zaugf.uniforms.tint || null;
        this.postProgramCache[zauga] = zaugf;
        return zaugf;
    }
    drawPost(zauga, zaugb, zaugc, zaugd, zauge) {
        if (!this.gl || !zauga || !zaugb) return;
        var zaugf = this.gl, zaugg = zaugc || this.currentRenderTarget, zaugh = zaugg ? zaugg.msaaFramebuffer || zaugg.framebuffer : null, zaugi = zaugg ? zaugg.width : this.canvas.width, zaugj = zaugg ? zaugg.height : this.canvas.height;
        if (zaugb !== zaugg && zaugb.settle && zaugb.msaaFramebuffer) zaugb.settle();
        zaugf.bindFramebuffer(zaugf.FRAMEBUFFER, zaugh);
        zaugf.viewport(0, 0, zaugi, zaugj);
        zaugf.disable(zaugf.DEPTH_TEST);
        zaugf.disable(zaugf.CULL_FACE);
        zaugf.disable(zaugf.BLEND);
        zaugf.useProgram(zauga);
        this.currentProgram = zauga;
        this.postQuadBuffer = this.postQuadBuffer || zaugf.createBuffer();
        zaugf.bindBuffer(zaugf.ARRAY_BUFFER, this.postQuadBuffer);
        zaugf.bufferData(zaugf.ARRAY_BUFFER, new Float32Array([ -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1 ]), zaugf.STATIC_DRAW);
        zaugf.enableVertexAttribArray(0);
        zaugf.vertexAttribPointer(0, 2, zaugf.FLOAT, false, 16, 0);
        zaugf.enableVertexAttribArray(1);
        zaugf.vertexAttribPointer(1, 2, zaugf.FLOAT, false, 16, 8);
        zaugd = zaugd || {};
        var zaugk = 0, zaugl = function(zauga, zaugb, zaugc) {
            if (!zauga || !zaugb) return;
            if (zaugf.activeTexture) zaugf.activeTexture(zaugf.TEXTURE0 + zaugc);
            zaugf.bindTexture(zaugf.TEXTURE_2D, zaugb.glTexture || zaugb.texture || zaugb);
            zaugf.uniform1i(zauga, zaugc);
        };
        zaugl(zauga.inputTexture, zaugb, zaugk++);
        var zaugm = zauge && zauge.depthTexture ? zauge.depthTexture : null;
        if (zauga.depthTexture && zaugm) zaugl(zauga.depthTexture, zaugm, zaugk++);
        for (var zaugn in zaugd) {
            if (zaugn === "inputTexture" || zaugn === "tScene" || zaugn === "depthTexture" || zaugn === "tDepth") continue;
            var zaugo = zauga.uniforms && zauga.uniforms[zaugn];
            if (!zaugo) continue;
            var zaugp = zaugd[zaugn];
            if (zaugp && zaugp.value !== undefined) zaugp = zaugp.value;
            if (zaugp && (zaugp.isTexture || zaugp.glTexture || zaugp.texture)) zaugl(zaugo, zaugp, zaugk++); else this.setShaderUniform(zaugo, zaugp, zaugn);
        }
        zaugf.drawArrays(zaugf.TRIANGLE_STRIP, 0, 4);
        zaugf.bindFramebuffer(zaugf.FRAMEBUFFER, this.currentRenderTarget ? this.currentRenderTarget.framebuffer : null);
    }
    render(zauga, zaugb) {
        if (this.postProcessing && this.postProcessing.enabled && !this._postProcessingLock) return this.postProcessing.render(zauga, zaugb);
        return this.renderScene(zauga, zaugb, this.currentRenderTarget);
    }
    renderScene(zauga, zaugb, zaugc) {
        zaugc = zaugc === undefined ? this.currentRenderTarget : zaugc;
        if (!zauga || !zaugb) return;
        var zaugd = zauga.matrixAutoUpdate === false && zauga.userData && zauga.userData.static === true, zauge = zaugb.matrixAutoUpdate === false && zaugb.userData && zaugb.userData.static === true;
        if (!zaugd || !zauga._faoxomStaticMatricesReady) {
            zauga.updateMatrixWorld(true);
            if (zaugd) zauga._faoxomStaticMatricesReady = true;
        }
        if (!zauge || !zaugb._faoxomStaticMatricesReady) {
            zaugb.updateMatrixWorld(true);
            if (zauge) zaugb._faoxomStaticMatricesReady = true;
        }
        if (!this.gl) return;
        var zaugf = this.gl;
        var zaugg = zaugc ? zaugc.msaaFramebuffer || zaugc.framebuffer : null;
        if (zaugf.FRAMEBUFFER_SRGB) {
            if ((zaugc && zaugc.colorSpace ? zaugc.colorSpace : this.outputColorSpace) === "srgb") zaugf.enable(zaugf.FRAMEBUFFER_SRGB); else zaugf.disable(zaugf.FRAMEBUFFER_SRGB);
        }
        var zaugh = zaugc ? zaugc.viewport && zaugc.viewport.width || zaugc.width : this.canvas.width;
        var zaugi = zaugc ? zaugc.viewport && zaugc.viewport.height || zaugc.height : this.canvas.height;
        zaugf.bindFramebuffer(zaugf.FRAMEBUFFER, zaugg);
        if (zaugc) {
            var zaugj = this._maxCombinedTextureUnits || (this._maxCombinedTextureUnits = zaugf.getParameter(zaugf.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 8);
            for (var zaugk = 0; zaugk < Math.min(zaugj, 16); zaugk++) {
                zaugf.activeTexture(zaugf.TEXTURE0 + zaugk);
                zaugf.bindTexture(zaugf.TEXTURE_2D, null);
            }
            zaugf.activeTexture(zaugf.TEXTURE0);
        }
        var zaugl = zaugc && zaugc.viewport;
        zaugf.viewport(zaugl ? zaugl.x : 0, zaugl ? zaugl.y : 0, zaugh, zaugi);
        this.info.render.calls = 0;
        this.info.render.triangles = 0;
        this.info.render.frame++;
        zaugf.depthMask(true);
        this.setClearColor(zauga.background && zauga.background.color ? zauga.background.color : this.clearColor, zauga.background && zauga.background.alpha !== undefined ? zauga.background.alpha : this.clearAlpha);
        if (this.autoClear && (!zaugc || zaugc.clear !== false)) zaugf.clear(zaugf.COLOR_BUFFER_BIT | zaugf.DEPTH_BUFFER_BIT);
        var zaugm = zaugd && zauga._faoxomStaticLights ? zauga._faoxomStaticLights : [];
        if (!zaugm.length && !(zaugd && zauga._faoxomStaticLights)) {
            zauga.traverseVisible(function(zauga) {
                if (zauga instanceof Light && zaugm.length < 8 && (!zauga.renderLayers || !zaugb.renderLayers || zaugb.renderLayers.shares(zauga.renderLayers))) zaugm.push(zauga);
            });
            if (zaugd) zauga._faoxomStaticLights = zaugm;
        }
        if (this.shadowMap.enabled) {
            for (var zaugn = 0; zaugn < zaugm.length; zaugn++) if (zaugm[zaugn].castShadow || zaugm[zaugn].shadow && zaugm[zaugn].shadow.enabled) {
                if (zaugm[zaugn].type === "PointLight") this.renderPointShadowMap(zauga, zaugm[zaugn]); else this.renderShadowMap(zauga, zaugm[zaugn], zaugb);
            }
        }
        if (this.occlusionCuller && this.occlusionCuller.enabled) {
            this.occlusionCuller.update();
            this.occlusionCuller.beginFrame();
        }
        if (this.shadowMap.enabled) {
            zaugf.bindFramebuffer(zaugf.FRAMEBUFFER, zaugg);
            var zaugl = zaugc && zaugc.viewport;
            zaugf.viewport(zaugl ? zaugl.x : 0, zaugl ? zaugl.y : 0, zaugh, zaugi);
            this.setClearColor(zauga.background && zauga.background.color ? zauga.background.color : this.clearColor, zauga.background && zauga.background.alpha !== undefined ? zauga.background.alpha : this.clearAlpha);
        }
        this._basicState = null;
        var zaugo = this.collect(zauga, zaugb);
        var zaugp = zauga.fog;
        for (var zaugq = 0; zaugq < zaugo.length; zaugq++) {
            var zaugr = zaugo[zaugq].object;
            if (this.occlusionCuller && this.renderQueue.length >= this.occlusionCuller.minObjects && !(zaugr.userData && zaugr.userData.autoBatch)) {
                var zaugs = this;
                this.occlusionCuller.test(zaugr, function() {
                    zaugs.drawOcclusion(zaugr, zaugb);
                });
            }
            this.draw(zaugr, zaugb, zaugm, zaugp, zauga.environment);
        }
        zaugf.depthMask(true);
    }
    forgetGeometry(zauga) {
        var zaugb = this.gl;
        if (!zaugb || !this.bufferCache || !this.bufferCache.has || !this.bufferCache.has(zauga)) return this;
        var zaugc = this.bufferCache.get(zauga);
        for (var zaugd in zaugc) {
            if (zaugd === "versions" || zaugd === "wireData") continue;
            var zauge = zaugc[zaugd];
            if (zauge && typeof zauge === "object" && zaugb.deleteBuffer) zaugb.deleteBuffer(zauge);
        }
        this.bufferCache.delete(zauga);
        this._basicState = null;
        return this;
    }
    forgetTexture(zauga) {
        var zaugb = this.gl;
        if (!zaugb || !this.textureCache || !this.textureCache.has || !this.textureCache.has(zauga)) return this;
        var zaugc = this.textureCache.get(zauga);
        if (zaugc && zaugb.deleteTexture) zaugb.deleteTexture(zaugc);
        this.textureCache.delete(zauga);
        if (zauga) zauga.needsUpdate = true;
        return this;
    }
    purge(zauga) {
        if (!zauga) return this;
        var zaugb = this;
        if (zauga.traverse) zauga.traverse(function(zauga) {
            if (zauga.geometry) zaugb.forgetGeometry(zauga.geometry);
            var zaugc = zauga.material;
            if (!zaugc) return;
            var zaugd = Array.isArray(zaugc) ? zaugc : [ zaugc ];
            for (var zauge = 0; zauge < zaugd.length; zauge++) {
                var zaugf = zaugd[zauge];
                if (!zaugf) continue;
                var zaugg = [ zaugf.diffuseMap, zaugf.normalMap, zaugf.envMap, zaugf.displacementMap, zaugf.parallaxMap, zaugf.emissiveMap, zaugf.aoMap, zaugf.roughnessMap, zaugf.metalnessMap, zaugf.alphaMap, zaugf.specularMap, zaugf.lightMap ];
                for (var zaugh = 0; zaugh < zaugg.length; zaugh++) if (zaugg[zaugh]) zaugb.forgetTexture(zaugg[zaugh]);
            }
        });
        return this;
    }
    dispose() {
        if (this.postProcessing) {
            this.postProcessing.dispose();
            this.postProcessing = null;
        }
        this.programCache = {};
        this.postProgramCache = {};
        this.renderQueue = [];
        this.postQuadBuffer = null;
    }
}

WebGLRenderer.prototype.enableBlenderFidelity = function(zauga) {
    return new BlenderFidelityProfile(this, zauga);
};

export { WebGLRenderer };
