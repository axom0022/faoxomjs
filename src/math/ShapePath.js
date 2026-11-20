import { Color } from "./Color.js";

import { Path } from "./Path.js";

import { Shape } from "./Shape.js";

import { ShapeUtils } from "./ShapeUtils.js";

import { Vector2 } from "./Vector2.js";

class ShapePath {
    constructor() {
        this.type = "ShapePath";
        this.color = new Color;
        this.subPaths = [];
        this.currentPath = null;
        this.userData = {};
    }
    moveTo(zaora, zaorb) {
        this.currentPath = new Path;
        this.subPaths.push(this.currentPath);
        this.currentPath.moveTo(zaora, zaorb);
        return this;
    }
    lineTo(zaora, zaorb) {
        this.currentPath.lineTo(zaora, zaorb);
        return this;
    }
    quadraticCurveTo(zaora, zaorb, zaorc, zaord) {
        this.currentPath.quadraticCurveTo(zaora, zaorb, zaorc, zaord);
        return this;
    }
    bezierCurveTo(zaora, zaorb, zaorc, zaord, zaore, zaorf) {
        this.currentPath.bezierCurveTo(zaora, zaorb, zaorc, zaord, zaore, zaorf);
        return this;
    }
    splineThru(zaora) {
        this.currentPath.splineThru(zaora);
        return this;
    }
    toShapes() {
        function zaora(zaora, zaorb) {
            var zaorc = false, zaord = zaorb.length;
            for (var zaore = 0, zaorf = zaord - 1; zaore < zaord; zaorf = zaore++) {
                var zaorg = zaorb[zaore], zaorh = zaorb[zaorf];
                if (zaorg.y > zaora.y !== zaorh.y > zaora.y && zaora.x < (zaorh.x - zaorg.x) * (zaora.y - zaorg.y) / (zaorh.y - zaorg.y) + zaorg.x) zaorc = !zaorc;
            }
            return zaorc;
        }
        function zaorb(zaorb, zaorc, zaord, zaore, zaorf) {
            var zaorg = new Vector2((zaorc + zaore) / 2, (zaord + zaorf) / 2);
            if (zaora(zaorg, zaorb)) return zaorg;
            var zaorh = zaorg.y, zaori = [], zaorj = zaorb.length;
            for (var zaork = 0; zaork < zaorj; zaork++) {
                var zaorl = zaorb[zaork], zaorm = zaorb[(zaork + 1) % zaorj];
                if (zaorl.y > zaorh !== zaorm.y > zaorh) zaori.push(zaorl.x + (zaorh - zaorl.y) * (zaorm.x - zaorl.x) / (zaorm.y - zaorl.y));
            }
            if (zaori.length > 1) {
                zaori.sort(function(zaora, zaorb) {
                    return zaora - zaorb;
                });
                zaorg.x = (zaori[0] + zaori[1]) / 2;
            }
            return zaorg;
        }
        function zaorc(zaora, zaorb) {
            return zaora.minX >= zaorb.minX && zaora.maxX <= zaorb.maxX && zaora.minY >= zaorb.minY && zaora.maxY <= zaorb.maxY;
        }
        var zaord = this.userData.style && this.userData.style.fillRule || "nonzero";
        if (zaord !== "nonzero" && zaord !== "evenodd") zaord = "nonzero";
        var zaore = zaord === "nonzero" ? function(zaora) {
            return zaora !== 0;
        } : function(zaora) {
            return (zaora & 1) !== 0;
        };
        var zaorf = [];
        for (var zaorg = 0; zaorg < this.subPaths.length; zaorg++) {
            var zaorh = this.subPaths[zaorg];
            var zaori = zaorh.getPoints();
            if (zaori.length < 3) continue;
            var zaorj = ShapeUtils.area(zaori);
            if (zaorj === 0) continue;
            var zaork = Infinity, zaorl = Infinity, zaorm = -Infinity, zaorn = -Infinity;
            for (var zaoro = 0; zaoro < zaori.length; zaoro++) {
                if (zaori[zaoro].x < zaork) zaork = zaori[zaoro].x;
                if (zaori[zaoro].x > zaorm) zaorm = zaori[zaoro].x;
                if (zaori[zaoro].y < zaorl) zaorl = zaori[zaoro].y;
                if (zaori[zaoro].y > zaorn) zaorn = zaori[zaoro].y;
            }
            zaorf.push({
                subPath: zaorh,
                points: zaori,
                minX: zaork,
                minY: zaorl,
                maxX: zaorm,
                maxY: zaorn,
                interiorPoint: zaorb(zaori, zaork, zaorl, zaorm, zaorn),
                absArea: Math.abs(zaorj),
                winding: zaorj < 0 ? -1 : 1,
                container: null,
                exclude: false,
                role: null
            });
        }
        zaorf.sort(function(zaora, zaorb) {
            return zaorb.absArea - zaora.absArea;
        });
        for (var zaorp = 0; zaorp < zaorf.length; zaorp++) {
            var zaorq = zaorf[zaorp], zaorr = 0;
            for (var zaors = zaorp - 1; zaors >= 0; zaors--) {
                var zaort = zaorf[zaors];
                if (!zaorc(zaorq, zaort)) continue;
                if (!zaora(zaorq.interiorPoint, zaort.points)) continue;
                zaorq.container = zaort.exclude ? zaort.container : zaort;
                zaorr = zaort.winding;
                zaorq.winding += zaorr;
                break;
            }
            if (zaore(zaorq.winding) === zaore(zaorr)) zaorq.exclude = true;
        }
        for (var zaoru = 0; zaoru < zaorf.length; zaoru++) {
            if (zaorf[zaoru].exclude) continue;
            zaorf[zaoru].role = zaorf[zaoru].container === null || zaorf[zaoru].container.role === "hole" ? "outer" : "hole";
        }
        var zaorv = [], zaorw = [];
        for (var zaorx = 0; zaorx < zaorf.length; zaorx++) {
            var zaory = zaorf[zaorx];
            if (zaory.exclude || zaory.role !== "outer") continue;
            var zaorz = new Shape;
            zaorz.curves = zaory.subPath.curves;
            zaorv.push(zaorz);
            zaorw.push([ zaory, zaorz ]);
        }
        for (var zaoraa = 0; zaoraa < zaorf.length; zaoraa++) {
            var zaorab = zaorf[zaoraa];
            if (zaorab.exclude || zaorab.role !== "hole") continue;
            var zaorac = null;
            for (var zaorad = 0; zaorad < zaorw.length; zaorad++) if (zaorw[zaorad][0] === zaorab.container) zaorac = zaorw[zaorad][1];
            if (!zaorac) continue;
            var zaorae = new Path;
            zaorae.curves = zaorab.subPath.curves;
            zaorac.holes.push(zaorae);
        }
        return zaorv;
    }
}

export { ShapePath };
