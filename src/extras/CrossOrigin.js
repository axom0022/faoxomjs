// CrossOrigin - SharedArrayBuffer requires COOP/COEP security headers and
// browsers disable it otherwise (Spectre mitigation). This module detects the
// page state, tells the engine exactly what to do, and generates ready to
// paste header configs for the common hosts. Everything in FaoxomJS that can
// use threads (TaskPool, SharedRingBuffer) degrades automatically to
// transferable workers when isolation is unavailable, so a misconfigured host
// costs performance, never correctness.

function currentStatus() {
    var sab = typeof SharedArrayBuffer !== "undefined";
    var isolated = false;
    try { isolated = typeof crossOriginIsolated !== "undefined" ? !!crossOriginIsolated : false; } catch (e) { isolated = false; }
    var reason;
    if (sab && isolated) reason = "isolated";
    else if (sab && !isolated) reason = "cross-origin isolation missing: send Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp";
    else if (!sab) reason = "SharedArrayBuffer unavailable in this browser context; worker pool runs in transferable fallback mode";
    return { sharedArrayBuffer: sab, crossOriginIsolated: isolated, threads: sab && isolated, reason: reason };
}

var CrossOrigin = {
    status: currentStatus,

    isThreadCapable: function () { return currentStatus().threads; },

    // Call once at boot. Returns the status and warns (once) with the exact
    // remediation when the page could have had shared memory threads.
    ensure: function (quiet) {
        var status = currentStatus();
        if (!status.threads && !quiet && typeof console !== "undefined") {
            console.warn("FaoxomJS: " + status.reason + ". See CrossOrigin.headerConfigs() for your host.");
        }
        return status;
    },

    // The exact headers every host needs.
    requiredHeaders: function () {
        return {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        };
    },

    // Ready to paste configs. COEP require-corp blocks cross-origin
    // subresources that do not opt in with CORP/CORS; the generator includes
    // the standard escape hatches and notes.
    headerConfigs: function (options) {
        options = options || {};
        var assetOrigin = options.assetOrigin || "";
        var corpLine = assetOrigin ? ", Cross-Origin-Resource-Policy: cross-origin" : "";
        return {
            vercel: {
                file: "vercel.json",
                content: JSON.stringify({
                    headers: [
                        {
                            source: "/(.*)",
                            headers: [
                                { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                                { key: "Cross-Origin-Embedder-Policy", value: "require-corp" }
                            ]
                        }
                    ]
                }, null, 4)
            },
            netlify: {
                file: "_headers",
                content: "/*\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Embedder-Policy: require-corp\n"
            },
            nginx: {
                file: "nginx.conf snippet",
                content: "add_header Cross-Origin-Opener-Policy same-origin;\nadd_header Cross-Origin-Embedder-Policy require-corp;\n# only applied to your document routes; asset origins must send CORP or CORS"
            },
            apache: {
                file: ".htaccess",
                content: "Header always set Cross-Origin-Opener-Policy \"same-origin\"\nHeader always set Cross-Origin-Embedder-Policy \"require-corp\"\n"
            },
            node: {
                file: "server.js snippet",
                content: "res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');\nres.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');\n// send before any response body"
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

    // If a page must embed third party frames/scripts that break under
    // require-corp, the document can use credentialless COEP (Chromium) and
    // keep isolation without CORP on every asset.
    credentiallessAlternative: function () {
        return {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "credentialless"
        };
    }
};

export { CrossOrigin };
