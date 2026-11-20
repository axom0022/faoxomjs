class TextureFormatSelector {
    constructor(zavea) {
        this.renderer = zavea || null;
    }
    capabilities() {
        return this.renderer && this.renderer.getCapabilities ? this.renderer.getCapabilities() : {
            webgl2: false,
            compressedTextureFormats: [],
            extensions: {}
        };
    }
    choose(zavea) {
        zavea = zavea || {};
        var zaveb = this.capabilities();
        var zavec = zavea.preferred || [ "bc7", "astc", "bc5", "bc3", "bc1", "pvrtc", "etc2", "rgba8" ];
        var zaved = zaveb.compressedTextureFormats || [];
        var zavee = zaveb.extensions || {};
        for (var zavef = 0; zavef < zavec.length; zavef++) {
            var zaveg = zavec[zavef].toLowerCase();
            if (zaveg === "bc7" && (zavee.bptc || zavee.EXT_texture_compression_bptc || zaved.indexOf("BC7") !== -1)) return "bc7";
            if (zaveg === "bc5" && (zavee.bptc || zavee.EXT_texture_compression_rgtc || zaved.indexOf("BC5") !== -1)) return "bc5";
            if (zaveg === "bc3" && (zavee.s3tc || zavee.WEBGL_compressed_texture_s3tc || zaved.indexOf("BC3") !== -1)) return "bc3";
            if (zaveg === "bc1" && (zavee.s3tc || zavee.WEBGL_compressed_texture_s3tc || zaved.indexOf("BC1") !== -1)) return "bc1";
            if (zaveg === "astc" && (zavee.astc || zavee.WEBGL_compressed_texture_astc || zaved.indexOf("ASTC") !== -1)) return "astc";
            if (zaveg === "pvrtc" && (zavee.pvrtc || zavee.WEBGL_compressed_texture_pvrtc || zavee.WEBKIT_WEBGL_compressed_texture_pvrtc || zaved.indexOf("PVRTC") !== -1)) return "pvrtc";
            if (zaveg === "etc2" && zaveb.webgl2) return "etc2";
            if (zaveg === "rgba8") return "rgba8";
        }
        return "rgba8";
    }
}

export { TextureFormatSelector };
