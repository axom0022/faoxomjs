#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FaoxWriter, FaoxLoader, FAOX_VERSION } from "../src/extras/Faox.js";
import { PNGCodec } from "../src/extras/PNGCodec.js";
import { HeadlessRenderer } from "../src/extras/HeadlessRenderer.js";

var cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readVersion() {
    try {
        var pkg = JSON.parse(fs.readFileSync(path.join(cliRoot, "package.json"), "utf8"));
        return pkg.version || "0.0.0";
    } catch (error) {
        return "0.0.0";
    }
}

function usage() {
    console.log("faoxom - FaoxomJS asset and scene toolchain");
    console.log("");
    console.log("Usage:");
    console.log("  faoxom pack <input> [-o <output.faox>]   pack a scene manifest folder into a .faox container");
    console.log("  faoxom render <scene.faox> [options]     deterministic offscreen render to PNG (needs WebGPU: Node 22+ / Dawn or browser)");
    console.log("  faoxom test <scene.faox> --golden <png>  render and golden-image compare (exit 0 pass, 1 mismatch, 2 error)");
    console.log("  faoxom compare <a.png> <b.png>           pure pixel comparison, no GPU required");
    console.log("  faoxom codemod list                       list registered v5 -> v6 codemods");
    console.log("  faoxom codemod <name> <files...> [--write] apply a codemod (dry-run by default)");
    console.log("  faoxom version                           print the FaoxomJS version");
    console.log("  faoxom help                              show this help");
    console.log("");
    console.log("Render options: -o <file.png> --width N --height N --fov N --camera x,y,z");
    console.log("                --target x,y,z --hash-only --json <report.json>");
    console.log("Compare options: --per-channel N --max-mean N --max-diff-ratio R --json <report.json>");
    console.log("Test options: golden-image flags plus --update (rewrites the golden on mismatch)");
    console.log("Codemod exit codes: 0 clean or written, 1 dry-run found pending changes, 2 error.");
    console.log("Codemods rename whole identifiers (word-bounded); string literals and comments");
    console.log("containing the old name are rewritten as well - review the dry-run output first.");
    console.log("Pack input is a directory containing scene.faox.json (or a direct path to");
    console.log("a *.faox.json manifest). The manifest describes the scene graph, meshes,");
    console.log("materials, lights and clips; binary attributes, indices, textures and");
    console.log("animation tracks are referenced as relative files and become hashed,");
    console.log("deduplicated chunks in the output. Packing is deterministic: identical");
    console.log("input produces a byte-identical .faox with a stable file hash.");
}

function fail(message) {
    console.error("faoxom: " + message);
    process.exit(1);
}

function packCommand(args) {
    var input = null;
    var output = null;
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (arg === "-o" || arg === "--output") {
            if (i + 1 >= args.length) fail("-o requires a path");
            output = args[++i];
        } else if (arg === "-h" || arg === "--help" || arg === "-q" || arg === "--quiet") {
            if (arg === "-h" || arg === "--help") { usage(); process.exit(0); }
        } else if (arg.charAt(0) === "-") {
            fail("unknown option " + arg);
        } else if (input === null) {
            input = arg;
        } else if (output === null) {
            output = arg;
        } else {
            fail("unexpected argument " + arg);
        }
    }
    if (!input) { usage(); process.exit(1); }
    var inputPath = path.resolve(input);
    var stats = fs.statSync(inputPath);
    var manifestPath = stats.isDirectory() ? path.join(inputPath, "scene.faox.json") : inputPath;
    if (!fs.existsSync(manifestPath)) fail("manifest not found: " + manifestPath);
    var manifestDir = path.dirname(manifestPath);
    var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!manifest || typeof manifest !== "object") fail("manifest is not a JSON object");
    var payloads = [];
    function addPayload(fourcc, bytes) {
        var index = payloads.length + 1;
        payloads.push({ fourcc: fourcc, nameId: index, bytes: bytes });
        return index;
    }
    function readBinary(ref, what) {
        if (!ref || !ref.file) fail(what + ": missing file reference");
        var file = path.resolve(manifestDir, ref.file);
        if (!fs.existsSync(file)) fail(what + ": file not found: " + ref.file);
        return fs.readFileSync(file);
    }
    var meshes = [];
    var inputMeshes = manifest.meshes || [];
    for (var m = 0; m < inputMeshes.length; m++) {
        var inputMesh = inputMeshes[m];
        var attributes = {};
        var keys = Object.keys(inputMesh.attributes || {});
        for (var a = 0; a < keys.length; a++) {
            var attrRef = inputMesh.attributes[keys[a]];
            var bytes = readBinary(attrRef, "mesh " + m + " attribute " + keys[a]);
            if (bytes.length % 4 !== 0) fail("mesh " + m + " attribute " + keys[a] + ": f32 buffer length must be a multiple of 4");
            attributes[keys[a]] = { chunk: addPayload("buf ", bytes), itemSize: attrRef.itemSize || 3, array: "f32", count: bytes.length / 4 };
        }
        var indexRef = null;
        if (inputMesh.index) {
            var indexBytes = readBinary(inputMesh.index, "mesh " + m + " index");
            var array = inputMesh.index.array === "u32" ? "u32" : "u16";
            if (indexBytes.length % (array === "u32" ? 4 : 2) !== 0) fail("mesh " + m + " index: buffer length must match " + array);
            indexRef = { chunk: addPayload("buf ", indexBytes), array: array, count: indexBytes.length / (array === "u32" ? 4 : 2) };
        }
        meshes.push({ attributes: attributes, index: indexRef });
    }
    var textures = [];
    var inputTextures = manifest.textures || [];
    for (var t = 0; t < inputTextures.length; t++) {
        var texRef = inputTextures[t];
        var texBytes = readBinary(texRef, "texture " + t);
        textures.push({ chunk: addPayload("tex ", texBytes), mime: texRef.mime || "rgba8", width: texRef.width || 1, height: texRef.height || 1, minFilter: texRef.minFilter || "nearest", magFilter: texRef.magFilter || "nearest" });
    }
    var clips = [];
    var inputClips = manifest.clips || [];
    for (var c = 0; c < inputClips.length; c++) {
        var inputClip = inputClips[c];
        var tracks = [];
        var inputTracks = inputClip.tracks || [];
        for (var k = 0; k < inputTracks.length; k++) {
            var trackRef = inputTracks[k];
            var timesBytes = readBinary(trackRef.times, "clip " + c + " track " + k + " times");
            var valuesBytes = readBinary(trackRef.values, "clip " + c + " track " + k + " values");
            if (timesBytes.length % 4 !== 0 || valuesBytes.length % 4 !== 0) fail("clip " + c + " track " + k + ": f32 buffer length must be a multiple of 4");
            tracks.push({ name: trackRef.name || "", valueType: trackRef.valueType || "vector3", interpolation: trackRef.interpolation || "LINEAR", times: { chunk: addPayload("buf ", timesBytes), array: "f32", count: timesBytes.length / 4 }, values: { chunk: addPayload("buf ", valuesBytes), array: "f32", count: valuesBytes.length / 4 } });
        }
        clips.push({ name: inputClip.name || "clip", duration: inputClip.duration || 0, tracks: tracks });
    }
    var head = {
        format: "faox",
        version: FAOX_VERSION,
        generator: "faoxom CLI pack",
        scene: manifest.scene || { background: null, root: [] },
        meshes: meshes,
        materials: manifest.materials || [],
        textures: textures,
        lights: manifest.lights || [],
        clips: clips
    };
    var written = FaoxWriter.write(head, payloads);
    if (!output) {
        var base = path.basename(manifestPath).replace(/\.faox\.json$/, "").replace(/\.json$/, "");
        output = path.join(path.dirname(manifestPath), base + ".faox");
    }
    fs.writeFileSync(output, written.bytes);
    console.log("faoxom pack: " + written.chunkCount + " chunks, " + written.byteLength + " bytes, faox hash " + written.hash + " -> " + output);
    return written;
}

function parseFlags(args, spec) {
    var positional = [];
    var flags = {};
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (arg.charAt(0) === "-") {
            var key = arg;
            if (key.indexOf("--") === 0) key = key.slice(2);
            else key = key.slice(1);
            if (key === "h" || key === "help") { usage(); process.exit(0); }
            if (key === "hash-only" || key === "update" || key === "quiet" || key === "q") { flags[key] = true; continue; }
            if (spec.indexOf(key) === -1) fail("unknown option " + arg);
            if (i + 1 >= args.length) fail(arg + " requires a value");
            flags[key] = args[++i];
        } else {
            positional.push(arg);
        }
    }
    return { positional: positional, flags: flags };
}

function numberFlag(flags, name, fallback) {
    if (flags[name] === undefined) return fallback;
    var value = Number(flags[name]);
    if (!Number.isFinite(value)) fail("--" + name + " must be a number");
    return value;
}

function tripleFlag(flags, name, fallback) {
    if (flags[name] === undefined) return fallback;
    var parts = String(flags[name]).split(",").map(Number);
    if (parts.length !== 3 || parts.some(function (p) { return !Number.isFinite(p); })) fail("--" + name + " must be x,y,z");
    return parts;
}

function requireWebGPU() {
    if (typeof navigator === "undefined" || !navigator.gpu) {
        console.error("faoxom: WebGPU is not available in this runtime - headless rendering needs Node 22+ (Dawn) or a browser.");
        process.exit(2);
    }
}

async function renderScene(headless, scenePath, flags) {
    var bytes = fs.readFileSync(path.resolve(scenePath));
    var loader = new FaoxLoader();
    var loaded;
    try {
        loaded = loader.parse(new Uint8Array(bytes));
    } catch (error) {
        fail("scene load failed: " + error.message);
    }
    var camera = headless.defaultCamera(loaded.scene, {
        fov: numberFlag(flags, "fov", 50),
        position: tripleFlag(flags, "camera", [0, 0, 5]),
        target: tripleFlag(flags, "target", [0, 0, 0])
    });
    var png = await headless.renderToPNG(loaded.scene, camera);
    var hash = headless.pixelHash();
    return { png: png, hash: hash, loaded: loaded };
}

async function renderCommand(args) {
    var parsed = parseFlags(args, ["o", "output", "width", "height", "fov", "camera", "target", "json"]);
    if (!parsed.positional.length) { usage(); process.exit(1); }
    requireWebGPU();
    var scenePath = parsed.positional[0];
    if (!fs.existsSync(scenePath)) fail("scene not found: " + scenePath);
    var width = Math.max(1, Math.floor(numberFlag(parsed.flags, "width", 256)));
    var height = Math.max(1, Math.floor(numberFlag(parsed.flags, "height", 256)));
    var headless;
    try {
        headless = await HeadlessRenderer.create({ width: width, height: height, ledger: true });
    } catch (error) {
        fail("headless renderer init failed: " + error.message);
    }
    var result = await renderScene(headless, scenePath, parsed.flags);
    var output = parsed.flags.o || parsed.flags.output || (scenePath.replace(/\.faox$/i, "") + ".png");
    if (!parsed.flags["hash-only"]) fs.writeFileSync(output, Buffer.from(result.png));
    var report = {
        command: "render", scene: scenePath, output: parsed.flags["hash-only"] ? null : output,
        width: width, height: height, pixelHash: result.hash, byteLength: result.png.length,
        sceneHash: result.loaded.hash, ledger: headless.ledger.snapshot()
    };
    if (parsed.flags.json) fs.writeFileSync(parsed.flags.json, JSON.stringify(report, null, 2));
    console.log("faoxom render: " + width + "x" + height + " hash " + result.hash + " (" + result.png.length + " bytes" + (parsed.flags["hash-only"] ? ", hash-only" : " -> " + output) + ")");
    headless.dispose();
}

async function testCommand(args) {
    var parsed = parseFlags(args, ["golden", "width", "height", "fov", "camera", "target", "json", "per-channel", "max-mean", "max-diff-ratio"]);
    if (!parsed.positional.length) { usage(); process.exit(1); }
    if (!parsed.flags.golden) fail("--golden <png> is required");
    requireWebGPU();
    var scenePath = parsed.positional[0];
    if (!fs.existsSync(scenePath)) fail("scene not found: " + scenePath);
    if (!fs.existsSync(parsed.flags.golden)) fail("golden image not found: " + parsed.flags.golden);
    var width = Math.max(1, Math.floor(numberFlag(parsed.flags, "width", 256)));
    var height = Math.max(1, Math.floor(numberFlag(parsed.flags, "height", 256)));
    var headless;
    try {
        headless = await HeadlessRenderer.create({ width: width, height: height, ledger: true });
    } catch (error) {
        fail("headless renderer init failed: " + error.message);
    }
    var result = await renderScene(headless, scenePath, parsed.flags);
    var rendered = PNGCodec.decode(result.png);
    var golden = PNGCodec.decode(new Uint8Array(fs.readFileSync(parsed.flags.golden)));
    var comparison = PNGCodec.compare(rendered, golden, {
        perChannel: numberFlag(parsed.flags, "per-channel", 2),
        maxMean: numberFlag(parsed.flags, "max-mean", 1.0),
        maxDiffRatio: numberFlag(parsed.flags, "max-diff-ratio", 0.002)
    });
    var report = {
        command: "test", scene: scenePath, golden: parsed.flags.golden, width: width, height: height,
        pixelHash: result.hash, sceneHash: result.loaded.hash, comparison: comparison, passed: !!comparison.passed
    };
    if (parsed.flags.json) fs.writeFileSync(parsed.flags.json, JSON.stringify(report, null, 2));
    headless.dispose();
    if (!comparison.passed && parsed.flags.update) {
        fs.writeFileSync(parsed.flags.golden, Buffer.from(result.png));
        console.log("faoxom test: FAIL (golden updated per --update) hash " + result.hash + " meanDiff " + comparison.meanAbsDiff.toFixed(3) + " maxDiff " + comparison.maxAbsDiff + " diffPixels " + comparison.diffPixels);
        process.exit(1);
    }
    if (comparison.passed) {
        console.log("faoxom test: PASS hash " + result.hash + " meanDiff " + comparison.meanAbsDiff.toFixed(4) + " psnr " + (comparison.psnr === Infinity ? "inf" : comparison.psnr.toFixed(2)) + "dB");
    } else {
        console.error("faoxom test: FAIL hash " + result.hash + " meanDiff " + comparison.meanAbsDiff.toFixed(3) + " maxDiff " + comparison.maxAbsDiff + " diffPixels " + comparison.diffPixels + "/" + (width * height));
        process.exit(1);
    }
}

function compareCommand(args) {
    var parsed = parseFlags(args, ["json", "per-channel", "max-mean", "max-diff-ratio"]);
    if (parsed.positional.length !== 2) { usage(); process.exit(1); }
    for (var i = 0; i < 2; i++) if (!fs.existsSync(parsed.positional[i])) fail("image not found: " + parsed.positional[i]);
    var a, b;
    try {
        a = PNGCodec.decode(new Uint8Array(fs.readFileSync(parsed.positional[0])));
        b = PNGCodec.decode(new Uint8Array(fs.readFileSync(parsed.positional[1])));
    } catch (error) {
        fail("decode failed: " + error.message);
    }
    var comparison = PNGCodec.compare(a, b, {
        perChannel: numberFlag(parsed.flags, "per-channel", 2),
        maxMean: numberFlag(parsed.flags, "max-mean", 1.0),
        maxDiffRatio: numberFlag(parsed.flags, "max-diff-ratio", 0.002)
    });
    var report = { command: "compare", a: parsed.positional[0], b: parsed.positional[1], comparison: comparison, passed: !!comparison.passed };
    if (parsed.flags.json) fs.writeFileSync(parsed.flags.json, JSON.stringify(report, null, 2));
    if (comparison.passed) {
        console.log("faoxom compare: PASS " + a.width + "x" + a.height + " meanDiff " + comparison.meanAbsDiff.toFixed(4) + " maxDiff " + comparison.maxAbsDiff + " diffPixels " + comparison.diffPixels);
    } else {
        console.error("faoxom compare: FAIL " + (comparison.error || (a.width + "x" + a.height + " meanDiff " + comparison.meanAbsDiff.toFixed(3) + " maxDiff " + comparison.maxAbsDiff + " diffPixels " + comparison.diffPixels + "/" + (a.width * a.height))));
        process.exit(1);
    }
}

var command = process.argv[2];
function loadCodemodRegistry() {
    var registryPath = path.join(cliRoot, "codemods", "registry.json");
    try {
        return JSON.parse(fs.readFileSync(registryPath, "utf8"));
    } catch (error) {
        fail("cannot read codemods/registry.json: " + error.message);
    }
}

function codemodCommand(args) {
    var registry = loadCodemodRegistry();
    var mode = args[0];
    if (!mode || mode === "-h" || mode === "--help") { usage(); process.exit(0); }
    if (mode === "list") {
        console.log("registered codemods (codemods/registry.json v" + registry.version + "):");
        for (var i = 0; i < registry.codemods.length; i++) {
            var entry = registry.codemods[i];
            var renames = Object.keys(entry.renames).map(function (from) { return from + " -> " + entry.renames[from]; }).join(", ");
            console.log("  " + entry.name.padEnd(22) + entry.description);
            console.log("  " + " ".repeat(22) + renames);
        }
        process.exit(0);
    }
    var codemod = null;
    for (var c = 0; c < registry.codemods.length; c++) {
        if (registry.codemods[c].name === mode) codemod = registry.codemods[c];
    }
    if (!codemod) fail("unknown codemod: " + mode + " (run `faoxom codemod list`)");
    var files = [];
    var write = false;
    for (var a = 1; a < args.length; a++) {
        if (args[a] === "--write") write = true;
        else if (args[a].charAt(0) === "-") fail("unknown option " + args[a]);
        else files.push(args[a]);
    }
    if (!files.length) fail("codemod requires at least one file (glob via your shell)");
    var renames = Object.keys(codemod.renames).map(function (from) {
        return { from: from, to: codemod.renames[from], re: new RegExp("\\b" + from.replace(/\$/g, "\\$") + "\\b", "g") };
    });
    var totalPending = 0;
    var totalFiles = 0;
    for (var f = 0; f < files.length; f++) {
        var file = files[f];
        var text;
        try {
            text = fs.readFileSync(file, "utf8");
        } catch (readError) {
            fail("cannot read " + file + ": " + readError.message);
        }
        var result = text;
        var perFile = 0;
        for (var r = 0; r < renames.length; r++) {
            var matches = result.match(renames[r].re);
            if (matches) {
                perFile += matches.length;
                result = result.replace(renames[r].re, renames[r].to);
            }
        }
        if (perFile) {
            totalPending += perFile;
            totalFiles++;
            console.log((write ? "wrote    " : "pending  ") + file + " (" + perFile + " replacement" + (perFile === 1 ? "" : "s") + ")");
            if (!write) {
                var lines = result.split("\n");
                var original = text.split("\n");
                var shown = 0;
                for (var l = 0; l < lines.length && shown < 4; l++) {
                    if (lines[l] !== original[l]) {
                        console.log("    - " + original[l].trim());
                        console.log("    + " + lines[l].trim());
                        shown++;
                    }
                }
            }
        } else {
            console.log("clean    " + file);
        }
        if (write && perFile) {
            try {
                fs.writeFileSync(file, result);
            } catch (writeError) {
                fail("cannot write " + file + ": " + writeError.message);
            }
        }
    }
    if (write) {
        console.log("done: " + totalPending + " replacement" + (totalPending === 1 ? "" : "s") + " written across " + totalFiles + " file" + (totalFiles === 1 ? "" : "s"));
        process.exit(0);
    }
    if (totalPending) {
        console.log("dry-run: " + totalPending + " pending replacement" + (totalPending === 1 ? "" : "s") + " in " + totalFiles + " file" + (totalFiles === 1 ? "" : "s") + " - re-run with --write to apply");
        process.exit(1);
    }
    console.log("dry-run: no changes needed");
    process.exit(0);
}

if (command === "version") {
    console.log(readVersion());
} else if (command === "pack") {
    packCommand(process.argv.slice(3));
} else if (command === "render") {
    renderCommand(process.argv.slice(3)).catch(function (error) { console.error("faoxom: " + error.message); process.exit(2); });
} else if (command === "test") {
    testCommand(process.argv.slice(3)).catch(function (error) { console.error("faoxom: " + error.message); process.exit(2); });
} else if (command === "compare") {
    compareCommand(process.argv.slice(3));
} else if (command === "codemod") {
    codemodCommand(process.argv.slice(3));
} else if (command === "help" || command === "--help" || command === "-h" || command === undefined) {
    usage();
    if (command === undefined) process.exit(1);
} else {
    console.error("faoxom: unknown command '" + command + "'");
    usage();
    process.exit(1);
}
