import { FloatType, HalfFloatType, LinearFilter, NearestFilter, RGBA16FFormat, RGBAFormat, UnsignedByteType, faoxomstate } from "../core/index.js";

import { faoxomvalue } from "../math/index.js";

import { DepthTexture } from "../textures/index.js";

class RenderTarget {
    constructor(zatra, zatrb, zatrc, zatrd) {
        zatrd = zatrd || {};
        if (!zatra && faoxomstate.faoxomdefaultrenderer) zatra = faoxomstate.faoxomdefaultrenderer;
        this.renderer = zatra || {
            canvas: {
                width: zatrb || 1,
                height: zatrc || 1
            },
            gl: null,
            isWebGL2: false
        };
        this.options = zatrd;
        this.width = Math.max(1, Math.floor(zatrb || (this.renderer.canvas ? this.renderer.canvas.width : 1)));
        this.height = Math.max(1, Math.floor(zatrc || (this.renderer.canvas ? this.renderer.canvas.height : 1)));
        this.texture = null;
        this.framebuffer = null;
        this.depth = null;
        this.depthTexture = zatrd.depthTexture instanceof DepthTexture ? zatrd.depthTexture : zatrd.depthTexture ? new DepthTexture(this.width, this.height, {
            type: zatrd.depthType || FloatType
        }) : null;
        this.depthBuffer = zatrd.depthBuffer !== false;
        this.stencilBuffer = !!zatrd.stencilBuffer;
        this.format = zatrd.format || RGBAFormat;
        this.type = zatrd.type || UnsignedByteType;
        this.minFilter = zatrd.minFilter || LinearFilter;
        this.magFilter = zatrd.magFilter || LinearFilter;
        this.colorSpace = zatrd.colorSpace || "linear";
        this.clear = zatrd.clear !== false;
        this.viewport = zatrd.viewport || null;
        this.requestedMsaa = Math.max(0, Math.floor(faoxomvalue(zatrd.msaa, 0)));
        this.textureCount = Math.max(1, Math.floor(faoxomvalue(zatrd.count, 1)));
        this.textures = null;
        if (this.textureCount > 1 && (!this.renderer || !this.renderer.isWebGL2)) this.textureCount = 1;
        if (this.textureCount > 1) this.requestedMsaa = 0;
        this.msaaSamples = 0;
        this.msaaFramebuffer = null;
        this.msaaColor = null;
        this.msaaDepth = null;
        this.resize(this.width, this.height);
    }
    setSize(zatra, zatrb) {
        if (this.depthTexture) {
            this.depthTexture.width = Math.max(1, Math.floor(zatra));
            this.depthTexture.height = Math.max(1, Math.floor(zatrb));
        }
        return this.resize(zatra, zatrb);
    }
    resize(zatra, zatrb) {
        var zatrc = this.renderer.gl;
        this.width = Math.max(1, Math.floor(zatra));
        this.height = Math.max(1, Math.floor(zatrb));
        if (!zatrc) return this;
        var zatrd = this.type === HalfFloatType || this.type === zatrc.HALF_FLOAT || this.format === RGBA16FFormat || this.format === zatrc.RGBA16F;
        var zatre = this.type === FloatType || this.type === zatrc.FLOAT;
        var zatrf = !this.renderer.isWebGL2 && zatrc.getExtension ? zatrc.getExtension("OES_texture_half_float") : null;
        var zatrg = zatrd ? this.renderer.isWebGL2 ? zatrc.HALF_FLOAT : zatrf ? zatrf.HALF_FLOAT_OES : zatrc.UNSIGNED_BYTE : zatre && (this.renderer.isWebGL2 || zatrc.getExtension && zatrc.getExtension("OES_texture_float")) ? zatrc.FLOAT : zatrc.UNSIGNED_BYTE;
        this.actualType = zatrg === zatrc.UNSIGNED_BYTE ? UnsignedByteType : this.type;
        if (this.textureCount > 1) {
            if (!this.textures) this.textures = [];
            while (this.textures.length < this.textureCount) this.textures.push(zatrc.createTexture());
            if (!this.framebuffer) this.framebuffer = zatrc.createFramebuffer();
            zatrc.bindFramebuffer(zatrc.FRAMEBUFFER, this.framebuffer);
            for (var zatrh = 0; zatrh < this.textureCount; zatrh++) {
                zatrc.bindTexture(zatrc.TEXTURE_2D, this.textures[zatrh]);
                zatrc.texImage2D(zatrc.TEXTURE_2D, 0, zatrc.RGBA, this.width, this.height, 0, zatrc.RGBA, zatrc.UNSIGNED_BYTE, null);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_MIN_FILTER, this.minFilter === "nearest" || this.minFilter === NearestFilter ? zatrc.NEAREST : zatrc.LINEAR);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_MAG_FILTER, this.magFilter === "nearest" || this.magFilter === NearestFilter ? zatrc.NEAREST : zatrc.LINEAR);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_WRAP_S, zatrc.CLAMP_TO_EDGE);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_WRAP_T, zatrc.CLAMP_TO_EDGE);
                zatrc.framebufferTexture2D(zatrc.FRAMEBUFFER, zatrc.COLOR_ATTACHMENT0 + zatrh, zatrc.TEXTURE_2D, this.textures[zatrh], 0);
            }
            if (this.depthBuffer) {
                if (!this.depth) this.depth = zatrc.createRenderbuffer();
                zatrc.bindRenderbuffer(zatrc.RENDERBUFFER, this.depth);
                zatrc.renderbufferStorage(zatrc.RENDERBUFFER, this.stencilBuffer ? zatrc.DEPTH24_STENCIL8 : zatrc.DEPTH_COMPONENT16, this.width, this.height);
                zatrc.framebufferRenderbuffer(zatrc.FRAMEBUFFER, this.stencilBuffer ? zatrc.DEPTH_STENCIL_ATTACHMENT : zatrc.DEPTH_ATTACHMENT, zatrc.RENDERBUFFER, this.depth);
            }
            this.texture = this.textures[0];
            this.fallback = false;
            this.incomplete = zatrc.checkFramebufferStatus ? zatrc.checkFramebufferStatus(zatrc.FRAMEBUFFER) !== zatrc.FRAMEBUFFER_COMPLETE : false;
            this.msaaSamples = 0;
            this.msaaFramebuffer = null;
            this.msaaColor = null;
            this.msaaDepth = null;
            zatrc.bindFramebuffer(zatrc.FRAMEBUFFER, null);
            return this;
        }
        this.fallback = this.actualType !== this.type;
        var zatri = zatrd && this.renderer.isWebGL2 && zatrc.RGBA16F ? zatrc.RGBA16F : zatrc.RGBA;
        if (!this.texture) this.texture = zatrc.createTexture();
        zatrc.bindTexture(zatrc.TEXTURE_2D, this.texture);
        zatrc.texImage2D(zatrc.TEXTURE_2D, 0, zatri, this.width, this.height, 0, zatrc.RGBA, zatrg, null);
        var zatrj = function(zatra) {
            return zatra === NearestFilter || zatra === "nearest" ? zatrc.NEAREST : zatrc.LINEAR;
        };
        zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_MIN_FILTER, zatrj(this.minFilter));
        zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_MAG_FILTER, zatrj(this.magFilter));
        zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_WRAP_S, zatrc.CLAMP_TO_EDGE);
        zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_WRAP_T, zatrc.CLAMP_TO_EDGE);
        if (!this.framebuffer) this.framebuffer = zatrc.createFramebuffer();
        zatrc.bindFramebuffer(zatrc.FRAMEBUFFER, this.framebuffer);
        zatrc.framebufferTexture2D(zatrc.FRAMEBUFFER, zatrc.COLOR_ATTACHMENT0, zatrc.TEXTURE_2D, this.texture, 0);
        if (this.depthBuffer) {
            if (this.depthTexture || this.options.depthTexture === true) {
                if (!this.depthTexture) this.depthTexture = new DepthTexture(this.width, this.height, {
                    type: this.options.depthType || FloatType
                });
                if (!this.depthTexture.glTexture) this.depthTexture.glTexture = zatrc.createTexture();
                zatrc.bindTexture(zatrc.TEXTURE_2D, this.depthTexture.glTexture);
                var zatrk = this.depthTexture.type === FloatType && this.renderer.isWebGL2 && zatrc.DEPTH_COMPONENT32F ? zatrc.DEPTH_COMPONENT32F : this.renderer.isWebGL2 && zatrc.DEPTH_COMPONENT24 ? zatrc.DEPTH_COMPONENT24 : zatrc.DEPTH_COMPONENT16;
                var zatrl = zatrk === zatrc.DEPTH_COMPONENT32F && zatrc.FLOAT ? zatrc.FLOAT : zatrk === zatrc.DEPTH_COMPONENT24 && zatrc.UNSIGNED_INT ? zatrc.UNSIGNED_INT : zatrc.UNSIGNED_SHORT;
                zatrc.texImage2D(zatrc.TEXTURE_2D, 0, zatrk, this.width, this.height, 0, zatrc.DEPTH_COMPONENT, zatrl, null);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_MIN_FILTER, zatrc.NEAREST);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_MAG_FILTER, zatrc.NEAREST);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_WRAP_S, zatrc.CLAMP_TO_EDGE);
                zatrc.texParameteri(zatrc.TEXTURE_2D, zatrc.TEXTURE_WRAP_T, zatrc.CLAMP_TO_EDGE);
                zatrc.framebufferTexture2D(zatrc.FRAMEBUFFER, zatrc.DEPTH_ATTACHMENT, zatrc.TEXTURE_2D, this.depthTexture.glTexture, 0);
            } else {
                if (!this.depth) this.depth = zatrc.createRenderbuffer();
                zatrc.bindRenderbuffer(zatrc.RENDERBUFFER, this.depth);
                zatrc.renderbufferStorage(zatrc.RENDERBUFFER, this.stencilBuffer ? zatrc.DEPTH24_STENCIL8 : zatrc.DEPTH_COMPONENT16, this.width, this.height);
                zatrc.framebufferRenderbuffer(zatrc.FRAMEBUFFER, this.stencilBuffer ? zatrc.DEPTH_STENCIL_ATTACHMENT : zatrc.DEPTH_ATTACHMENT, zatrc.RENDERBUFFER, this.depth);
            }
        }
        if (this.stencilBuffer && !this.depthTexture) zatrc.framebufferRenderbuffer(zatrc.FRAMEBUFFER, zatrc.DEPTH_STENCIL_ATTACHMENT, zatrc.RENDERBUFFER, this.depth);
        var zatrm = zatrc.checkFramebufferStatus ? zatrc.checkFramebufferStatus(zatrc.FRAMEBUFFER) : zatrc.FRAMEBUFFER_COMPLETE;
        if (zatrm !== zatrc.FRAMEBUFFER_COMPLETE && zatrg !== zatrc.UNSIGNED_BYTE) {
            this.fallback = true;
            this.actualType = UnsignedByteType;
            zatrc.bindTexture(zatrc.TEXTURE_2D, this.texture);
            zatrc.texImage2D(zatrc.TEXTURE_2D, 0, zatrc.RGBA, this.width, this.height, 0, zatrc.RGBA, zatrc.UNSIGNED_BYTE, null);
            zatrc.framebufferTexture2D(zatrc.FRAMEBUFFER, zatrc.COLOR_ATTACHMENT0, zatrc.TEXTURE_2D, this.texture, 0);
            zatrm = zatrc.checkFramebufferStatus ? zatrc.checkFramebufferStatus(zatrc.FRAMEBUFFER) : zatrc.FRAMEBUFFER_COMPLETE;
        }
        this.incomplete = zatrm !== zatrc.FRAMEBUFFER_COMPLETE;
        var zatrn = this.requestedMsaa > 1 && this.renderer.isWebGL2 && zatrc.renderbufferStorageMultisample && zatrc.blitFramebuffer && !this.depthTexture && this.options.depthTexture !== true;
        this.msaaSamples = zatrn ? Math.min(this.requestedMsaa, zatrc.getParameter(zatrc.MAX_SAMPLES) || this.requestedMsaa) : 0;
        if (this.msaaSamples > 1) {
            if (!this.msaaColor) this.msaaColor = zatrc.createRenderbuffer();
            if (!this.msaaDepth) this.msaaDepth = zatrc.createRenderbuffer();
            if (!this.msaaFramebuffer) this.msaaFramebuffer = zatrc.createFramebuffer();
            var zatro = this.fallback ? zatrc.RGBA8 !== undefined ? zatrc.RGBA8 : zatrc.RGBA : zatri === zatrc.RGBA && zatrc.RGBA8 !== undefined ? zatrc.RGBA8 : zatri;
            zatrc.bindRenderbuffer(zatrc.RENDERBUFFER, this.msaaColor);
            zatrc.renderbufferStorageMultisample(zatrc.RENDERBUFFER, this.msaaSamples, zatro, this.width, this.height);
            zatrc.bindRenderbuffer(zatrc.RENDERBUFFER, this.msaaDepth);
            zatrc.renderbufferStorageMultisample(zatrc.RENDERBUFFER, this.msaaSamples, this.stencilBuffer ? zatrc.DEPTH24_STENCIL8 : zatrc.DEPTH_COMPONENT16, this.width, this.height);
            zatrc.bindFramebuffer(zatrc.FRAMEBUFFER, this.msaaFramebuffer);
            zatrc.framebufferRenderbuffer(zatrc.FRAMEBUFFER, zatrc.COLOR_ATTACHMENT0, zatrc.RENDERBUFFER, this.msaaColor);
            zatrc.framebufferRenderbuffer(zatrc.FRAMEBUFFER, this.stencilBuffer ? zatrc.DEPTH_STENCIL_ATTACHMENT : zatrc.DEPTH_ATTACHMENT, zatrc.RENDERBUFFER, this.msaaDepth);
            var zatrp = zatrc.checkFramebufferStatus ? zatrc.checkFramebufferStatus(zatrc.FRAMEBUFFER) : zatrc.FRAMEBUFFER_COMPLETE;
            if (zatrp !== zatrc.FRAMEBUFFER_COMPLETE) {
                this.msaaSamples = 0;
            }
        } else if (this.msaaFramebuffer || this.msaaColor || this.msaaDepth) {
            if (zatrc.deleteFramebuffer && this.msaaFramebuffer) zatrc.deleteFramebuffer(this.msaaFramebuffer);
            if (zatrc.deleteRenderbuffer && this.msaaColor) zatrc.deleteRenderbuffer(this.msaaColor);
            if (zatrc.deleteRenderbuffer && this.msaaDepth) zatrc.deleteRenderbuffer(this.msaaDepth);
            this.msaaFramebuffer = null;
            this.msaaColor = null;
            this.msaaDepth = null;
        }
        zatrc.bindFramebuffer(zatrc.FRAMEBUFFER, null);
        return this;
    }
    settle() {
        var zatra = this.renderer && this.renderer.gl;
        if (!zatra || !this.msaaFramebuffer || !this.framebuffer || this.msaaSamples < 2) return this;
        zatra.bindFramebuffer(zatra.READ_FRAMEBUFFER, this.msaaFramebuffer);
        zatra.bindFramebuffer(zatra.DRAW_FRAMEBUFFER, this.framebuffer);
        zatra.blitFramebuffer(0, 0, this.width, this.height, 0, 0, this.width, this.height, zatra.COLOR_BUFFER_BIT, zatra.NEAREST);
        zatra.bindFramebuffer(zatra.FRAMEBUFFER, null);
        return this;
    }
    dispose() {
        var zatra = this.renderer.gl;
        if (!zatra) return;
        if (zatra.deleteTexture && this.texture) zatra.deleteTexture(this.texture);
        if (zatra.deleteTexture && this.textures) {
            for (var zatrb = 0; zatrb < this.textures.length; zatrb++) zatra.deleteTexture(this.textures[zatrb]);
            this.textures = null;
        }
        if (zatra.deleteTexture && this.depthTexture && this.depthTexture.glTexture) zatra.deleteTexture(this.depthTexture.glTexture);
        if (zatra.deleteFramebuffer && this.framebuffer) zatra.deleteFramebuffer(this.framebuffer);
        if (zatra.deleteRenderbuffer && this.depth) zatra.deleteRenderbuffer(this.depth);
        if (zatra.deleteFramebuffer && this.msaaFramebuffer) zatra.deleteFramebuffer(this.msaaFramebuffer);
        if (zatra.deleteRenderbuffer && this.msaaColor) zatra.deleteRenderbuffer(this.msaaColor);
        if (zatra.deleteRenderbuffer && this.msaaDepth) zatra.deleteRenderbuffer(this.msaaDepth);
        this.texture = null;
        this.depthTexture = null;
        this.framebuffer = null;
        this.depth = null;
        this.msaaFramebuffer = null;
        this.msaaColor = null;
        this.msaaDepth = null;
        this.msaaSamples = 0;
    }
}

export { RenderTarget };
