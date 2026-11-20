import fs from "fs";

import path from "path";

import { createHash } from "crypto";

import { minify } from "terser";

function cleanoutput(zavpa) {
    return zavpa.replace(/[ \t]+$/gm, "");
}

const zavpa = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const zavpb = "";

const zavpc = path.join(zavpa, "src");

const zavpd = fs.readFileSync(path.join(zavpc, "index.js"), "utf8");

const zavpe = [];

const zavpf = /import \* as (\w+) from "\.\/(\w+)\/index\.js";/g;

let zavpg;

while (zavpg = zavpf.exec(zavpd)) zavpe.push(zavpg[2]);

const zavph = [];

function zavpi(zavpa) {
    zavpa = zavpa.replace(/import\s[^;]*?from\s*"[^"]*";\s*\n?/g, "");
    zavpa = zavpa.replace(/export\s*\{([^}]*)\};?\s*\n?/g, (zavpa, zavpb) => {
        for (const zavpa of zavpb.split(",")) {
            const zavpb = zavpa.trim();
            if (zavpb) zavph.push(zavpb);
        }
        return "";
    });
    return zavpa;
}

const zavpj = [];

const zavpk = new Map;

const zavpl = [];

for (const zavpa of zavpe) {
    const zavpb = fs.readFileSync(path.join(zavpc, zavpa, "index.js"), "utf8");
    const zavpd = [];
    const zavpe = /export \* from "\.\/([^"]+)";/g;
    let zavpf;
    while (zavpf = zavpe.exec(zavpb)) zavpd.push(zavpf[1]);
    zavpk.set(zavpa, zavpd);
    for (const zavpb of zavpd) zavpj.push({
        id: zavpa + "/" + zavpb.replace(/\.js$/, ""),
        path: path.join(zavpc, zavpa, zavpb)
    });
}

zavpl.push({
    id: "core/facade",
    path: path.join(zavpc, "core", "facade.js")
});

zavpl.push({
    id: "core/namespace",
    path: path.join(zavpc, "core", "namespace.js")
});

function zavpm(zavpa, zavpb) {
    if (zavpb.startsWith("./")) return zavpa.split("/").slice(0, -1).join("/") + "/" + zavpb.slice(2).replace(/\.js$/, "");
    const zavpc = zavpb.replace(/\.js$/, "").split("/");
    return zavpc.slice(1).join("/");
}

const zavpn = new Map;

const zavpo = new Map;

for (const zavpa of zavpj.concat(zavpl)) {
    const zavpb = fs.readFileSync(zavpa.path, "utf8");
    const zavpc = new Set;
    const zavpd = /export\s*\{([^}]*)\};?/g;
    let zavpe;
    while (zavpe = zavpd.exec(zavpb)) for (const zavpa of zavpe[1].split(",")) {
        const zavpb = zavpa.trim();
        if (zavpb) zavpc.add(zavpb);
    }
    zavpn.set(zavpa.id, zavpc);
    for (const zavpb of zavpc) if (!zavpo.has(zavpb)) zavpo.set(zavpb, zavpa.id);
}

const zavpp = new Map;

for (const zavpa of zavpj.concat(zavpl)) {
    const zavpb = fs.readFileSync(zavpa.path, "utf8");
    const zavpc = new Set;
    const zavpd = /import\s+(?:\{([^}]*)\}|[^;]*?)\s*from\s*"([^"]+)";/g;
    let zavpe;
    while (zavpe = zavpd.exec(zavpb)) {
        const zavpb = zavpe[2];
        const zavpd = zavpm(zavpa.id, zavpb);
        const zavpf = zavpd.split("/").pop() === "index";
        if (zavpe[1]) {
            if (zavpf) {
                for (const zavpa of zavpe[1].split(",")) {
                    const zavpb = zavpa.trim().split(/\s+as\s+/)[0].trim();
                    if (zavpb && zavpo.has(zavpb)) zavpc.add(zavpo.get(zavpb));
                }
            } else if (zavpd !== zavpa.id) zavpc.add(zavpd);
        } else if (zavpf) {
            for (const zavpb of zavpk.get(zavpd.split("/")[0]) || []) {
                const zavpe = zavpd.split("/")[0] + "/" + zavpb.replace(/\.js$/, "");
                if (zavpe !== zavpa.id) zavpc.add(zavpe);
            }
        } else if (zavpd !== zavpa.id) zavpc.add(zavpd);
    }
    zavpp.set(zavpa.id, zavpc);
}

const zavpq = zavpj.concat(zavpl).map(zavpa => zavpa.id);

const zavpr = new Map(zavpj.concat(zavpl).map(zavpa => [ zavpa.id, zavpa.path ]));

const zavps = [];

const zavpt = new Map;

function zavpu(zavpa) {
    const zavpb = zavpt.get(zavpa);
    if (zavpb) return;
    zavpt.set(zavpa, 1);
    for (const zavpb of zavpp.get(zavpa)) if (zavpp.has(zavpb)) zavpu(zavpb);
    zavpt.set(zavpa, 2);
    zavps.push(zavpa);
}

for (const zavpa of zavpq) zavpu(zavpa);

const zavpv = [];

for (const zavpa of zavps) {
    const zavpb = fs.readFileSync(zavpr.get(zavpa), "utf8");
    const zavpc = zavpi(zavpb);
    if (zavpc.trim().length) zavpv.push({
        id: zavpa,
        text: zavpc
    });
}

const zavpw = zavpv.map(zavpa => zavpa.text).join("\n");

function zavpx(zavpa) {
    return createHash("md5").update(zavpa).digest("hex");
}

function zavpy() {
    const zavpa = [ "var FAOXOM = {};" ];
    for (const zavpb of zavph) zavpa.push("FAOXOM[" + JSON.stringify(zavpb) + "] = " + zavpb + ";");
    zavpa.push("FAOXOM.FaoxomJs = FaoxomJs;");
    zavpa.push("var faoxomstat = Object.getOwnPropertyNames(FaoxomJs);");
    zavpa.push("for (var faoxomsi = 0; faoxomsi < faoxomstat.length; faoxomsi++) {");
    zavpa.push("    var faoxomsk = faoxomstat[faoxomsi];");
    zavpa.push('    if (faoxomsk === "length" || faoxomsk === "name" || faoxomsk === "prototype") continue;');
    zavpa.push("    if (!FAOXOM[faoxomsk]) FAOXOM[faoxomsk] = FaoxomJs[faoxomsk];");
    zavpa.push("}");
    zavpa.push('if (typeof globalThis !== "undefined") globalThis.FAOXOM = FAOXOM;');
    return zavpa.join("\n");
}

async function zavpz() {
    fs.mkdirSync(path.join(zavpa, "dist"), {
        recursive: true
    });
    const zavpc = zavpw + "\nexport default FaoxomJs;\n";
    fs.writeFileSync(path.join(zavpa, "FaoxomJs.js"), cleanoutput(zavpc));
    const zavpd = zavpa => zavpa.trim().startsWith("if (typeof module");
    const zavpf = zavpv.map(zavpa => zavpa.text).filter(zavpa => !zavpd(zavpa));
    const zavpg = zavpb + '\n(function (root, factory) {\n    if (typeof define === "function" && define.amd) define([], factory);\n    else if (typeof module !== "undefined" && module.exports) module.exports = factory();\n    else root.FaoxomJs = factory();\n})(typeof self !== "undefined" ? self : this, function () {\n' + zavpf.join("\n") + "\n" + zavpy() + "\n    return FaoxomJs;\n});\n";
    fs.writeFileSync(path.join(zavpa, "dist", "faoxom.js"), cleanoutput(zavpg));
    const zavpi = await minify(zavpg, {
        compress: true,
        mangle: true,
        toplevel: true,
        format: {
            comments: false
        }
    });
    fs.writeFileSync(path.join(zavpa, "dist", "faoxom.min.js"), cleanoutput(zavpb + "\n" + zavpi.code + "\n"));
    const zavpj = 'export { default } from "../src/index.js";\nexport * from "../src/index.js";\n';
    fs.writeFileSync(path.join(zavpa, "dist", "faoxom.module.js"), cleanoutput(zavpj));
    const zavpk = zavpb + "\n" + zavpf.join("\n") + "\n" + zavpy() + "\nexport { " + zavph.join(", ") + ", FAOXOM };\nexport default FaoxomJs;\n";
    const zavpl = await minify(zavpk, {
        compress: true,
        mangle: true,
        module: true,
        format: {
            comments: false
        }
    });
    fs.writeFileSync(path.join(zavpa, "dist", "faoxom.module.min.js"), cleanoutput(zavpb + "\n" + zavpl.code + "\n"));
    const zavpm = [ "FaoxomJs.js", "dist/faoxom.js", "dist/faoxom.min.js", "dist/faoxom.module.js", "dist/faoxom.module.min.js" ];
    for (const zavpb of zavpm) {
        const zavpc = fs.readFileSync(path.join(zavpa, zavpb), "utf-8");
        console.log(zavpb + " | " + zavpc.length + " bytes | md5 " + zavpx(zavpc));
    }
    const zavpn = zavps.filter((zavpa, zavpb) => zavpq[zavpb] !== zavpa).length;
    console.log("folders: " + zavpe.length + " | statement files: " + zavpv.length + " | names: " + zavph.length + " | topo reorders: " + zavpn);
}

zavpz().catch(zavpa => {
    console.error("BUILD FAILED:", zavpa.message);
    process.exit(1);
});
