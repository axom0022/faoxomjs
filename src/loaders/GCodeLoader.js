import { FileLoader } from "./FileLoader.js";
import { Geometry } from "../geometries/index.js";
import { LineBasicMaterial } from "../materials/index.js";
import { Group, LineSegments } from "../objects/index.js";

class GCodeLoader {
    constructor(manager) { this.manager = manager; this.splitLayer = false; }
    load(url, onLoad, onProgress, onError) {
        var self = this;
        new FileLoader(this.manager).load(url, function(text) {
            try { var printed = self.parse(text); if (onLoad) onLoad(printed); } catch (error) { if (onError) onError(error); }
        }, onProgress, onError);
    }
    parse(source) {
        var head = { x: 0, y: 0, z: 0, e: 0, f: 0 };
        var distanceMode = "absolute";
        var extrusionMode = null;
        var bands = [];
        var active = null;
        function resolve(axis, raw) {
            if (raw === undefined) return head[axis];
            var value = parseFloat(raw);
            var relative = axis === "e" ? (extrusionMode || distanceMode) === "relative" : distanceMode === "relative";
            return relative ? head[axis] + value : value;
        }
        function openBand(z) { active = { z: z, flow: [], travel: [] }; bands.push(active); }
        var rows = String(source).split("\n");
        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var comment = row.indexOf(";");
            if (comment !== -1) row = row.slice(0, comment);
            row = row.trim();
            if (!row) continue;
            var pieces = row.split(/\s+/);
            var word = pieces[0].toUpperCase();
            var fields = {};
            for (var p = 1; p < pieces.length; p++) {
                var piece = pieces[p];
                if (piece.length > 1) fields[piece[0].toLowerCase()] = piece.slice(1);
            }
            if (word === "G0" || word === "G1") {
                var next = { x: resolve("x", fields.x), y: resolve("y", fields.y), z: resolve("z", fields.z), e: resolve("e", fields.e), f: resolve("f", fields.f) };
                var deposited = distanceMode === "relative" ? next.e : next.e - head.e;
                if (deposited > 0 && (active === null || next.z !== active.z)) openBand(next.z);
                if (active === null) openBand(head.z);
                var stream = deposited > 0 ? active.flow : active.travel;
                stream.push(head.x, head.y, head.z, next.x, next.y, next.z);
                head = next;
            } else if (word === "G90") { distanceMode = "absolute"; extrusionMode = null; }
            else if (word === "G91") { distanceMode = "relative"; extrusionMode = null; }
            else if (word === "M82") { extrusionMode = "absolute"; }
            else if (word === "M83") { extrusionMode = "relative"; }
            else if (word === "G92") {
                if (fields.x !== undefined) head.x = parseFloat(fields.x);
                if (fields.y !== undefined) head.y = parseFloat(fields.y);
                if (fields.z !== undefined) head.z = parseFloat(fields.z);
                if (fields.e !== undefined) head.e = parseFloat(fields.e);
            }
        }
        var travelMaterial = new LineBasicMaterial({ color: 0xff0000 });
        travelMaterial.name = "path";
        var flowMaterial = new LineBasicMaterial({ color: 0x00ff00 });
        flowMaterial.name = "extruded";
        var printed = new Group();
        printed.name = "gcode";
        function addPiece(stream, flowing, index) {
            if (!stream.length) return;
            var geometry = new Geometry();
            geometry.setAttribute("position", new Float32Array(stream), 3);
            var piece = new LineSegments(geometry, flowing ? flowMaterial : travelMaterial);
            piece.name = "layer" + index;
            printed.add(piece);
        }
        if (this && this.splitLayer) {
            for (var b = 0; b < bands.length; b++) {
                addPiece(bands[b].flow, true, b);
                addPiece(bands[b].travel, false, b);
            }
        } else {
            var flow = [], travel = [];
            for (var m = 0; m < bands.length; m++) {
                flow = flow.concat(bands[m].flow);
                travel = travel.concat(bands[m].travel);
            }
            addPiece(flow, true, bands.length);
            addPiece(travel, false, bands.length + 1);
        }
        printed.rotation.x = -Math.PI / 2;
        return printed;
    }
}

export { GCodeLoader };
