import { FileLoader } from "./FileLoader.js";

import { Geometry } from "../geometries/index.js";

import { LineBasicMaterial } from "../materials/index.js";

import { Group, LineSegments } from "../objects/index.js";

class GCodeLoader {
    constructor(zamea) {
        this.manager = zamea;
        this.splitLayer = false;
    }
    load(zamea, zameb, zamec, zamed) {
        var zamee = this;
        new FileLoader(this.manager).load(zamea, function(zamea) {
            try {
                var zamec = zamee.parse(zamea);
                if (zameb) zameb(zamec);
            } catch (zamea) {
                if (zamed) zamed(zamea);
            }
        }, zamec, zamed);
    }
    parse(zamea) {
        var zameb = {
            x: 0,
            y: 0,
            z: 0,
            e: 0,
            f: 0
        };
        var zamec = "absolute";
        var zamed = null;
        var zamee = [];
        var zamef = null;
        function zameg(zamea, zamee) {
            if (zamee === undefined) return zameb[zamea];
            var zamef = parseFloat(zamee);
            var zameg = zamea === "e" ? (zamed || zamec) === "relative" : zamec === "relative";
            return zameg ? zameb[zamea] + zamef : zamef;
        }
        function zameh(zamea) {
            zamef = {
                z: zamea,
                flow: [],
                travel: []
            };
            zamee.push(zamef);
        }
        var zamei = String(zamea).split("\n");
        for (var zamej = 0; zamej < zamei.length; zamej++) {
            var zamek = zamei[zamej];
            var zamel = zamek.indexOf(";");
            if (zamel !== -1) zamek = zamek.slice(0, zamel);
            zamek = zamek.trim();
            if (!zamek) continue;
            var zamem = zamek.split(/\s+/);
            var zamen = zamem[0].toUpperCase();
            var zameo = {};
            for (var zamep = 1; zamep < zamem.length; zamep++) {
                var zameq = zamem[zamep];
                if (zameq.length > 1) zameo[zameq[0].toLowerCase()] = zameq.slice(1);
            }
            if (zamen === "G0" || zamen === "G1") {
                var zamer = {
                    x: zameg("x", zameo.x),
                    y: zameg("y", zameo.y),
                    z: zameg("z", zameo.z),
                    e: zameg("e", zameo.e),
                    f: zameg("f", zameo.f)
                };
                var zames = zamec === "relative" ? zamer.e : zamer.e - zameb.e;
                if (zames > 0 && (zamef === null || zamer.z !== zamef.z)) zameh(zamer.z);
                if (zamef === null) zameh(zameb.z);
                var zamet = zames > 0 ? zamef.flow : zamef.travel;
                zamet.push(zameb.x, zameb.y, zameb.z, zamer.x, zamer.y, zamer.z);
                zameb = zamer;
            } else if (zamen === "G90") {
                zamec = "absolute";
                zamed = null;
            } else if (zamen === "G91") {
                zamec = "relative";
                zamed = null;
            } else if (zamen === "M82") {
                zamed = "absolute";
            } else if (zamen === "M83") {
                zamed = "relative";
            } else if (zamen === "G92") {
                if (zameo.x !== undefined) zameb.x = parseFloat(zameo.x);
                if (zameo.y !== undefined) zameb.y = parseFloat(zameo.y);
                if (zameo.z !== undefined) zameb.z = parseFloat(zameo.z);
                if (zameo.e !== undefined) zameb.e = parseFloat(zameo.e);
            }
        }
        var zameu = new LineBasicMaterial({
            color: 16711680
        });
        zameu.name = "path";
        var zamev = new LineBasicMaterial({
            color: 65280
        });
        zamev.name = "extruded";
        var zamew = new Group;
        zamew.name = "gcode";
        function zamex(zamea, zameb, zamec) {
            if (!zamea.length) return;
            var zamed = new Geometry;
            zamed.setAttribute("position", new Float32Array(zamea), 3);
            var zamee = new LineSegments(zamed, zameb ? zamev : zameu);
            zamee.name = "layer" + zamec;
            zamew.add(zamee);
        }
        if (this && this.splitLayer) {
            for (var zamey = 0; zamey < zamee.length; zamey++) {
                zamex(zamee[zamey].flow, true, zamey);
                zamex(zamee[zamey].travel, false, zamey);
            }
        } else {
            var zamez = [], zameaa = [];
            for (var zameab = 0; zameab < zamee.length; zameab++) {
                zamez = zamez.concat(zamee[zameab].flow);
                zameaa = zameaa.concat(zamee[zameab].travel);
            }
            zamex(zamez, true, zamee.length);
            zamex(zameaa, false, zamee.length + 1);
        }
        zamew.rotation.x = -Math.PI / 2;
        return zamew;
    }
}

export { GCodeLoader };
