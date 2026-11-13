import { Geometry } from "../geometries/index.js";
import { LineBasicMaterial } from "../materials/index.js";
import { Group, LineSegments } from "../objects/index.js";

function faoxomdecodegcode(text) {
    var state = { x: 0, y: 0, z: 0, e: 0, f: 0, extruding: false, relative: false, extrusionOverride: false, extrusionRelative: false };
    var layers = [];
    var currentLayer = undefined;
    var pathMaterial = new LineBasicMaterial({ color: 0xFF0000 });
    pathMaterial.name = "path";
    var extrudingMaterial = new LineBasicMaterial({ color: 0x00FF00 });
    extrudingMaterial.name = "extruded";
    var newLayer = function(line) { currentLayer = { vertex: [], pathVertex: [], z: line.z }; layers.push(currentLayer); };
    var addSegment = function(p1, p2) {
        if (currentLayer === undefined) newLayer(p1);
        if (state.extruding) currentLayer.vertex.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        else currentLayer.pathVertex.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    };
    var delta = function(v1, v2) { return state.relative ? v2 : v2 - v1; };
    var absolute = function(v1, v2) { return state.relative ? v1 + v2 : v2; };
    var absoluteExtrusion = function(v1, v2) { var relative = state.extrusionOverride ? state.extrusionRelative : state.relative; return relative ? v1 + v2 : v2; };
    var lines = text.replace(/;.+/g, "").split("\n");
    for (var i = 0; i < lines.length; i++) {
        var tokens = lines[i].split(" ");
        var cmd = tokens[0].toUpperCase();
        var args = {};
        for (var tokenIndex = 1; tokenIndex < tokens.length; tokenIndex++) {
            var token = tokens[tokenIndex];
            if (token.length) args[token[0].toLowerCase()] = parseFloat(token.substring(1));
        }
        if (cmd === "G0" || cmd === "G1") {
            var move = Object.assign({}, state);
            if (args.x !== undefined) move.x = absolute(state.x, args.x);
            if (args.y !== undefined) move.y = absolute(state.y, args.y);
            if (args.z !== undefined) move.z = absolute(state.z, args.z);
            if (args.e !== undefined) move.e = absoluteExtrusion(state.e, args.e);
            if (args.f !== undefined) move.f = absolute(state.f, args.f);
            if (delta(state.e, move.e) > 0) {
                state.extruding = true;
                if (currentLayer === undefined || move.z !== currentLayer.z) newLayer(move);
            }
            addSegment(state, move);
            state = move;
        } else if (cmd === "G2" || cmd === "G3") {
        } else if (cmd === "G90") { state.relative = false; state.extrusionOverride = false; }
        else if (cmd === "G91") { state.relative = true; state.extrusionOverride = false; }
        else if (cmd === "M82") { state.extrusionOverride = true; state.extrusionRelative = false; }
        else if (cmd === "M83") { state.extrusionOverride = true; state.extrusionRelative = true; }
        else if (cmd === "G92") {
            if (args.x !== undefined) state.x = args.x;
            if (args.y !== undefined) state.y = args.y;
            if (args.z !== undefined) state.z = args.z;
            if (args.e !== undefined) state.e = args.e;
        }
    }
    var object = new Group();
    object.name = "gcode";
    var addObject = function(vertex, extruding, index) {
        if (!vertex.length) return;
        var geometry = new Geometry();
        geometry.setAttribute("position", new Float32Array(vertex), 3);
        var segments = new LineSegments(geometry, extruding ? extrudingMaterial : pathMaterial);
        segments.name = "layer" + index;
        object.add(segments);
    };
    if (this && this.splitLayer) {
        for (var layerIndex = 0; layerIndex < layers.length; layerIndex++) {
            addObject(layers[layerIndex].vertex, true, layerIndex);
            addObject(layers[layerIndex].pathVertex, false, layerIndex);
        }
    } else {
        var allVertex = [], allPathVertex = [];
        for (var mergeIndex = 0; mergeIndex < layers.length; mergeIndex++) {
            allVertex = allVertex.concat(layers[mergeIndex].vertex);
            allPathVertex = allPathVertex.concat(layers[mergeIndex].pathVertex);
        }
        addObject(allVertex, true, layers.length);
        addObject(allPathVertex, false, layers.length + 1);
    }
    object.rotation.x = -Math.PI / 2;
    return object;
}

export { faoxomdecodegcode };
