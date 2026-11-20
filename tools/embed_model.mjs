import fs from "node:fs/promises";

import path from "node:path";

import process from "node:process";

import { fileURLToPath } from "node:url";

const zavqa = [ "FaoxomJS model embedder - compile GLB models into JS code so games ship without model files.", "", "Usage:", "  node tools/embed_model.mjs <model.glb> [more.glb ...] [options]", "", "Options:", "  --name <name>        Model name for a single input (default: file name without extension)", "  --names <a,b,...>    Comma-separated names, one per input, for multiple inputs", "  --out <file.js>      Output JS file (default: <name>.model.js, or faoxom-models.js when merging)", "  --target inline      Emit an HTML <script> snippet instead of a standalone JS file", "  --inject <file.html> Insert the snippet into an HTML file (at a \x3c!--FaoxomJsModels--\x3e marker,", "                       else right after <head>, else before </body>)", "  --global <name>      Store global name (default: FaoxomJsModels)", "  --help               Show this help", "", "The generated code registers models on globalThis.FaoxomJsModels with no engine dependency.", 'Load them with: await app.loadModel("<name>") - no model file is ever fetched.' ].join("\n");

const zavqb = process.argv.slice(2);

const zavqc = [];

const zavqd = {};

for (let zavqa = 0; zavqa < zavqb.length; zavqa++) {
    const zavqe = zavqb[zavqa];
    if (zavqe === "--name") zavqd.name = zavqb[++zavqa]; else if (zavqe === "--names") zavqd.names = zavqb[++zavqa]; else if (zavqe === "--out" || zavqe === "--output") zavqd.out = zavqb[++zavqa]; else if (zavqe === "--target") zavqd.target = zavqb[++zavqa]; else if (zavqe === "--inject") zavqd.inject = zavqb[++zavqa]; else if (zavqe === "--global") zavqd.globalName = zavqb[++zavqa]; else if (zavqe === "--help" || zavqe === "-h") zavqd.help = true; else if (zavqe.startsWith("--")) {
        console.error("Unknown option: " + zavqe);
        process.exit(1);
    } else zavqc.push(zavqe);
}

function zavqe(zavqa) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(zavqa) ? "." + zavqa : "[" + JSON.stringify(zavqa) + "]";
}

function zavqf(zavqa, zavqb, zavqc) {
    const zavqd = zavqb.match(/.{1,8192}/g) || [];
    return "var store = global." + zavqc + " || (global." + zavqc + " = {});\nstore" + zavqe(zavqa) + ' = { format: "glb", data: [\n' + zavqd.map(zavqa => JSON.stringify(zavqa)).join(",\n") + '\n].join("") };';
}

async function zavqg() {
    try {
        return (await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "VERSION"), "utf8")).trim();
    } catch (zavqa) {
        return "";
    }
}

async function zavqh() {
    if (zavqd.help) {
        console.log(zavqa);
        return;
    }
    if (zavqc.length === 0) {
        console.error(zavqa);
        process.exit(1);
    }
    if (zavqd.name && zavqc.length > 1) {
        console.error("Use --names (one per input) for multiple inputs");
        process.exit(1);
    }
    const zavqb = zavqd.globalName || "FaoxomJsModels";
    let zavqe = null;
    if (zavqd.names) {
        zavqe = zavqd.names.split(",").map(zavqa => zavqa.trim()).filter(Boolean);
        if (zavqe.length !== zavqc.length) {
            console.error("--names must list exactly one name per input");
            process.exit(1);
        }
    }
    const zavqh = [];
    let zavqi = 0;
    for (let zavqa = 0; zavqa < zavqc.length; zavqa++) {
        const zavqb = zavqc[zavqa];
        const zavqf = zavqe ? zavqe[zavqa] : zavqd.name || path.basename(zavqb).replace(/\.[^.]+$/, "");
        if (!zavqf) {
            console.error("Cannot derive a model name for " + zavqb);
            process.exit(1);
        }
        const zavqg = new Uint8Array(await fs.readFile(zavqb));
        if (zavqg.length < 12 || zavqg[0] !== 103 || zavqg[1] !== 108 || zavqg[2] !== 84 || zavqg[3] !== 70) {
            console.error("Not a GLB file (missing glTF magic): " + zavqb + " - convert .gltf/.fbx/etc to GLB first");
            process.exit(1);
        }
        zavqh.push({
            name: zavqf,
            base64: Buffer.from(zavqg).toString("base64"),
            bytes: zavqg.length
        });
        zavqi += zavqg.length;
    }
    const zavqj = await zavqg();
    const zavqk = "";
    const zavql = zavqh.map(zavqa => zavqf(zavqa.name, zavqa.base64, zavqb)).join("\n");
    const zavqm = zavqk + "\n(function (global) {\n" + zavql + "\n})(globalThis);\n";
    const zavqn = "<script>\n" + zavqm + "<\/script>\n";
    if (zavqd.inject) {
        const zavqa = zavqd.inject;
        const zavqb = await fs.readFile(zavqa, "utf8");
        const zavqc = "\x3c!--FaoxomJsModels--\x3e";
        let zavqe;
        if (zavqb.indexOf(zavqc) !== -1) zavqe = zavqb.replace(zavqc, zavqn + "\n" + zavqc); else {
            const zavqa = zavqb.match(/<head[^>]*>/i);
            if (zavqa) zavqe = zavqb.slice(0, zavqa.index + zavqa[0].length) + "\n" + zavqn + zavqb.slice(zavqa.index + zavqa[0].length); else {
                const zavqa = zavqb.match(/<\/body>/i);
                if (zavqa) zavqe = zavqb.slice(0, zavqa.index) + zavqn + zavqb.slice(zavqa.index); else zavqe = zavqn + zavqb;
            }
        }
        await fs.writeFile(zavqa, zavqe, "utf8");
        console.log("Injected " + zavqh.length + " embedded model(s) into " + zavqa + " (" + zavqi + " source bytes)");
        for (const zavqa of zavqh) console.log("  " + zavqa.name + ': await app.loadModel("' + zavqa.name + '")');
        return;
    }
    if (zavqd.target === "inline") {
        if (zavqd.out) {
            await fs.writeFile(zavqd.out, zavqn, "utf8");
            console.log("Wrote inline snippet to " + zavqd.out);
        } else {
            process.stdout.write(zavqn);
        }
        for (const zavqa of zavqh) console.log("  " + zavqa.name + ': await app.loadModel("' + zavqa.name + '")');
        return;
    }
    const zavqo = zavqd.out || (zavqh.length === 1 ? zavqh[0].name + ".model.js" : "faoxom-models.js");
    await fs.writeFile(zavqo, zavqm, "utf8");
    console.log("Wrote " + zavqo + " (" + zavqh.length + " model(s), " + zavqi + " source bytes, " + zavqm.length + " code chars)");
    for (const zavqa of zavqh) console.log("  " + zavqa.name + ': await app.loadModel("' + zavqa.name + '")');
    console.log("Include it with a <script src> tag (or a bundler import) before your game code, then load by name - no model file is fetched.");
}

zavqh().catch(zavqa => {
    console.error("embed_model failed: " + (zavqa && zavqa.message ? zavqa.message : String(zavqa)));
    process.exit(1);
});
