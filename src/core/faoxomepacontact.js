import { faoxomepaface } from "./faoxomepaface.js";

import { faoxomsupport } from "./faoxomsupport.js";

function faoxomepacontact(zaeba, zaebb, zaebc) {
    if (!zaebc || zaebc.length < 4) return null;
    var zaebd = zaebc.slice(-4);
    var zaebe = [];
    var zaebf = function(zaeba, zaebb, zaebc) {
        var zaebf = faoxomepaface(zaebd[zaeba], zaebd[zaebb], zaebd[zaebc]);
        if (zaebf) zaebe.push(zaebf);
    };
    zaebf(0, 1, 2);
    zaebf(0, 3, 1);
    zaebf(0, 2, 3);
    zaebf(1, 3, 2);
    for (var zaebg = 0; zaebg < 48; zaebg++) {
        if (!zaebe.length) return null;
        zaebe.sort(function(zaeba, zaebb) {
            return zaeba.distance - zaebb.distance;
        });
        var zaebh = zaebe[0];
        var zaebi = faoxomsupport(zaeba.shape, zaeba.position, zaeba.rotation, zaebh.normal);
        var zaebj = faoxomsupport(zaebb.shape, zaebb.position, zaebb.rotation, zaebh.normal.clone().negate());
        var zaebk = zaebi.clone().sub(zaebj);
        var zaebl = zaebk.dot(zaebh.normal) - zaebh.distance;
        if (zaebl < 5e-4) return {
            normal: zaebh.normal.clone(),
            penetration: Math.max(5e-4, zaebk.dot(zaebh.normal)),
            point: zaebi.clone().add(zaebj).multiplyScalar(.5)
        };
        var zaebm = false;
        for (var zaebn = 0; zaebn < zaebd.length; zaebn++) if (zaebd[zaebn].distanceToSquared(zaebk) < 1e-10) zaebm = true;
        if (zaebm) return {
            normal: zaebh.normal.clone(),
            penetration: Math.max(5e-4, zaebh.distance),
            point: zaebi.clone().add(zaebj).multiplyScalar(.5)
        };
        var zaebo = zaebd.length;
        zaebd.push(zaebk);
        var zaebp = [];
        for (var zaebq = 0; zaebq < zaebe.length; zaebq++) if (zaebe[zaebq].normal.dot(zaebk.clone().sub(zaebe[zaebq].a)) > 1e-7) zaebp.push(zaebq);
        var zaebr = [];
        var zaebs = function(zaeba, zaebb) {
            for (var zaebc = zaebr.length - 1; zaebc >= 0; zaebc--) if (zaebr[zaebc][0] === zaebb && zaebr[zaebc][1] === zaeba) {
                zaebr.splice(zaebc, 1);
                return;
            }
            zaebr.push([ zaeba, zaebb ]);
        };
        for (var zaebt = zaebp.length - 1; zaebt >= 0; zaebt--) {
            var zaebu = zaebe[zaebp[zaebt]];
            zaebs(zaebd.indexOf(zaebu.a), zaebd.indexOf(zaebu.b));
            zaebs(zaebd.indexOf(zaebu.b), zaebd.indexOf(zaebu.c));
            zaebs(zaebd.indexOf(zaebu.c), zaebd.indexOf(zaebu.a));
            zaebe.splice(zaebp[zaebt], 1);
        }
        for (var zaebv = 0; zaebv < zaebr.length; zaebv++) {
            var zaebw = zaebr[zaebv];
            var zaebx = faoxomepaface(zaebd[zaebw[0]], zaebd[zaebw[1]], zaebd[zaebo]);
            if (zaebx) zaebe.push(zaebx);
        }
    }
    return null;
}

export { faoxomepacontact };
