import { faoxomexrinterleavescalar } from "./faoxomexrinterleavescalar.js";
import { faoxomexrpredictor } from "./faoxomexrpredictor.js";
import { faoxomexrrledecompress } from "./faoxomexrrledecompress.js";
import { faoxomfbxinflate } from "./faoxomfbxinflate.js";
import { faoxomhalftofloat } from "./faoxomhalftofloat.js";

async function faoxomdecodeexr(buffer) {
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 8 || view.getUint32(0, true) !== 20000630) throw new Error("Not an OpenEXR file");
    var versionWord = view.getUint32(4, true);
    if (versionWord & 0x200) throw new Error("Tiled EXR files are not supported");
    if (versionWord & 0x400) throw new Error("Deep EXR files are not supported");
    if (versionWord & 0x1000) throw new Error("Multi-part EXR files are not supported");
    var readCString = function(at) { var end = at; while (end < bytes.length && bytes[end] !== 0) end++; return { text: String.fromCharCode.apply(null, bytes.subarray(at, end)), next: end + 1 }; };
    var offset = 8, channels = null, compression = 0, lineOrder = 0, dataWindow = null;
    while (offset < bytes.length) {
        var name = readCString(offset); offset = name.next;
        if (!name.text.length) break;
        var type = readCString(offset); offset = type.next;
        var size = view.getUint32(offset, true); offset += 4;
        if (type.text === "chlist") {
            channels = [];
            var at = offset;
            while (at < offset + size - 1) {
                var cname = readCString(at); at = cname.next;
                var pixelType = view.getInt32(at, true); at += 4;
                at += 4;
                var xs = view.getInt32(at, true); at += 4;
                var ys = view.getInt32(at, true); at += 4;
                channels.push({ name: cname.text, pixelType: pixelType, xSampling: xs, ySampling: ys });
            }
        } else if (type.text === "compression") compression = bytes[offset];
        else if (type.text === "lineOrder") lineOrder = bytes[offset];
        else if (type.text === "box2i") dataWindow = { xMin: view.getInt32(offset, true), yMin: view.getInt32(offset + 4, true), xMax: view.getInt32(offset + 8, true), yMax: view.getInt32(offset + 12, true) };
        offset += size;
    }
    if (!channels || !channels.length) throw new Error("EXR file has no channels");
    if (!dataWindow) throw new Error("EXR file has no data window");
    var width = dataWindow.xMax - dataWindow.xMin + 1, height = dataWindow.yMax - dataWindow.yMin + 1;
    if (width <= 0 || height <= 0) throw new Error("Invalid EXR data window");
    var compressionNames = ["none", "rle", "zips", "zip", "piz", "pxr24", "b44", "b44a", "dwaa", "dwab"];
    if (compression > 3) throw new Error("Unsupported EXR compression " + compressionNames[compression]);
    var slots = { R: 0, G: 1, B: 2, A: 3, Y: -2, RY: -3, BY: -3 };
    var luminance = channels.some(function(c) { return c.name === "Y"; });
    if (luminance) { slots.Y = 0; slots.RY = 1; slots.BY = 2; slots.A = 3; }
    var channelSlots = [], channelOffsets = [], channelSizes = [], acc = 0, active = 0;
    for (var ci = 0; ci < channels.length; ci++) {
        var channel = channels[ci];
        if (channel.xSampling !== 1 || channel.ySampling !== 1) throw new Error("Subsampled EXR channels are not supported");
        if (channel.pixelType === 0) throw new Error("UINT EXR channels are not supported");
        var slot = slots[channel.name];
        if (slot === undefined || slot === -3) { channelSlots.push(-1); }
        else { channelSlots.push(slot); active++; }
        channelOffsets.push(acc);
        var sampleBytes = channel.pixelType === 2 ? 4 : 2;
        channelSizes.push(sampleBytes);
        acc += sampleBytes;
    }
    if (!active) throw new Error("EXR file has no supported color channels");
    var bytesPerLine = width * acc;
    var blockHeight = compression === 3 ? 16 : 1;
    var numBlocks = Math.ceil(height / blockHeight);
    var tableAt = offset;
    var out = new Float32Array(width * height * 4);
    for (var i4 = 3; i4 < out.length; i4 += 4) out[i4] = 1;
    for (var block = 0; block < numBlocks; block++) {
        var chunkOffset = view.getUint32(tableAt + block * 8, true) + view.getUint32(tableAt + block * 8 + 4, true) * 4294967296;
        var line = view.getInt32(chunkOffset, true) - dataWindow.yMin;
        var dataSize = view.getUint32(chunkOffset + 4, true);
        var data = bytes.subarray(chunkOffset + 8, chunkOffset + 8 + dataSize);
        var lines = Math.min(blockHeight, height - line);
        if (lines <= 0) continue;
        var expected = lines * bytesPerLine;
        var raw = data;
        if (compression !== 0 && dataSize < expected) {
            raw = compression === 1 ? faoxomexrrledecompress(data) : await faoxomfbxinflate(data);
            var inter = new Uint8Array(raw.length);
            faoxomexrpredictor(raw);
            faoxomexrinterleavescalar(raw, inter);
            raw = inter;
        }
        if (raw.length < expected) throw new Error("Corrupt EXR scanline block");
        var rawView = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
        for (var ly = 0; ly < lines; ly++) {
            var lineOffset = ly * bytesPerLine;
            for (var c = 0; c < channels.length; c++) {
                var slot2 = channelSlots[c];
                if (slot2 < 0) continue;
                var sampleOffset = lineOffset + channelOffsets[c] * width;
                var sampleBytes2 = channelSizes[c];
                for (var x = 0; x < width; x++) {
                    var value = sampleBytes2 === 4 ? rawView.getFloat32(sampleOffset + x * 4, true) : faoxomhalftofloat(rawView.getUint16(sampleOffset + x * 2, true));
                    out[((line + ly) * width + x) * 4 + slot2] = value;
                }
            }
        }
    }
    return { data: out, width: width, height: height, channels: channels.map(function(c) { return c.name; }), compression: compressionNames[compression] };
}

export { faoxomdecodeexr };
