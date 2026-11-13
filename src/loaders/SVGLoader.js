import { DoubleSide, faoxomsvggettransformscale, faoxomsvggradienturlre, faoxomsvgparsearccommand, faoxomsvgparsefloats, faoxomsvgparsefloatwithunits, faoxomsvgparsetransformstring, faoxomsvgtransformpath } from "../core/index.js";
import { Geometry } from "../geometries/index.js";
import { BasicMaterial } from "../materials/index.js";
import { Color, Matrix3, Path, ShapePath, ShapeUtils, Vector2 } from "../math/index.js";
import { faoxomsvgbuildgradienttexture } from "../textures/index.js";

class SVGLoader {
    constructor(manager) { this.manager = manager; this.defaultDPI = 90; this.defaultUnit = "px"; }
    parse(text) {
        var scope = this;
        function parseNode(node, style) {
            if (node.nodeType !== 1) return;
            if (node.hasAttribute("filter")) console.warn("SVGLoader: Filters are not supported.");
            var transform = getNodeTransform(node);
            var isDefsNode = false;
            var path = null;
            switch (node.nodeName) {
                case "svg": style = parseStyle(node, style); break;
                case "style": parseCSSStylesheet(node); break;
                case "g": style = parseStyle(node, style); break;
                case "path": style = parseStyle(node, style); if (node.hasAttribute("d")) path = parsePathNode(node); break;
                case "rect": style = parseStyle(node, style); path = parseRectNode(node); break;
                case "polygon": style = parseStyle(node, style); path = parsePolygonNode(node); break;
                case "polyline": style = parseStyle(node, style); path = parsePolylineNode(node); break;
                case "circle": style = parseStyle(node, style); path = parseCircleNode(node); break;
                case "ellipse": style = parseStyle(node, style); path = parseEllipseNode(node); break;
                case "line": style = parseStyle(node, style); path = parseLineNode(node); break;
                case "defs": isDefsNode = true; break;
                case "use":
                    style = parseStyle(node, style);
                    var href = (node.getAttributeNS && node.getAttributeNS("http://www.w3.org/1999/xlink", "href")) || "";
                    var usedNodeId = href.substring(1);
                    var usedNode = node.viewportElement ? node.viewportElement.getElementById(usedNodeId) : null;
                    if (usedNode) parseNode(usedNode, style);
                    else console.warn("SVGLoader: 'use node' references non-existent node id: " + usedNodeId);
                    break;
                default: break;
            }
            if (path) {
                if (style.fill !== undefined && style.fill !== "none" && style.fill.indexOf("url") !== 0) path.color.setStyle(style.fill, "srgb");
                faoxomsvgtransformpath(path, currentTransform);
                paths.push(path);
                var pathStyle = {};
                for (var key in style) pathStyle[key] = style[key];
                pathStyle.strokeWidth = style.strokeWidth * faoxomsvggettransformscale(currentTransform);
                path.userData = { node: node, style: pathStyle, transform: new Matrix3().copy(currentTransform), gradients: gradients };
            }
            var childNodes = node.childNodes;
            for (var i = 0; i < childNodes.length; i++) {
                var child = childNodes[i];
                if (isDefsNode && child.nodeName !== "style" && child.nodeName !== "defs") continue;
                parseNode(child, style);
            }
            if (transform) {
                transformStack.pop();
                if (transformStack.length > 0) currentTransform.copy(transformStack[transformStack.length - 1]);
                else currentTransform.identity();
            }
        }
        function parsePathNode(node) {
            var path = new ShapePath();
            var point = new Vector2();
            var control = new Vector2();
            var firstPoint = new Vector2();
            var isFirstPoint = true;
            var doSetFirstPoint = false;
            var d = node.getAttribute("d");
            if (d === "" || d === "none") return null;
            var commands = d.match(/[a-df-z][^a-df-z]*/ig);
            if (!commands) return null;
            for (var i = 0, l = commands.length; i < l; i++) {
                var command = commands[i];
                var type = command.charAt(0);
                var data = command.slice(1).trim();
                if (isFirstPoint === true) {
                    doSetFirstPoint = true;
                    isFirstPoint = false;
                }
                var numbers;
                switch (type) {
                    case "M":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j = 0, jl = numbers.length; j < jl; j += 2) {
                            point.x = numbers[j + 0];
                            point.y = numbers[j + 1];
                            control.x = point.x;
                            control.y = point.y;
                            if (j === 0) path.moveTo(point.x, point.y);
                            else path.lineTo(point.x, point.y);
                            if (j === 0) firstPoint.copy(point);
                        }
                        break;
                    case "H":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j2 = 0, jl2 = numbers.length; j2 < jl2; j2++) {
                            point.x = numbers[j2];
                            control.x = point.x;
                            control.y = point.y;
                            path.lineTo(point.x, point.y);
                            if (j2 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "V":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j3 = 0, jl3 = numbers.length; j3 < jl3; j3++) {
                            point.y = numbers[j3];
                            control.x = point.x;
                            control.y = point.y;
                            path.lineTo(point.x, point.y);
                            if (j3 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "L":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j4 = 0, jl4 = numbers.length; j4 < jl4; j4 += 2) {
                            point.x = numbers[j4 + 0];
                            point.y = numbers[j4 + 1];
                            control.x = point.x;
                            control.y = point.y;
                            path.lineTo(point.x, point.y);
                            if (j4 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "C":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j5 = 0, jl5 = numbers.length; j5 < jl5; j5 += 6) {
                            path.bezierCurveTo(numbers[j5 + 0], numbers[j5 + 1], numbers[j5 + 2], numbers[j5 + 3], numbers[j5 + 4], numbers[j5 + 5]);
                            control.x = numbers[j5 + 2];
                            control.y = numbers[j5 + 3];
                            point.x = numbers[j5 + 4];
                            point.y = numbers[j5 + 5];
                            if (j5 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "S":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j6 = 0, jl6 = numbers.length; j6 < jl6; j6 += 4) {
                            path.bezierCurveTo(getReflection(point.x, control.x), getReflection(point.y, control.y), numbers[j6 + 0], numbers[j6 + 1], numbers[j6 + 2], numbers[j6 + 3]);
                            control.x = numbers[j6 + 0];
                            control.y = numbers[j6 + 1];
                            point.x = numbers[j6 + 2];
                            point.y = numbers[j6 + 3];
                            if (j6 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "Q":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j7 = 0, jl7 = numbers.length; j7 < jl7; j7 += 4) {
                            path.quadraticCurveTo(numbers[j7 + 0], numbers[j7 + 1], numbers[j7 + 2], numbers[j7 + 3]);
                            control.x = numbers[j7 + 0];
                            control.y = numbers[j7 + 1];
                            point.x = numbers[j7 + 2];
                            point.y = numbers[j7 + 3];
                            if (j7 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "T":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j8 = 0, jl8 = numbers.length; j8 < jl8; j8 += 2) {
                            var rx = getReflection(point.x, control.x);
                            var ry = getReflection(point.y, control.y);
                            path.quadraticCurveTo(rx, ry, numbers[j8 + 0], numbers[j8 + 1]);
                            control.x = rx;
                            control.y = ry;
                            point.x = numbers[j8 + 0];
                            point.y = numbers[j8 + 1];
                            if (j8 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "A":
                        numbers = faoxomsvgparsefloats(data, [3, 4], 7);
                        for (var j9 = 0, jl9 = numbers.length; j9 < jl9; j9 += 7) {
                            if (numbers[j9 + 5] == point.x && numbers[j9 + 6] == point.y) continue;
                            var start = point.clone();
                            point.x = numbers[j9 + 5];
                            point.y = numbers[j9 + 6];
                            control.x = point.x;
                            control.y = point.y;
                            faoxomsvgparsearccommand(path, numbers[j9], numbers[j9 + 1], numbers[j9 + 2], numbers[j9 + 3], numbers[j9 + 4], start, point);
                            if (j9 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "m":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j10 = 0, jl10 = numbers.length; j10 < jl10; j10 += 2) {
                            point.x += numbers[j10 + 0];
                            point.y += numbers[j10 + 1];
                            control.x = point.x;
                            control.y = point.y;
                            if (j10 === 0) path.moveTo(point.x, point.y);
                            else path.lineTo(point.x, point.y);
                            if (j10 === 0) firstPoint.copy(point);
                        }
                        break;
                    case "h":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j11 = 0, jl11 = numbers.length; j11 < jl11; j11++) {
                            point.x += numbers[j11];
                            control.x = point.x;
                            control.y = point.y;
                            path.lineTo(point.x, point.y);
                            if (j11 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "v":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j12 = 0, jl12 = numbers.length; j12 < jl12; j12++) {
                            point.y += numbers[j12];
                            control.x = point.x;
                            control.y = point.y;
                            path.lineTo(point.x, point.y);
                            if (j12 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "l":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j13 = 0, jl13 = numbers.length; j13 < jl13; j13 += 2) {
                            point.x += numbers[j13 + 0];
                            point.y += numbers[j13 + 1];
                            control.x = point.x;
                            control.y = point.y;
                            path.lineTo(point.x, point.y);
                            if (j13 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "c":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j14 = 0, jl14 = numbers.length; j14 < jl14; j14 += 6) {
                            path.bezierCurveTo(point.x + numbers[j14 + 0], point.y + numbers[j14 + 1], point.x + numbers[j14 + 2], point.y + numbers[j14 + 3], point.x + numbers[j14 + 4], point.y + numbers[j14 + 5]);
                            control.x = point.x + numbers[j14 + 2];
                            control.y = point.y + numbers[j14 + 3];
                            point.x += numbers[j14 + 4];
                            point.y += numbers[j14 + 5];
                            if (j14 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "s":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j15 = 0, jl15 = numbers.length; j15 < jl15; j15 += 4) {
                            path.bezierCurveTo(getReflection(point.x, control.x), getReflection(point.y, control.y), point.x + numbers[j15 + 0], point.y + numbers[j15 + 1], point.x + numbers[j15 + 2], point.y + numbers[j15 + 3]);
                            control.x = point.x + numbers[j15 + 0];
                            control.y = point.y + numbers[j15 + 1];
                            point.x += numbers[j15 + 2];
                            point.y += numbers[j15 + 3];
                            if (j15 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "q":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j16 = 0, jl16 = numbers.length; j16 < jl16; j16 += 4) {
                            path.quadraticCurveTo(point.x + numbers[j16 + 0], point.y + numbers[j16 + 1], point.x + numbers[j16 + 2], point.y + numbers[j16 + 3]);
                            control.x = point.x + numbers[j16 + 0];
                            control.y = point.y + numbers[j16 + 1];
                            point.x += numbers[j16 + 2];
                            point.y += numbers[j16 + 3];
                            if (j16 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "t":
                        numbers = faoxomsvgparsefloats(data);
                        for (var j17 = 0, jl17 = numbers.length; j17 < jl17; j17 += 2) {
                            var rx2 = getReflection(point.x, control.x);
                            var ry2 = getReflection(point.y, control.y);
                            path.quadraticCurveTo(rx2, ry2, point.x + numbers[j17 + 0], point.y + numbers[j17 + 1]);
                            control.x = rx2;
                            control.y = ry2;
                            point.x = point.x + numbers[j17 + 0];
                            point.y = point.y + numbers[j17 + 1];
                            if (j17 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "a":
                        numbers = faoxomsvgparsefloats(data, [3, 4], 7);
                        for (var j18 = 0, jl18 = numbers.length; j18 < jl18; j18 += 7) {
                            if (numbers[j18 + 5] == 0 && numbers[j18 + 6] == 0) continue;
                            var start2 = point.clone();
                            point.x += numbers[j18 + 5];
                            point.y += numbers[j18 + 6];
                            control.x = point.x;
                            control.y = point.y;
                            faoxomsvgparsearccommand(path, numbers[j18], numbers[j18 + 1], numbers[j18 + 2], numbers[j18 + 3], numbers[j18 + 4], start2, point);
                            if (j18 === 0 && doSetFirstPoint === true) firstPoint.copy(point);
                        }
                        break;
                    case "Z":
                    case "z":
                        path.currentPath.autoClose = true;
                        if (path.currentPath.curves.length > 0) {
                            point.copy(firstPoint);
                            path.currentPath.currentPoint.copy(point);
                            isFirstPoint = true;
                        }
                        break;
                    default:
                        console.warn(command);
                }
                doSetFirstPoint = false;
            }
            return path;
        }
        function parseCSSStylesheet(node) {
            if (!node.sheet || !node.sheet.cssRules || !node.sheet.cssRules.length) return;
            for (var i = 0; i < node.sheet.cssRules.length; i++) {
                var stylesheet = node.sheet.cssRules[i];
                if (stylesheet.type !== 1) continue;
                var selectorList = stylesheet.selectorText.split(/,/).filter(Boolean).map(function(s) { return s.trim(); });
                for (var j = 0; j < selectorList.length; j++) {
                    var definitions = {};
                    for (var name in stylesheet.style) {
                        if (stylesheet.style[name] !== "") definitions[name] = stylesheet.style[name];
                    }
                    stylesheets[selectorList[j]] = Object.assign(stylesheets[selectorList[j]] || {}, definitions);
                }
            }
        }
        function parseRectNode(node) {
            var x = faoxomsvgparsefloatwithunits(node.getAttribute("x") || 0, scope.defaultDPI, scope.defaultUnit);
            var y = faoxomsvgparsefloatwithunits(node.getAttribute("y") || 0, scope.defaultDPI, scope.defaultUnit);
            var rx = faoxomsvgparsefloatwithunits(node.getAttribute("rx") || node.getAttribute("ry") || 0, scope.defaultDPI, scope.defaultUnit);
            var ry = faoxomsvgparsefloatwithunits(node.getAttribute("ry") || node.getAttribute("rx") || 0, scope.defaultDPI, scope.defaultUnit);
            var w = faoxomsvgparsefloatwithunits(node.getAttribute("width"), scope.defaultDPI, scope.defaultUnit);
            var h = faoxomsvgparsefloatwithunits(node.getAttribute("height"), scope.defaultDPI, scope.defaultUnit);
            var bci = 1 - 0.551915024494;
            var path = new ShapePath();
            path.moveTo(x + rx, y);
            path.lineTo(x + w - rx, y);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x + w - rx * bci, y, x + w, y + ry * bci, x + w, y + ry);
            path.lineTo(x + w, y + h - ry);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x + w, y + h - ry * bci, x + w - rx * bci, y + h, x + w - rx, y + h);
            path.lineTo(x + rx, y + h);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x + rx * bci, y + h, x, y + h - ry * bci, x, y + h - ry);
            path.lineTo(x, y + ry);
            if (rx !== 0 || ry !== 0) path.bezierCurveTo(x, y + ry * bci, x + rx * bci, y, x + rx, y);
            return path;
        }
        function parsePolygonNode(node) {
            function iterator(match, a, b) {
                var x = faoxomsvgparsefloatwithunits(a, scope.defaultDPI, scope.defaultUnit);
                var y = faoxomsvgparsefloatwithunits(b, scope.defaultDPI, scope.defaultUnit);
                if (index === 0) path.moveTo(x, y);
                else path.lineTo(x, y);
                index++;
            }
            var regex = /([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:,|\s)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g;
            var path = new ShapePath();
            var index = 0;
            node.getAttribute("points").replace(regex, iterator);
            if (path.currentPath) path.currentPath.autoClose = true;
            return path;
        }
        function parsePolylineNode(node) {
            function iterator(match, a, b) {
                var x = faoxomsvgparsefloatwithunits(a, scope.defaultDPI, scope.defaultUnit);
                var y = faoxomsvgparsefloatwithunits(b, scope.defaultDPI, scope.defaultUnit);
                if (index === 0) path.moveTo(x, y);
                else path.lineTo(x, y);
                index++;
            }
            var regex = /([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(?:,|\s)([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/g;
            var path = new ShapePath();
            var index = 0;
            node.getAttribute("points").replace(regex, iterator);
            if (path.currentPath) path.currentPath.autoClose = false;
            return path;
        }
        function parseCircleNode(node) {
            var x = faoxomsvgparsefloatwithunits(node.getAttribute("cx") || 0, scope.defaultDPI, scope.defaultUnit);
            var y = faoxomsvgparsefloatwithunits(node.getAttribute("cy") || 0, scope.defaultDPI, scope.defaultUnit);
            var r = faoxomsvgparsefloatwithunits(node.getAttribute("r") || 0, scope.defaultDPI, scope.defaultUnit);
            var subpath = new Path();
            subpath.absarc(x, y, r, 0, Math.PI * 2);
            var path = new ShapePath();
            path.subPaths.push(subpath);
            return path;
        }
        function parseEllipseNode(node) {
            var x = faoxomsvgparsefloatwithunits(node.getAttribute("cx") || 0, scope.defaultDPI, scope.defaultUnit);
            var y = faoxomsvgparsefloatwithunits(node.getAttribute("cy") || 0, scope.defaultDPI, scope.defaultUnit);
            var rx = faoxomsvgparsefloatwithunits(node.getAttribute("rx") || 0, scope.defaultDPI, scope.defaultUnit);
            var ry = faoxomsvgparsefloatwithunits(node.getAttribute("ry") || 0, scope.defaultDPI, scope.defaultUnit);
            var subpath = new Path();
            subpath.absellipse(x, y, rx, ry, 0, Math.PI * 2);
            var path = new ShapePath();
            path.subPaths.push(subpath);
            return path;
        }
        function parseLineNode(node) {
            var x1 = faoxomsvgparsefloatwithunits(node.getAttribute("x1") || 0, scope.defaultDPI, scope.defaultUnit);
            var y1 = faoxomsvgparsefloatwithunits(node.getAttribute("y1") || 0, scope.defaultDPI, scope.defaultUnit);
            var x2 = faoxomsvgparsefloatwithunits(node.getAttribute("x2") || 0, scope.defaultDPI, scope.defaultUnit);
            var y2 = faoxomsvgparsefloatwithunits(node.getAttribute("y2") || 0, scope.defaultDPI, scope.defaultUnit);
            var path = new ShapePath();
            path.moveTo(x1, y1);
            path.lineTo(x2, y2);
            if (path.currentPath) path.currentPath.autoClose = false;
            return path;
        }
        function parseGradients(xml) {
            var HREF_NS = "http://www.w3.org/1999/xlink";
            var gradientNodes = [];
            var lin = xml.getElementsByTagName("linearGradient");
            var rad = xml.getElementsByTagName("radialGradient");
            for (var ln = 0; ln < lin.length; ln++) gradientNodes.push(lin[ln]);
            for (var rn = 0; rn < rad.length; rn++) gradientNodes.push(rad[rn]);
            var ATTRS = ["x1", "y1", "x2", "y2", "cx", "cy", "r", "fx", "fy", "gradientUnits", "gradientTransform", "spreadMethod"];
            var parsed = {};
            for (var n = 0; n < gradientNodes.length; n++) {
                var node = gradientNodes[n];
                var id = node.getAttribute("id");
                if (!id) continue;
                var entry = { type: node.nodeName === "radialGradient" ? "radialGradient" : "linearGradient", attrs: {}, stops: null, href: null };
                var href = (node.getAttributeNS && node.getAttributeNS(HREF_NS, "href")) || node.getAttribute("href") || "";
                if (href.indexOf("#") === 0) entry.href = href.substring(1);
                for (var ai = 0; ai < ATTRS.length; ai++) {
                    if (node.hasAttribute(ATTRS[ai])) entry.attrs[ATTRS[ai]] = node.getAttribute(ATTRS[ai]);
                }
                var stopNodes = node.getElementsByTagName("stop");
                if (stopNodes.length > 0) {
                    entry.stops = [];
                    for (var s = 0; s < stopNodes.length; s++) {
                        var stopNode = stopNodes[s];
                        var color = stopNode.getAttribute("stop-color");
                        if (!color && stopNode.style) color = stopNode.style["stop-color"];
                        if (!color) color = "#000";
                        var opacity = stopNode.getAttribute("stop-opacity");
                        if ((opacity === null || opacity === "") && stopNode.style) opacity = stopNode.style["stop-opacity"];
                        opacity = (opacity === null || opacity === "" || opacity === undefined) ? 1 : Math.max(0, Math.min(1, parseFloat(opacity)));
                        var offset = Math.max(0, Math.min(1, parseFloat(stopNode.getAttribute("offset") || "0")));
                        entry.stops.push({ offset: offset, color: color, opacity: opacity });
                    }
                }
                parsed[id] = entry;
            }
            function inherit(id, visited) {
                var entry = parsed[id];
                if (!entry || visited.indexOf(id) !== -1) return entry;
                visited.push(id);
                if (entry.href && parsed[entry.href]) {
                    var parent = inherit(entry.href, visited);
                    if (parent) {
                        if (!entry.stops) entry.stops = parent.stops;
                        for (var key in parent.attrs) {
                            if (!(key in entry.attrs)) entry.attrs[key] = parent.attrs[key];
                        }
                    }
                }
                return entry;
            }
            for (var pid in parsed) inherit(pid, []);
            for (var gid in parsed) {
                var entry2 = parsed[gid];
                var a = entry2.attrs;
                var units = a.gradientUnits === "userSpaceOnUse" ? "userSpaceOnUse" : "objectBoundingBox";
                var gradient = { type: entry2.type, gradientUnits: units, spreadMethod: a.spreadMethod === "reflect" || a.spreadMethod === "repeat" ? a.spreadMethod : "pad", gradientTransform: null, stops: (entry2.stops || []).slice().sort(function(x, y) { return x.offset - y.offset; }) };
                if (a.gradientTransform) {
                    gradient.gradientTransform = new Matrix3();
                    faoxomsvgparsetransformstring(a.gradientTransform, gradient.gradientTransform);
                }
                function coord(str) {
                    if (typeof str !== "string") return 0;
                    if (str.endsWith("%")) return parseFloat(str) / 100;
                    return faoxomsvgparsefloatwithunits(str, scope.defaultDPI, scope.defaultUnit);
                }
                if (entry2.type === "linearGradient") {
                    gradient.x1 = a.x1 !== undefined ? coord(a.x1) : 0;
                    gradient.y1 = a.y1 !== undefined ? coord(a.y1) : 0;
                    gradient.x2 = a.x2 !== undefined ? coord(a.x2) : (units === "objectBoundingBox" ? 1 : 0);
                    gradient.y2 = a.y2 !== undefined ? coord(a.y2) : 0;
                } else {
                    var defCenter = units === "objectBoundingBox" ? 0.5 : 0;
                    var defR = units === "objectBoundingBox" ? 0.5 : 0;
                    gradient.cx = a.cx !== undefined ? coord(a.cx) : defCenter;
                    gradient.cy = a.cy !== undefined ? coord(a.cy) : defCenter;
                    gradient.r = a.r !== undefined ? coord(a.r) : defR;
                    gradient.fx = a.fx !== undefined ? coord(a.fx) : gradient.cx;
                    gradient.fy = a.fy !== undefined ? coord(a.fy) : gradient.cy;
                }
                gradients[gid] = gradient;
            }
        }
        function parseStyle(node, style) {
            style = Object.assign({}, style);
            var stylesheetStyles = {};
            if (node.hasAttribute("class")) {
                var classSelectors = node.getAttribute("class").split(/\s/).filter(Boolean).map(function(s) { return s.trim(); });
                for (var i = 0; i < classSelectors.length; i++) stylesheetStyles = Object.assign(stylesheetStyles, stylesheets["." + classSelectors[i]]);
            }
            if (node.hasAttribute("id")) stylesheetStyles = Object.assign(stylesheetStyles, stylesheets["#" + node.getAttribute("id")]);
            function addStyle(svgName, jsName, adjustFunction) {
                if (adjustFunction === undefined) adjustFunction = function(v) { return v; };
                if (node.hasAttribute(svgName)) style[jsName] = adjustFunction(node.getAttribute(svgName));
                if (stylesheetStyles[jsName]) style[jsName] = adjustFunction(stylesheetStyles[jsName]);
                if (node.style && node.style[svgName] !== "") style[jsName] = adjustFunction(node.style[svgName]);
            }
            function clamp(v) { return Math.max(0, Math.min(1, faoxomsvgparsefloatwithunits(v, scope.defaultDPI, scope.defaultUnit))); }
            function positive(v) { return Math.max(0, faoxomsvgparsefloatwithunits(v, scope.defaultDPI, scope.defaultUnit)); }
            addStyle("fill", "fill");
            addStyle("fill-opacity", "fillOpacity", clamp);
            addStyle("fill-rule", "fillRule");
            addStyle("opacity", "opacity", clamp);
            addStyle("stroke", "stroke");
            addStyle("stroke-opacity", "strokeOpacity", clamp);
            addStyle("stroke-width", "strokeWidth", positive);
            addStyle("stroke-linejoin", "strokeLineJoin");
            addStyle("stroke-linecap", "strokeLineCap");
            addStyle("stroke-miterlimit", "strokeMiterLimit", positive);
            addStyle("visibility", "visibility");
            return style;
        }
        function getReflection(a, b) { return a - (b - a); }
        function getNodeTransform(node) {
            if (!(node.hasAttribute("transform") || (node.nodeName === "use" && (node.hasAttribute("x") || node.hasAttribute("y"))))) return null;
            var transform = new Matrix3();
            if (node.nodeName === "use" && (node.hasAttribute("x") || node.hasAttribute("y"))) {
                var tx = faoxomsvgparsefloatwithunits(node.getAttribute("x") || 0, scope.defaultDPI, scope.defaultUnit);
                var ty = faoxomsvgparsefloatwithunits(node.getAttribute("y") || 0, scope.defaultDPI, scope.defaultUnit);
                transform.makeTranslation(tx, ty);
            }
            if (node.hasAttribute("transform")) faoxomsvgparsetransformstring(node.getAttribute("transform"), transform);
            if (transformStack.length > 0) transform.premultiply(transformStack[transformStack.length - 1]);
            currentTransform.copy(transform);
            transformStack.push(transform);
            return transform;
        }
        var paths = [];
        var stylesheets = {};
        var gradients = {};
        var transformStack = [];
        var currentTransform = new Matrix3();
        var xml = new DOMParser().parseFromString(text, "image/svg+xml");
        parseGradients(xml);
        parseNode(xml.documentElement, { fill: "#000", fillOpacity: 1, strokeOpacity: 1, strokeWidth: 1, strokeLineJoin: "miter", strokeLineCap: "butt", strokeMiterLimit: 4 });
        return { paths: paths, gradients: gradients, xml: xml.documentElement };
    }
    static createFillMaterial(shapePath) {
        var style = shapePath.userData.style;
        if (!style || style.fill === undefined || style.fill === "none") return null;
        var color = shapePath.color;
        var texture = null;
        var urlMatch = faoxomsvggradienturlre.exec(style.fill);
        if (urlMatch) {
            var gradient = shapePath.userData.gradients && shapePath.userData.gradients[urlMatch[1]];
            texture = faoxomsvgbuildgradienttexture(gradient, shapePath);
        }
        var material = new BasicMaterial({ opacity: style.fillOpacity * (style.opacity || 1), transparent: true, side: DoubleSide, depthWrite: false });
        if (texture !== null && texture !== undefined) material.diffuseMap = texture;
        else material.color = color;
        return material;
    }
    static createStrokeMaterial(shapePath) {
        var style = shapePath.userData.style;
        if (!style || style.stroke === undefined || style.stroke === "none") return null;
        if (faoxomsvggradienturlre.test(style.stroke)) console.warn("SVGLoader: Gradient strokes are not supported.");
        var material = new BasicMaterial({ opacity: style.strokeOpacity * (style.opacity || 1), transparent: true, side: DoubleSide, depthWrite: false });
        material.color = new Color().setStyle(style.stroke, "srgb");
        return material;
    }
    static createShapes(shapePath) {
        return shapePath.toShapes();
    }
    static getStrokeStyle(width, color, lineJoin, lineCap, miterLimit) {
        width = width !== undefined ? width : 1;
        color = color !== undefined ? color : "#000";
        lineJoin = lineJoin !== undefined ? lineJoin : "miter";
        lineCap = lineCap !== undefined ? lineCap : "butt";
        miterLimit = miterLimit !== undefined ? miterLimit : 4;
        return { strokeColor: color, strokeWidth: width, strokeLineJoin: lineJoin, strokeLineCap: lineCap, strokeMiterLimit: miterLimit };
    }
    static pointsToStroke(points, style, arcDivisions, minDistance) {
        var vertices = [], normals = [], uvs = [];
        if (SVGLoader.pointsToStrokeWithBuffers(points, style, arcDivisions, minDistance, vertices, normals, uvs) === 0) return null;
        var geometry = new Geometry();
        geometry.setAttribute("position", new Float32Array(vertices), 3);
        geometry.setAttribute("normal", new Float32Array(normals), 3);
        geometry.setAttribute("uv", new Float32Array(uvs), 2);
        return geometry;
    }
    static pointsToStrokeWithBuffers(points, style, arcDivisions, minDistance, vertices, normals, uvs, vertexOffset) {
        var tempV2_1 = new Vector2(), tempV2_2 = new Vector2(), tempV2_3 = new Vector2(), tempV2_4 = new Vector2(), tempV2_5 = new Vector2(), tempV2_6 = new Vector2(), tempV2_7 = new Vector2();
        var lastPointL = new Vector2(), lastPointR = new Vector2(), point0L = new Vector2(), point0R = new Vector2();
        var currentPointL = new Vector2(), currentPointR = new Vector2(), nextPointL = new Vector2(), nextPointR = new Vector2();
        var innerPoint = new Vector2(), outerPoint = new Vector2();
        arcDivisions = arcDivisions !== undefined ? arcDivisions : 12;
        minDistance = minDistance !== undefined ? minDistance : 0.001;
        vertexOffset = vertexOffset !== undefined ? vertexOffset : 0;
        function removeDuplicatedPoints(pts) {
            var dupPoints = false;
            for (var i = 1, n = pts.length - 1; i < n; i++) {
                if (pts[i].distanceTo(pts[i + 1]) < minDistance) { dupPoints = true; break; }
            }
            if (!dupPoints) return pts;
            var newPoints = [pts[0]];
            for (var j = 1, m = pts.length - 1; j < m; j++) {
                if (pts[j].distanceTo(pts[j + 1]) >= minDistance) newPoints.push(pts[j]);
            }
            newPoints.push(pts[pts.length - 1]);
            return newPoints;
        }
        function getNormal(p1, p2, result) {
            result.subVectors(p2, p1);
            var x = -result.y, y = result.x;
            return result.set(x, y).normalize();
        }
        var currentCoordinate = vertexOffset * 3, currentCoordinateUV = vertexOffset * 2, numVertices = 0;
        function addVertex(position, u, v) {
            if (vertices) {
                vertices[currentCoordinate] = position.x;
                vertices[currentCoordinate + 1] = position.y;
                vertices[currentCoordinate + 2] = 0;
                if (normals) { normals[currentCoordinate] = 0; normals[currentCoordinate + 1] = 0; normals[currentCoordinate + 2] = 1; }
                currentCoordinate += 3;
                if (uvs) { uvs[currentCoordinateUV] = u; uvs[currentCoordinateUV + 1] = v; currentCoordinateUV += 2; }
            }
            numVertices += 3;
        }
        function makeCircularSector(center, p1, p2, u, v) {
            tempV2_1.copy(p1).sub(center).normalize();
            tempV2_2.copy(p2).sub(center).normalize();
            var angle = Math.PI;
            var dot = tempV2_1.dot(tempV2_2);
            if (Math.abs(dot) < 1) angle = Math.abs(Math.acos(dot));
            angle /= arcDivisions;
            tempV2_3.copy(p1);
            for (var i = 0, il = arcDivisions - 1; i < il; i++) {
                tempV2_4.copy(tempV2_3).rotateAround(center, angle);
                addVertex(tempV2_3, u, v);
                addVertex(tempV2_4, u, v);
                addVertex(center, u, 0.5);
                tempV2_3.copy(tempV2_4);
            }
            addVertex(tempV2_3, u, v);
            addVertex(p2, u, v);
            addVertex(center, u, 0.5);
        }
        function makeSegmentTriangles() {
            addVertex(lastPointR, u0, 1);
            addVertex(lastPointL, u0, 0);
            addVertex(currentPointL, u1, 0);
            addVertex(lastPointR, u0, 1);
            addVertex(currentPointL, u1, 0);
            addVertex(currentPointR, u1, 1);
        }
        function makeSegmentWithBevelJoin(joinIsOnLeftSideArg, innerSideModifiedArg, u) {
            if (innerSideModifiedArg) {
                if (joinIsOnLeftSideArg) {
                    addVertex(lastPointR, u0, 1);
                    addVertex(lastPointL, u0, 0);
                    addVertex(currentPointL, u1, 0);
                    addVertex(lastPointR, u0, 1);
                    addVertex(currentPointL, u1, 0);
                    addVertex(innerPoint, u1, 1);
                    addVertex(currentPointL, u, 0);
                    addVertex(nextPointL, u, 0);
                    addVertex(innerPoint, u, 0.5);
                } else {
                    addVertex(lastPointR, u0, 1);
                    addVertex(lastPointL, u0, 0);
                    addVertex(currentPointR, u1, 1);
                    addVertex(lastPointL, u0, 0);
                    addVertex(innerPoint, u1, 0);
                    addVertex(currentPointR, u1, 1);
                    addVertex(currentPointR, u, 1);
                    addVertex(innerPoint, u, 0);
                    addVertex(nextPointR, u, 1);
                }
            } else {
                if (joinIsOnLeftSideArg) {
                    addVertex(currentPointL, u, 0);
                    addVertex(nextPointL, u, 0);
                    addVertex(currentPoint, u, 0.5);
                } else {
                    addVertex(currentPointR, u, 1);
                    addVertex(nextPointR, u, 0);
                    addVertex(currentPoint, u, 0.5);
                }
            }
        }
        function createSegmentTrianglesWithMiddleSection(joinIsOnLeftSideArg, innerSideModifiedArg) {
            if (innerSideModifiedArg) {
                if (joinIsOnLeftSideArg) {
                    addVertex(lastPointR, u0, 1);
                    addVertex(lastPointL, u0, 0);
                    addVertex(currentPointL, u1, 0);
                    addVertex(lastPointR, u0, 1);
                    addVertex(currentPointL, u1, 0);
                    addVertex(innerPoint, u1, 1);
                    addVertex(currentPointL, u0, 0);
                    addVertex(currentPoint, u1, 0.5);
                    addVertex(innerPoint, u1, 1);
                    addVertex(currentPoint, u1, 0.5);
                    addVertex(nextPointL, u0, 0);
                    addVertex(innerPoint, u1, 1);
                } else {
                    addVertex(lastPointR, u0, 1);
                    addVertex(lastPointL, u0, 0);
                    addVertex(currentPointR, u1, 1);
                    addVertex(lastPointL, u0, 0);
                    addVertex(innerPoint, u1, 0);
                    addVertex(currentPointR, u1, 1);
                    addVertex(currentPointR, u0, 1);
                    addVertex(innerPoint, u1, 0);
                    addVertex(currentPoint, u1, 0.5);
                    addVertex(currentPoint, u1, 0.5);
                    addVertex(innerPoint, u1, 0);
                    addVertex(nextPointR, u0, 1);
                }
            }
        }
        function addCapGeometry(center, p1, p2, joinIsOnLeftSideArg, start, u) {
            switch (style.strokeLineCap) {
                case "round":
                    if (start) makeCircularSector(center, p2, p1, u, 0.5);
                    else makeCircularSector(center, p1, p2, u, 0.5);
                    break;
                case "square":
                    if (start) {
                        tempV2_1.subVectors(p1, center);
                        tempV2_2.set(tempV2_1.y, -tempV2_1.x);
                        tempV2_3.addVectors(tempV2_1, tempV2_2).add(center);
                        tempV2_4.subVectors(tempV2_2, tempV2_1).add(center);
                        if (joinIsOnLeftSideArg) {
                            tempV2_3.toArray(vertices, 1 * 3);
                            tempV2_4.toArray(vertices, 0 * 3);
                            tempV2_4.toArray(vertices, 3 * 3);
                        } else {
                            tempV2_3.toArray(vertices, 1 * 3);
                            if (uvs[3 * 2 + 1] === 1) tempV2_4.toArray(vertices, 3 * 3);
                            else tempV2_3.toArray(vertices, 3 * 3);
                            tempV2_4.toArray(vertices, 0 * 3);
                        }
                    } else {
                        tempV2_1.subVectors(p2, center);
                        tempV2_2.set(tempV2_1.y, -tempV2_1.x);
                        tempV2_3.addVectors(tempV2_1, tempV2_2).add(center);
                        tempV2_4.subVectors(tempV2_2, tempV2_1).add(center);
                        var vl = vertices.length;
                        if (joinIsOnLeftSideArg) {
                            tempV2_3.toArray(vertices, vl - 1 * 3);
                            tempV2_4.toArray(vertices, vl - 2 * 3);
                            tempV2_4.toArray(vertices, vl - 4 * 3);
                        } else {
                            tempV2_4.toArray(vertices, vl - 2 * 3);
                            tempV2_3.toArray(vertices, vl - 1 * 3);
                            tempV2_4.toArray(vertices, vl - 4 * 3);
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        points = removeDuplicatedPoints(points);
        var numPoints = points.length;
        if (numPoints < 2) return 0;
        var isClosed = points[0].equals(points[numPoints - 1]);
        var currentPoint, previousPoint = points[0], nextPoint;
        var strokeWidth2 = style.strokeWidth / 2;
        var deltaU = 1 / (numPoints - 1);
        var u0 = 0, u1;
        var innerSideModified, joinIsOnLeftSide, isMiter, initialJoinIsOnLeftSide = false;
        getNormal(points[0], points[1], tempV2_1).multiplyScalar(strokeWidth2);
        lastPointL.copy(points[0]).sub(tempV2_1);
        lastPointR.copy(points[0]).add(tempV2_1);
        point0L.copy(lastPointL);
        point0R.copy(lastPointR);
        for (var iPoint = 1; iPoint < numPoints; iPoint++) {
            currentPoint = points[iPoint];
            if (iPoint === numPoints - 1) {
                if (isClosed) nextPoint = points[1];
                else nextPoint = undefined;
            } else nextPoint = points[iPoint + 1];
            var normal1 = tempV2_1;
            getNormal(previousPoint, currentPoint, normal1);
            tempV2_3.copy(normal1).multiplyScalar(strokeWidth2);
            currentPointL.copy(currentPoint).sub(tempV2_3);
            currentPointR.copy(currentPoint).add(tempV2_3);
            u1 = u0 + deltaU;
            innerSideModified = false;
            if (nextPoint !== undefined) {
                getNormal(currentPoint, nextPoint, tempV2_2);
                tempV2_3.copy(tempV2_2).multiplyScalar(strokeWidth2);
                nextPointL.copy(currentPoint).sub(tempV2_3);
                nextPointR.copy(currentPoint).add(tempV2_3);
                joinIsOnLeftSide = true;
                tempV2_3.subVectors(nextPoint, previousPoint);
                if (normal1.dot(tempV2_3) < 0) joinIsOnLeftSide = false;
                if (iPoint === 1) initialJoinIsOnLeftSide = joinIsOnLeftSide;
                tempV2_3.subVectors(nextPoint, currentPoint);
                tempV2_3.normalize();
                var dot = Math.abs(normal1.dot(tempV2_3));
                if (dot > Number.EPSILON) {
                    var miterSide = strokeWidth2 / dot;
                    tempV2_3.multiplyScalar(-miterSide);
                    tempV2_4.subVectors(currentPoint, previousPoint);
                    tempV2_5.copy(tempV2_4).setLength(miterSide).add(tempV2_3);
                    innerPoint.copy(tempV2_5).negate();
                    var miterLength2 = tempV2_5.length();
                    var segmentLengthPrev = tempV2_4.length();
                    tempV2_4.divideScalar(segmentLengthPrev);
                    tempV2_6.subVectors(nextPoint, currentPoint);
                    var segmentLengthNext = tempV2_6.length();
                    tempV2_6.divideScalar(segmentLengthNext);
                    if (tempV2_4.dot(innerPoint) < segmentLengthPrev && tempV2_6.dot(innerPoint) < segmentLengthNext) innerSideModified = true;
                    outerPoint.copy(tempV2_5).add(currentPoint);
                    innerPoint.add(currentPoint);
                    if (innerSideModified) {
                        var refPt = joinIsOnLeftSide ? lastPointR : lastPointL;
                        var foldCross = (outerPoint.x - refPt.x) * (innerPoint.y - refPt.y) - (outerPoint.y - refPt.y) * (innerPoint.x - refPt.x);
                        if ((joinIsOnLeftSide && foldCross < 0) || (!joinIsOnLeftSide && foldCross > 0)) innerPoint.copy(refPt);
                    }
                    isMiter = false;
                    if (innerSideModified) {
                        if (joinIsOnLeftSide) { nextPointR.copy(innerPoint); currentPointR.copy(innerPoint); }
                        else { nextPointL.copy(innerPoint); currentPointL.copy(innerPoint); }
                    } else makeSegmentTriangles();
                    switch (style.strokeLineJoin) {
                        case "bevel":
                            makeSegmentWithBevelJoin(joinIsOnLeftSide, innerSideModified, u1);
                            break;
                        case "round":
                            createSegmentTrianglesWithMiddleSection(joinIsOnLeftSide, innerSideModified);
                            if (joinIsOnLeftSide) makeCircularSector(currentPoint, currentPointL, nextPointL, u1, 0);
                            else makeCircularSector(currentPoint, nextPointR, currentPointR, u1, 1);
                            break;
                        default:
                            var miterFraction = (strokeWidth2 * style.strokeMiterLimit) / miterLength2;
                            if (miterFraction < 1) {
                                if (style.strokeLineJoin !== "miter-clip") {
                                    makeSegmentWithBevelJoin(joinIsOnLeftSide, innerSideModified, u1);
                                } else {
                                    createSegmentTrianglesWithMiddleSection(joinIsOnLeftSide, innerSideModified);
                                    if (joinIsOnLeftSide) {
                                        tempV2_6.subVectors(outerPoint, currentPointL).multiplyScalar(miterFraction).add(currentPointL);
                                        tempV2_7.subVectors(outerPoint, nextPointL).multiplyScalar(miterFraction).add(nextPointL);
                                        addVertex(currentPointL, u1, 0);
                                        addVertex(tempV2_6, u1, 0);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(tempV2_6, u1, 0);
                                        addVertex(tempV2_7, u1, 0);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(tempV2_7, u1, 0);
                                        addVertex(nextPointL, u1, 0);
                                    } else {
                                        tempV2_6.subVectors(outerPoint, currentPointR).multiplyScalar(miterFraction).add(currentPointR);
                                        tempV2_7.subVectors(outerPoint, nextPointR).multiplyScalar(miterFraction).add(nextPointR);
                                        addVertex(currentPointR, u1, 1);
                                        addVertex(tempV2_6, u1, 1);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(tempV2_6, u1, 1);
                                        addVertex(tempV2_7, u1, 1);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(tempV2_7, u1, 1);
                                        addVertex(nextPointR, u1, 1);
                                    }
                                }
                            } else {
                                if (innerSideModified) {
                                    if (joinIsOnLeftSide) {
                                        addVertex(lastPointR, u0, 1);
                                        addVertex(lastPointL, u0, 0);
                                        addVertex(outerPoint, u1, 0);
                                        addVertex(lastPointR, u0, 1);
                                        addVertex(outerPoint, u1, 0);
                                        addVertex(innerPoint, u1, 1);
                                    } else {
                                        addVertex(lastPointR, u0, 1);
                                        addVertex(lastPointL, u0, 0);
                                        addVertex(outerPoint, u1, 1);
                                        addVertex(lastPointL, u0, 0);
                                        addVertex(innerPoint, u1, 0);
                                        addVertex(outerPoint, u1, 1);
                                    }
                                    if (joinIsOnLeftSide) nextPointL.copy(outerPoint);
                                    else nextPointR.copy(outerPoint);
                                } else {
                                    if (joinIsOnLeftSide) {
                                        addVertex(currentPointL, u1, 0);
                                        addVertex(outerPoint, u1, 0);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(outerPoint, u1, 0);
                                        addVertex(nextPointL, u1, 0);
                                    } else {
                                        addVertex(currentPointR, u1, 1);
                                        addVertex(outerPoint, u1, 1);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(currentPoint, u1, 0.5);
                                        addVertex(outerPoint, u1, 1);
                                        addVertex(nextPointR, u1, 1);
                                    }
                                }
                                isMiter = true;
                            }
                            break;
                    }
                } else makeSegmentTriangles();
            } else makeSegmentTriangles();
            if (!isClosed && iPoint === numPoints - 1) addCapGeometry(points[0], point0L, point0R, joinIsOnLeftSide, true, u0);
            u0 = u1;
            previousPoint = currentPoint;
            lastPointL.copy(nextPointL);
            lastPointR.copy(nextPointR);
        }
        if (!isClosed) {
            addCapGeometry(currentPoint, currentPointL, currentPointR, joinIsOnLeftSide, false, u1);
        } else if (innerSideModified && vertices) {
            var lastOuter = outerPoint, lastInner = innerPoint;
            if (initialJoinIsOnLeftSide !== joinIsOnLeftSide) {
                lastOuter = innerPoint;
                lastInner = outerPoint;
            }
            if (joinIsOnLeftSide) {
                if (isMiter || initialJoinIsOnLeftSide) {
                    lastInner.toArray(vertices, 0 * 3);
                    lastInner.toArray(vertices, 3 * 3);
                    if (isMiter) lastOuter.toArray(vertices, 1 * 3);
                }
            } else {
                if (isMiter || !initialJoinIsOnLeftSide) {
                    lastInner.toArray(vertices, 1 * 3);
                    lastInner.toArray(vertices, 3 * 3);
                    if (isMiter) lastOuter.toArray(vertices, 0 * 3);
                }
            }
        }
        if (vertices) {
            var tri = [new Vector2(), new Vector2(), new Vector2()];
            var startFloat = vertexOffset * 3;
            for (var t = startFloat; t < currentCoordinate; t += 9) {
                tri[0].set(vertices[t], vertices[t + 1]);
                tri[1].set(vertices[t + 3], vertices[t + 4]);
                tri[2].set(vertices[t + 6], vertices[t + 7]);
                if (ShapeUtils.area(tri) < 0) {
                    vertices[t + 3] = tri[0].x;
                    vertices[t + 4] = tri[0].y;
                }
            }
        }
        return numVertices;
    }
}

export { SVGLoader };
