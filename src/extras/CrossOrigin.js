function zagwa() {
    var zagwa = typeof SharedArrayBuffer !== "undefined";
    var zagwb = false;
    try {
        zagwb = typeof crossOriginIsolated !== "undefined" ? !!crossOriginIsolated : false;
    } catch (zagwa) {
        zagwb = false;
    }
    var zagwc;
    if (zagwa && zagwb) zagwc = "isolated"; else if (zagwa && !zagwb) zagwc = "cross-origin isolation missing: send Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp"; else if (!zagwa) zagwc = "SharedArrayBuffer unavailable in this browser context; worker pool runs in transferable fallback mode";
    return {
        sharedArrayBuffer: zagwa,
        crossOriginIsolated: zagwb,
        threads: zagwa && zagwb,
        reason: zagwc
    };
}

var CrossOrigin = {
    status: zagwa,
    isThreadCapable: function() {
        return zagwa().threads;
    },
    ensure: function(zagwb) {
        var zagwc = zagwa();
        if (!zagwc.threads && !zagwb && typeof console !== "undefined") {
            console.warn("FaoxomJS: " + zagwc.reason + ". See CrossOrigin.headerConfigs() for your host.");
        }
        return zagwc;
    },
    requiredHeaders: function() {
        return {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        };
    },
    headerConfigs: function(zagwa) {
        zagwa = zagwa || {};
        var zagwb = zagwa.assetOrigin || "";
        var zagwc = zagwb ? ", Cross-Origin-Resource-Policy: cross-origin" : "";
        return {
            vercel: {
                file: "vercel.json",
                content: JSON.stringify({
                    headers: [ {
                        source: "/(.*)",
                        headers: [ {
                            key: "Cross-Origin-Opener-Policy",
                            value: "same-origin"
                        }, {
                            key: "Cross-Origin-Embedder-Policy",
                            value: "require-corp"
                        } ]
                    } ]
                }, null, 4)
            },
            netlify: {
                file: "_headers",
                content: "Cross-Origin-Opener-Policy: same-origin\nCross-Origin-Embedder-Policy: require-corp\n"
            },
            nginx: {
                file: "nginx.conf snippet",
                content: "add_header Cross-Origin-Opener-Policy same-origin;\nadd_header Cross-Origin-Embedder-Policy require-corp;"
            },
            apache: {
                file: ".htaccess",
                content: 'Header always set Cross-Origin-Opener-Policy "same-origin"\nHeader always set Cross-Origin-Embedder-Policy "require-corp"\n'
            },
            node: {
                file: "server.js snippet",
                content: "res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');\nres.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');"
            },
            express: {
                file: "app.js snippet",
                content: "app.use(function (req, res, next) {\n    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');\n    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');\n    next();\n});"
            },
            devServer: {
                file: "vite/webpack dev server",
                content: "server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } }"
            }
        };
    },
    credentiallessAlternative: function() {
        return {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "credentialless"
        };
    }
};

export { CrossOrigin };
