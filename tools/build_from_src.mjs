import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { minify } from "terser";

const rootdir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const banner = "/*! FaoxomJS v6 | https://github.com/axom0022/faoxomjs */";

const srcdir = path.join(rootdir, "src");
const indexText = fs.readFileSync(path.join(srcdir, "index.js"), "utf8");
const folderorder = [];
const folderre = /import \* as (\w+) from "\.\/(\w+)\/index\.js";/g;
let fm;
while ((fm = folderre.exec(indexText))) folderorder.push(fm[2]);

const allnames = [];

function stripfile(text) {
    text = text.replace(/import\s[^;]*?from\s*"[^"]*";\s*\n?/g, "");
    text = text.replace(/export\s*\{([^}]*)\};?\s*\n?/g, (whole, inner) => {
        for (const name of inner.split(",")) {
            const n = name.trim();
            if (n) allnames.push(n);
        }
        return "";
    });
    return text;
}

const orderedfiles = [];
const barrelmembers = new Map();
const extraorder = [];
for (const folder of folderorder) {
    const barrel = fs.readFileSync(path.join(srcdir, folder, "index.js"), "utf8");
    const files = [];
    const bre = /export \* from "\.\/([^"]+)";/g;
    let bm;
    while ((bm = bre.exec(barrel))) files.push(bm[1]);
    barrelmembers.set(folder, files);
    for (const f of files) orderedfiles.push({ id: folder + "/" + f.replace(/\.js$/, ""), path: path.join(srcdir, folder, f) });
}
extraorder.push({ id: "core/facade", path: path.join(srcdir, "core", "facade.js") });
extraorder.push({ id: "core/namespace", path: path.join(srcdir, "core", "namespace.js") });

function resolveSpec(fromId, spec) {
    if (spec.startsWith("./")) return fromId.split("/").slice(0, -1).join("/") + "/" + spec.slice(2).replace(/\.js$/, "");
    const parts = spec.replace(/\.js$/, "").split("/");
    return parts.slice(1).join("/");
}

const exportnames = new Map();
const nameowner = new Map();
for (const item of orderedfiles.concat(extraorder)) {
    const text = fs.readFileSync(item.path, "utf8");
    const names = new Set();
    const ere = /export\s*\{([^}]*)\};?/g;
    let em;
    while ((em = ere.exec(text))) for (const n of em[1].split(",")) {
        const t = n.trim();
        if (t) names.add(t);
    }
    exportnames.set(item.id, names);
    for (const n of names) if (!nameowner.has(n)) nameowner.set(n, item.id);
}

const deps = new Map();
for (const item of orderedfiles.concat(extraorder)) {
    const text = fs.readFileSync(item.path, "utf8");
    const targets = new Set();
    const ire = /import\s+(?:\{([^}]*)\}|[^;]*?)\s*from\s*"([^"]+)";/g;
    let im;
    while ((im = ire.exec(text))) {
        const spec = im[2];
        const target = resolveSpec(item.id, spec);
        const isbarrel = target.split("/").pop() === "index";
        if (im[1]) {
            if (isbarrel) {
                for (const n of im[1].split(",")) {
                    const t = n.trim().split(/\s+as\s+/)[0].trim();
                    if (t && nameowner.has(t)) targets.add(nameowner.get(t));
                }
            } else if (target !== item.id) targets.add(target);
        } else if (isbarrel) {
            for (const f of (barrelmembers.get(target.split("/")[0]) || [])) {
                const tid = target.split("/")[0] + "/" + f.replace(/\.js$/, "");
                if (tid !== item.id) targets.add(tid);
            }
        } else if (target !== item.id) targets.add(target);
    }
    deps.set(item.id, targets);
}

const allids = orderedfiles.concat(extraorder).map(i => i.id);
const pathbyid = new Map(orderedfiles.concat(extraorder).map(i => [i.id, i.path]));
const emitted = [];
const visitstate = new Map();
function visit(id) {
    const st = visitstate.get(id);
    if (st) return;
    visitstate.set(id, 1);
    for (const d of deps.get(id)) if (deps.has(d)) visit(d);
    visitstate.set(id, 2);
    emitted.push(id);
}
for (const id of allids) visit(id);

const statements = [];
for (const id of emitted) {
    const text = fs.readFileSync(pathbyid.get(id), "utf8");
    const stripped = stripfile(text);
    if (stripped.trim().length) statements.push({ id: id, text: stripped });
}

const body = statements.map(s => s.text).join("\n");

function md5(text) {
    return createHash("md5").update(text).digest("hex");
}

function faoxomBlock() {
    const lines = ["var FAOXOM = {};"];
    for (const n of allnames) lines.push("FAOXOM[" + JSON.stringify(n) + "] = " + n + ";");
    lines.push("FAOXOM.FaoxomJs = FaoxomJs;");
    lines.push("var faoxomstat = Object.getOwnPropertyNames(FaoxomJs);");
    lines.push("for (var faoxomsi = 0; faoxomsi < faoxomstat.length; faoxomsi++) {");
    lines.push("    var faoxomsk = faoxomstat[faoxomsi];");
    lines.push("    if (faoxomsk === \"length\" || faoxomsk === \"name\" || faoxomsk === \"prototype\") continue;");
    lines.push("    if (!FAOXOM[faoxomsk]) FAOXOM[faoxomsk] = FaoxomJs[faoxomsk];");
    lines.push("}");
    lines.push("if (typeof globalThis !== \"undefined\") globalThis.FAOXOM = FAOXOM;");
    return lines.join("\n");
}

async function main() {
    fs.mkdirSync(path.join(rootdir, "dist"), { recursive: true });

    const rootText = body + "\nexport default FaoxomJs;\n";
    fs.writeFileSync(path.join(rootdir, "FaoxomJs.js"), rootText);

    const isShimLine = t => t.trim().startsWith("if (typeof module");
    const bundleStmts = statements.map(s => s.text).filter(t => !isShimLine(t));
    const umdText = banner + "\n(function (root, factory) {\n    if (typeof define === \"function\" && define.amd) define([], factory);\n    else if (typeof module !== \"undefined\" && module.exports) module.exports = factory();\n    else root.FaoxomJs = factory();\n})(typeof self !== \"undefined\" ? self : this, function () {\n" + bundleStmts.join("\n") + "\n" + faoxomBlock() + "\n    return FaoxomJs;\n});\n";
    fs.writeFileSync(path.join(rootdir, "dist", "faoxom.js"), umdText);

    const minResult = await minify(umdText, { compress: true, mangle: true, toplevel: true, format: { comments: /^!/ } });
    fs.writeFileSync(path.join(rootdir, "dist", "faoxom.min.js"), banner + "\n" + minResult.code + "\n");

    const moduleShim = "export { default } from \"../src/index.js\";\nexport * from \"../src/index.js\";\n";
    fs.writeFileSync(path.join(rootdir, "dist", "faoxom.module.js"), moduleShim);

    const moduleText = banner + "\n" + bundleStmts.join("\n") + "\n" + faoxomBlock() + "\nexport { " + allnames.join(", ") + ", FAOXOM };\nexport default FaoxomJs;\n";
    const moduleMinResult = await minify(moduleText, { compress: true, mangle: true, module: true, format: { comments: /^!/ } });
    fs.writeFileSync(path.join(rootdir, "dist", "faoxom.module.min.js"), banner + "\n" + moduleMinResult.code + "\n");

    const outputs = ["FaoxomJs.js", "dist/faoxom.js", "dist/faoxom.min.js", "dist/faoxom.module.js", "dist/faoxom.module.min.js"];
    for (const o of outputs) {
        const t = fs.readFileSync(path.join(rootdir, o), "utf-8");
        console.log(o + " | " + t.length + " bytes | md5 " + md5(t));
    }
    const reordercount = emitted.filter((id, i) => allids[i] !== id).length;
    console.log("folders: " + folderorder.length + " | statement files: " + statements.length + " | names: " + allnames.length + " | topo reorders: " + reordercount);
}

main().catch(e => { console.error("BUILD FAILED:", e.message); process.exit(1); });
