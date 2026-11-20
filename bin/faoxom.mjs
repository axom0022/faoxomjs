#!/usr/bin/env node
import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";

import { FaoxWriter, FaoxLoader, FAOX_VERSION } from "../src/extras/Faox.js";

import { PNGCodec } from "../src/extras/PNGCodec.js";

import { HeadlessRenderer } from "../src/extras/HeadlessRenderer.js";

var zaaaa = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function zaaab() {
    try {
        var zaaab = JSON.parse(fs.readFileSync(path.join(zaaaa, "package.json"), "utf8"));
        return zaaab.version || "0.0.0";
    } catch (zaaaa) {
        return "0.0.0";
    }
}

function zaaac() {
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

function zaaad(zaaaa) {
    console.error("faoxom: " + zaaaa);
    process.exit(1);
}

function zaaae(zaaaa) {
    var zaaab = null;
    var zaaae = null;
    for (var zaaaf = 0; zaaaf < zaaaa.length; zaaaf++) {
        var zaaag = zaaaa[zaaaf];
        if (zaaag === "-o" || zaaag === "--output") {
            if (zaaaf + 1 >= zaaaa.length) zaaad("-o requires a path");
            zaaae = zaaaa[++zaaaf];
        } else if (zaaag === "-h" || zaaag === "--help" || zaaag === "-q" || zaaag === "--quiet") {
            if (zaaag === "-h" || zaaag === "--help") {
                zaaac();
                process.exit(0);
            }
        } else if (zaaag.charAt(0) === "-") {
            zaaad("unknown option " + zaaag);
        } else if (zaaab === null) {
            zaaab = zaaag;
        } else if (zaaae === null) {
            zaaae = zaaag;
        } else {
            zaaad("unexpected argument " + zaaag);
        }
    }
    if (!zaaab) {
        zaaac();
        process.exit(1);
    }
    var zaaah = path.resolve(zaaab);
    var zaaai = fs.statSync(zaaah);
    var zaaaj = zaaai.isDirectory() ? path.join(zaaah, "scene.faox.json") : zaaah;
    if (!fs.existsSync(zaaaj)) zaaad("manifest not found: " + zaaaj);
    var zaaak = path.dirname(zaaaj);
    var zaaal = JSON.parse(fs.readFileSync(zaaaj, "utf8"));
    if (!zaaal || typeof zaaal !== "object") zaaad("manifest is not a JSON object");
    var zaaam = [];
    function zaaan(zaaaa, zaaab) {
        var zaaac = zaaam.length + 1;
        zaaam.push({
            fourcc: zaaaa,
            nameId: zaaac,
            bytes: zaaab
        });
        return zaaac;
    }
    function zaaao(zaaaa, zaaab) {
        if (!zaaaa || !zaaaa.file) zaaad(zaaab + ": missing file reference");
        var zaaac = path.resolve(zaaak, zaaaa.file);
        if (!fs.existsSync(zaaac)) zaaad(zaaab + ": file not found: " + zaaaa.file);
        return fs.readFileSync(zaaac);
    }
    var zaaap = [];
    var zaaaq = zaaal.meshes || [];
    for (var zaaar = 0; zaaar < zaaaq.length; zaaar++) {
        var zaaas = zaaaq[zaaar];
        var zaaat = {};
        var zaaau = Object.keys(zaaas.attributes || {});
        for (var zaaav = 0; zaaav < zaaau.length; zaaav++) {
            var zaaaw = zaaas.attributes[zaaau[zaaav]];
            var zaaax = zaaao(zaaaw, "mesh " + zaaar + " attribute " + zaaau[zaaav]);
            if (zaaax.length % 4 !== 0) zaaad("mesh " + zaaar + " attribute " + zaaau[zaaav] + ": f32 buffer length must be a multiple of 4");
            zaaat[zaaau[zaaav]] = {
                chunk: zaaan("buf ", zaaax),
                itemSize: zaaaw.itemSize || 3,
                array: "f32",
                count: zaaax.length / 4
            };
        }
        var zaaay = null;
        if (zaaas.index) {
            var zaaaz = zaaao(zaaas.index, "mesh " + zaaar + " index");
            var zaaaaa = zaaas.index.array === "u32" ? "u32" : "u16";
            if (zaaaz.length % (zaaaaa === "u32" ? 4 : 2) !== 0) zaaad("mesh " + zaaar + " index: buffer length must match " + zaaaaa);
            zaaay = {
                chunk: zaaan("buf ", zaaaz),
                array: zaaaaa,
                count: zaaaz.length / (zaaaaa === "u32" ? 4 : 2)
            };
        }
        zaaap.push({
            attributes: zaaat,
            index: zaaay
        });
    }
    var zaaaab = [];
    var zaaaac = zaaal.textures || [];
    for (var zaaaad = 0; zaaaad < zaaaac.length; zaaaad++) {
        var zaaaae = zaaaac[zaaaad];
        var zaaaaf = zaaao(zaaaae, "texture " + zaaaad);
        zaaaab.push({
            chunk: zaaan("tex ", zaaaaf),
            mime: zaaaae.mime || "rgba8",
            width: zaaaae.width || 1,
            height: zaaaae.height || 1,
            minFilter: zaaaae.minFilter || "nearest",
            magFilter: zaaaae.magFilter || "nearest"
        });
    }
    var zaaaag = [];
    var zaaaah = zaaal.clips || [];
    for (var zaaaai = 0; zaaaai < zaaaah.length; zaaaai++) {
        var zaaaaj = zaaaah[zaaaai];
        var zaaaak = [];
        var zaaaal = zaaaaj.tracks || [];
        for (var zaaaam = 0; zaaaam < zaaaal.length; zaaaam++) {
            var zaaaan = zaaaal[zaaaam];
            var zaaaao = zaaao(zaaaan.times, "clip " + zaaaai + " track " + zaaaam + " times");
            var zaaaap = zaaao(zaaaan.values, "clip " + zaaaai + " track " + zaaaam + " values");
            if (zaaaao.length % 4 !== 0 || zaaaap.length % 4 !== 0) zaaad("clip " + zaaaai + " track " + zaaaam + ": f32 buffer length must be a multiple of 4");
            zaaaak.push({
                name: zaaaan.name || "",
                valueType: zaaaan.valueType || "vector3",
                interpolation: zaaaan.interpolation || "LINEAR",
                times: {
                    chunk: zaaan("buf ", zaaaao),
                    array: "f32",
                    count: zaaaao.length / 4
                },
                values: {
                    chunk: zaaan("buf ", zaaaap),
                    array: "f32",
                    count: zaaaap.length / 4
                }
            });
        }
        zaaaag.push({
            name: zaaaaj.name || "clip",
            duration: zaaaaj.duration || 0,
            tracks: zaaaak
        });
    }
    var zaaaaq = {
        format: "faox",
        version: FAOX_VERSION,
        generator: "faoxom CLI pack",
        scene: zaaal.scene || {
            background: null,
            root: []
        },
        meshes: zaaap,
        materials: zaaal.materials || [],
        textures: zaaaab,
        lights: zaaal.lights || [],
        clips: zaaaag
    };
    var zaaaar = FaoxWriter.write(zaaaaq, zaaam);
    if (!zaaae) {
        var zaaaas = path.basename(zaaaj).replace(/\.faox\.json$/, "").replace(/\.json$/, "");
        zaaae = path.join(path.dirname(zaaaj), zaaaas + ".faox");
    }
    fs.writeFileSync(zaaae, zaaaar.bytes);
    console.log("faoxom pack: " + zaaaar.chunkCount + " chunks, " + zaaaar.byteLength + " bytes, faox hash " + zaaaar.hash + " -> " + zaaae);
    return zaaaar;
}

function zaaaf(zaaaa, zaaab) {
    var zaaae = [];
    var zaaaf = {};
    for (var zaaag = 0; zaaag < zaaaa.length; zaaag++) {
        var zaaah = zaaaa[zaaag];
        if (zaaah.charAt(0) === "-") {
            var zaaai = zaaah;
            if (zaaai.indexOf("--") === 0) zaaai = zaaai.slice(2); else zaaai = zaaai.slice(1);
            if (zaaai === "h" || zaaai === "help") {
                zaaac();
                process.exit(0);
            }
            if (zaaai === "hash-only" || zaaai === "update" || zaaai === "quiet" || zaaai === "q") {
                zaaaf[zaaai] = true;
                continue;
            }
            if (zaaab.indexOf(zaaai) === -1) zaaad("unknown option " + zaaah);
            if (zaaag + 1 >= zaaaa.length) zaaad(zaaah + " requires a value");
            zaaaf[zaaai] = zaaaa[++zaaag];
        } else {
            zaaae.push(zaaah);
        }
    }
    return {
        positional: zaaae,
        flags: zaaaf
    };
}

function zaaag(zaaaa, zaaab, zaaac) {
    if (zaaaa[zaaab] === undefined) return zaaac;
    var zaaae = Number(zaaaa[zaaab]);
    if (!Number.isFinite(zaaae)) zaaad("--" + zaaab + " must be a number");
    return zaaae;
}

function zaaah(zaaaa, zaaab, zaaac) {
    if (zaaaa[zaaab] === undefined) return zaaac;
    var zaaae = String(zaaaa[zaaab]).split(",").map(Number);
    if (zaaae.length !== 3 || zaaae.some(function(zaaaa) {
        return !Number.isFinite(zaaaa);
    })) zaaad("--" + zaaab + " must be x,y,z");
    return zaaae;
}

function zaaai() {
    if (typeof navigator === "undefined" || !navigator.gpu) {
        console.error("faoxom: WebGPU is not available in this runtime - headless rendering needs Node 22+ (Dawn) or a browser.");
        process.exit(2);
    }
}

async function zaaaj(zaaaa, zaaab, zaaac) {
    var zaaae = fs.readFileSync(path.resolve(zaaab));
    var zaaaf = new FaoxLoader;
    var zaaai;
    try {
        zaaai = zaaaf.parse(new Uint8Array(zaaae));
    } catch (zaaaa) {
        zaaad("scene load failed: " + zaaaa.message);
    }
    var zaaaj = zaaaa.defaultCamera(zaaai.scene, {
        fov: zaaag(zaaac, "fov", 50),
        position: zaaah(zaaac, "camera", [ 0, 0, 5 ]),
        target: zaaah(zaaac, "target", [ 0, 0, 0 ])
    });
    var zaaak = await zaaaa.renderToPNG(zaaai.scene, zaaaj);
    var zaaal = zaaaa.pixelHash();
    return {
        png: zaaak,
        hash: zaaal,
        loaded: zaaai
    };
}

async function zaaak(zaaaa) {
    var zaaab = zaaaf(zaaaa, [ "o", "output", "width", "height", "fov", "camera", "target", "json" ]);
    if (!zaaab.positional.length) {
        zaaac();
        process.exit(1);
    }
    zaaai();
    var zaaae = zaaab.positional[0];
    if (!fs.existsSync(zaaae)) zaaad("scene not found: " + zaaae);
    var zaaah = Math.max(1, Math.floor(zaaag(zaaab.flags, "width", 256)));
    var zaaak = Math.max(1, Math.floor(zaaag(zaaab.flags, "height", 256)));
    var zaaal;
    try {
        zaaal = await HeadlessRenderer.create({
            width: zaaah,
            height: zaaak,
            ledger: true
        });
    } catch (zaaaa) {
        zaaad("headless renderer init failed: " + zaaaa.message);
    }
    var zaaam = await zaaaj(zaaal, zaaae, zaaab.flags);
    var zaaan = zaaab.flags.o || zaaab.flags.output || zaaae.replace(/\.faox$/i, "") + ".png";
    if (!zaaab.flags["hash-only"]) fs.writeFileSync(zaaan, Buffer.from(zaaam.png));
    var zaaao = {
        command: "render",
        scene: zaaae,
        output: zaaab.flags["hash-only"] ? null : zaaan,
        width: zaaah,
        height: zaaak,
        pixelHash: zaaam.hash,
        byteLength: zaaam.png.length,
        sceneHash: zaaam.loaded.hash,
        ledger: zaaal.ledger.snapshot()
    };
    if (zaaab.flags.json) fs.writeFileSync(zaaab.flags.json, JSON.stringify(zaaao, null, 2));
    console.log("faoxom render: " + zaaah + "x" + zaaak + " hash " + zaaam.hash + " (" + zaaam.png.length + " bytes" + (zaaab.flags["hash-only"] ? ", hash-only" : " -> " + zaaan) + ")");
    zaaal.dispose();
}

async function zaaal(zaaaa) {
    var zaaab = zaaaf(zaaaa, [ "golden", "width", "height", "fov", "camera", "target", "json", "per-channel", "max-mean", "max-diff-ratio" ]);
    if (!zaaab.positional.length) {
        zaaac();
        process.exit(1);
    }
    if (!zaaab.flags.golden) zaaad("--golden <png> is required");
    zaaai();
    var zaaae = zaaab.positional[0];
    if (!fs.existsSync(zaaae)) zaaad("scene not found: " + zaaae);
    if (!fs.existsSync(zaaab.flags.golden)) zaaad("golden image not found: " + zaaab.flags.golden);
    var zaaah = Math.max(1, Math.floor(zaaag(zaaab.flags, "width", 256)));
    var zaaak = Math.max(1, Math.floor(zaaag(zaaab.flags, "height", 256)));
    var zaaal;
    try {
        zaaal = await HeadlessRenderer.create({
            width: zaaah,
            height: zaaak,
            ledger: true
        });
    } catch (zaaaa) {
        zaaad("headless renderer init failed: " + zaaaa.message);
    }
    var zaaam = await zaaaj(zaaal, zaaae, zaaab.flags);
    var zaaan = PNGCodec.decode(zaaam.png);
    var zaaao = PNGCodec.decode(new Uint8Array(fs.readFileSync(zaaab.flags.golden)));
    var zaaap = PNGCodec.compare(zaaan, zaaao, {
        perChannel: zaaag(zaaab.flags, "per-channel", 2),
        maxMean: zaaag(zaaab.flags, "max-mean", 1),
        maxDiffRatio: zaaag(zaaab.flags, "max-diff-ratio", .002)
    });
    var zaaaq = {
        command: "test",
        scene: zaaae,
        golden: zaaab.flags.golden,
        width: zaaah,
        height: zaaak,
        pixelHash: zaaam.hash,
        sceneHash: zaaam.loaded.hash,
        comparison: zaaap,
        passed: !!zaaap.passed
    };
    if (zaaab.flags.json) fs.writeFileSync(zaaab.flags.json, JSON.stringify(zaaaq, null, 2));
    zaaal.dispose();
    if (!zaaap.passed && zaaab.flags.update) {
        fs.writeFileSync(zaaab.flags.golden, Buffer.from(zaaam.png));
        console.log("faoxom test: FAIL (golden updated per --update) hash " + zaaam.hash + " meanDiff " + zaaap.meanAbsDiff.toFixed(3) + " maxDiff " + zaaap.maxAbsDiff + " diffPixels " + zaaap.diffPixels);
        process.exit(1);
    }
    if (zaaap.passed) {
        console.log("faoxom test: PASS hash " + zaaam.hash + " meanDiff " + zaaap.meanAbsDiff.toFixed(4) + " psnr " + (zaaap.psnr === Infinity ? "inf" : zaaap.psnr.toFixed(2)) + "dB");
    } else {
        console.error("faoxom test: FAIL hash " + zaaam.hash + " meanDiff " + zaaap.meanAbsDiff.toFixed(3) + " maxDiff " + zaaap.maxAbsDiff + " diffPixels " + zaaap.diffPixels + "/" + zaaah * zaaak);
        process.exit(1);
    }
}

function zaaam(zaaaa) {
    var zaaab = zaaaf(zaaaa, [ "json", "per-channel", "max-mean", "max-diff-ratio" ]);
    if (zaaab.positional.length !== 2) {
        zaaac();
        process.exit(1);
    }
    for (var zaaae = 0; zaaae < 2; zaaae++) if (!fs.existsSync(zaaab.positional[zaaae])) zaaad("image not found: " + zaaab.positional[zaaae]);
    var zaaah, zaaai;
    try {
        zaaah = PNGCodec.decode(new Uint8Array(fs.readFileSync(zaaab.positional[0])));
        zaaai = PNGCodec.decode(new Uint8Array(fs.readFileSync(zaaab.positional[1])));
    } catch (zaaaa) {
        zaaad("decode failed: " + zaaaa.message);
    }
    var zaaaj = PNGCodec.compare(zaaah, zaaai, {
        perChannel: zaaag(zaaab.flags, "per-channel", 2),
        maxMean: zaaag(zaaab.flags, "max-mean", 1),
        maxDiffRatio: zaaag(zaaab.flags, "max-diff-ratio", .002)
    });
    var zaaak = {
        command: "compare",
        a: zaaab.positional[0],
        b: zaaab.positional[1],
        comparison: zaaaj,
        passed: !!zaaaj.passed
    };
    if (zaaab.flags.json) fs.writeFileSync(zaaab.flags.json, JSON.stringify(zaaak, null, 2));
    if (zaaaj.passed) {
        console.log("faoxom compare: PASS " + zaaah.width + "x" + zaaah.height + " meanDiff " + zaaaj.meanAbsDiff.toFixed(4) + " maxDiff " + zaaaj.maxAbsDiff + " diffPixels " + zaaaj.diffPixels);
    } else {
        console.error("faoxom compare: FAIL " + (zaaaj.error || zaaah.width + "x" + zaaah.height + " meanDiff " + zaaaj.meanAbsDiff.toFixed(3) + " maxDiff " + zaaaj.maxAbsDiff + " diffPixels " + zaaaj.diffPixels + "/" + zaaah.width * zaaah.height));
        process.exit(1);
    }
}

var zaaan = process.argv[2];

function zaaao() {
    var zaaab = path.join(zaaaa, "codemods", "registry.json");
    try {
        return JSON.parse(fs.readFileSync(zaaab, "utf8"));
    } catch (zaaaa) {
        zaaad("cannot read codemods/registry.json: " + zaaaa.message);
    }
}

function zaaap(zaaaa) {
    var zaaab = zaaao();
    var zaaae = zaaaa[0];
    if (!zaaae || zaaae === "-h" || zaaae === "--help") {
        zaaac();
        process.exit(0);
    }
    if (zaaae === "list") {
        console.log("registered codemods (codemods/registry.json v" + zaaab.version + "):");
        for (var zaaaf = 0; zaaaf < zaaab.codemods.length; zaaaf++) {
            var zaaag = zaaab.codemods[zaaaf];
            var zaaah = Object.keys(zaaag.renames).map(function(zaaaa) {
                return zaaaa + " -> " + zaaag.renames[zaaaa];
            }).join(", ");
            console.log("  " + zaaag.name.padEnd(22) + zaaag.description);
            console.log("  " + " ".repeat(22) + zaaah);
        }
        process.exit(0);
    }
    var zaaai = null;
    for (var zaaaj = 0; zaaaj < zaaab.codemods.length; zaaaj++) {
        if (zaaab.codemods[zaaaj].name === zaaae) zaaai = zaaab.codemods[zaaaj];
    }
    if (!zaaai) zaaad("unknown codemod: " + zaaae + " (run `faoxom codemod list`)");
    var zaaak = [];
    var zaaal = false;
    for (var zaaam = 1; zaaam < zaaaa.length; zaaam++) {
        if (zaaaa[zaaam] === "--write") zaaal = true; else if (zaaaa[zaaam].charAt(0) === "-") zaaad("unknown option " + zaaaa[zaaam]); else zaaak.push(zaaaa[zaaam]);
    }
    if (!zaaak.length) zaaad("codemod requires at least one file (glob via your shell)");
    var zaaah = Object.keys(zaaai.renames).map(function(zaaaa) {
        return {
            from: zaaaa,
            to: zaaai.renames[zaaaa],
            re: new RegExp("\\b" + zaaaa.replace(/\$/g, "\\$") + "\\b", "g")
        };
    });
    var zaaan = 0;
    var zaaap = 0;
    for (var zaaaq = 0; zaaaq < zaaak.length; zaaaq++) {
        var zaaar = zaaak[zaaaq];
        var zaaas;
        try {
            zaaas = fs.readFileSync(zaaar, "utf8");
        } catch (zaaaa) {
            zaaad("cannot read " + zaaar + ": " + zaaaa.message);
        }
        var zaaat = zaaas;
        var zaaau = 0;
        for (var zaaav = 0; zaaav < zaaah.length; zaaav++) {
            var zaaaw = zaaat.match(zaaah[zaaav].re);
            if (zaaaw) {
                zaaau += zaaaw.length;
                zaaat = zaaat.replace(zaaah[zaaav].re, zaaah[zaaav].to);
            }
        }
        if (zaaau) {
            zaaan += zaaau;
            zaaap++;
            console.log((zaaal ? "wrote    " : "pending  ") + zaaar + " (" + zaaau + " replacement" + (zaaau === 1 ? "" : "s") + ")");
            if (!zaaal) {
                var zaaax = zaaat.split("\n");
                var zaaay = zaaas.split("\n");
                var zaaaz = 0;
                for (var zaaaaa = 0; zaaaaa < zaaax.length && zaaaz < 4; zaaaaa++) {
                    if (zaaax[zaaaaa] !== zaaay[zaaaaa]) {
                        console.log("    - " + zaaay[zaaaaa].trim());
                        console.log("    + " + zaaax[zaaaaa].trim());
                        zaaaz++;
                    }
                }
            }
        } else {
            console.log("clean    " + zaaar);
        }
        if (zaaal && zaaau) {
            try {
                fs.writeFileSync(zaaar, zaaat);
            } catch (zaaaa) {
                zaaad("cannot write " + zaaar + ": " + zaaaa.message);
            }
        }
    }
    if (zaaal) {
        console.log("done: " + zaaan + " replacement" + (zaaan === 1 ? "" : "s") + " written across " + zaaap + " file" + (zaaap === 1 ? "" : "s"));
        process.exit(0);
    }
    if (zaaan) {
        console.log("dry-run: " + zaaan + " pending replacement" + (zaaan === 1 ? "" : "s") + " in " + zaaap + " file" + (zaaap === 1 ? "" : "s") + " - re-run with --write to apply");
        process.exit(1);
    }
    console.log("dry-run: no changes needed");
    process.exit(0);
}

if (zaaan === "version") {
    console.log(zaaab());
} else if (zaaan === "pack") {
    zaaae(process.argv.slice(3));
} else if (zaaan === "render") {
    zaaak(process.argv.slice(3)).catch(function(zaaaa) {
        console.error("faoxom: " + zaaaa.message);
        process.exit(2);
    });
} else if (zaaan === "test") {
    zaaal(process.argv.slice(3)).catch(function(zaaaa) {
        console.error("faoxom: " + zaaaa.message);
        process.exit(2);
    });
} else if (zaaan === "compare") {
    zaaam(process.argv.slice(3));
} else if (zaaan === "codemod") {
    zaaap(process.argv.slice(3));
} else if (zaaan === "help" || zaaan === "--help" || zaaan === "-h" || zaaan === undefined) {
    zaaac();
    if (zaaan === undefined) process.exit(1);
} else {
    console.error("faoxom: unknown command '" + zaaan + "'");
    zaaac();
    process.exit(1);
}
