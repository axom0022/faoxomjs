import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HELP = [
    "FaoxomJS model embedder - compile GLB models into JS code so games ship without model files.",
    "",
    "Usage:",
    "  node tools/embed_model.mjs <model.glb> [more.glb ...] [options]",
    "",
    "Options:",
    "  --name <name>        Model name for a single input (default: file name without extension)",
    "  --names <a,b,...>    Comma-separated names, one per input, for multiple inputs",
    "  --out <file.js>      Output JS file (default: <name>.model.js, or faoxom-models.js when merging)",
    "  --target inline      Emit an HTML <script> snippet instead of a standalone JS file",
    "  --inject <file.html> Insert the snippet into an HTML file (at a <!--FaoxomJsModels--> marker,",
    "                       else right after <head>, else before </body>)",
    "  --global <name>      Store global name (default: FaoxomJsModels)",
    "  --help               Show this help",
    "",
    "The generated code registers models on globalThis.FaoxomJsModels with no engine dependency.",
    "Load them with: await app.loadModel(\"<name>\") - no model file is ever fetched."
].join("\n");

const args = process.argv.slice(2);
const inputs = [];
const flags = {};
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--name") flags.name = args[++i];
    else if (arg === "--names") flags.names = args[++i];
    else if (arg === "--out" || arg === "--output") flags.out = args[++i];
    else if (arg === "--target") flags.target = args[++i];
    else if (arg === "--inject") flags.inject = args[++i];
    else if (arg === "--global") flags.globalName = args[++i];
    else if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg.startsWith("--")) { console.error("Unknown option: " + arg); process.exit(1); }
    else inputs.push(arg);
}

function identifierAccess(name) {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? "." + name : "[" + JSON.stringify(name) + "]";
}

function modelBody(name, base64, globalName) {
    const chunks = base64.match(/.{1,8192}/g) || [];
    return "var store = global." + globalName + " || (global." + globalName + " = {});\nstore" + identifierAccess(name) + " = { format: \"glb\", data: [\n" + chunks.map(chunk => JSON.stringify(chunk)).join(",\n") + "\n].join(\"\") };";
}

async function readVersion() {
    try {
        return (await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "VERSION"), "utf8")).trim();
    } catch (error) {
        return "";
    }
}

async function main() {
    if (flags.help) { console.log(HELP); return; }
    if (inputs.length === 0) { console.error(HELP); process.exit(1); }
    if (flags.name && inputs.length > 1) { console.error("Use --names (one per input) for multiple inputs"); process.exit(1); }
    const globalName = flags.globalName || "FaoxomJsModels";
    let providedNames = null;
    if (flags.names) {
        providedNames = flags.names.split(",").map(entry => entry.trim()).filter(Boolean);
        if (providedNames.length !== inputs.length) { console.error("--names must list exactly one name per input"); process.exit(1); }
    }
    const models = [];
    let totalBytes = 0;
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const name = providedNames ? providedNames[i] : (flags.name || path.basename(input).replace(/\.[^.]+$/, ""));
        if (!name) { console.error("Cannot derive a model name for " + input); process.exit(1); }
        const bytes = new Uint8Array(await fs.readFile(input));
        if (bytes.length < 12 || bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) {
            console.error("Not a GLB file (missing glTF magic): " + input + " - convert .gltf/.fbx/etc to GLB first");
            process.exit(1);
        }
        models.push({ name: name, base64: Buffer.from(bytes).toString("base64"), bytes: bytes.length });
        totalBytes += bytes.length;
    }
    const version = await readVersion();
    const banner = "/*! FaoxomJS" + (version ? " " + version : "") + " embedded model" + (models.length > 1 ? "s" : "") + ": " + models.map(model => model.name).join(", ") + " | " + totalBytes + " bytes */";
    const bodies = models.map(model => modelBody(model.name, model.base64, globalName)).join("\n");
    const code = banner + "\n(function (global) {\n" + bodies + "\n})(globalThis);\n";
    const html = "<script>\n" + code + "</script>\n";
    if (flags.inject) {
        const htmlPath = flags.inject;
        const text = await fs.readFile(htmlPath, "utf8");
        const marker = "<!--FaoxomJsModels-->";
        let updated;
        if (text.indexOf(marker) !== -1) updated = text.replace(marker, html + "\n" + marker);
        else {
            const headMatch = text.match(/<head[^>]*>/i);
            if (headMatch) updated = text.slice(0, headMatch.index + headMatch[0].length) + "\n" + html + text.slice(headMatch.index + headMatch[0].length);
            else {
                const bodyMatch = text.match(/<\/body>/i);
                if (bodyMatch) updated = text.slice(0, bodyMatch.index) + html + text.slice(bodyMatch.index);
                else updated = html + text;
            }
        }
        await fs.writeFile(htmlPath, updated, "utf8");
        console.log("Injected " + models.length + " embedded model(s) into " + htmlPath + " (" + totalBytes + " source bytes)");
        for (const model of models) console.log("  " + model.name + ": await app.loadModel(\"" + model.name + "\")");
        return;
    }
    if (flags.target === "inline") {
        if (flags.out) {
            await fs.writeFile(flags.out, html, "utf8");
            console.log("Wrote inline snippet to " + flags.out);
        } else {
            process.stdout.write(html);
        }
        for (const model of models) console.log("  " + model.name + ": await app.loadModel(\"" + model.name + "\")");
        return;
    }
    const outPath = flags.out || (models.length === 1 ? models[0].name + ".model.js" : "faoxom-models.js");
    await fs.writeFile(outPath, code, "utf8");
    console.log("Wrote " + outPath + " (" + models.length + " model(s), " + totalBytes + " source bytes, " + code.length + " code chars)");
    for (const model of models) console.log("  " + model.name + ": await app.loadModel(\"" + model.name + "\")");
    console.log("Include it with a <script src> tag (or a bundler import) before your game code, then load by name - no model file is fetched.");
}
main().catch(error => {
    console.error("embed_model failed: " + (error && error.message ? error.message : String(error)));
    process.exit(1);
});
