import { Vector3 } from "../math/index.js";

function faoxomgjksimplex(zafaa, zafab) {
    var zafac = zafaa[zafaa.length - 1];
    var zafad = zafac.clone().negate();
    if (zafaa.length === 2) {
        var zafae = zafaa[0];
        var zafaf = zafae.clone().sub(zafac);
        if (zafaf.dot(zafad) > 0) zafab.copy((new Vector3).crossVectors((new Vector3).crossVectors(zafaf, zafad), zafaf)); else {
            zafaa.splice(0, 1);
            zafab.copy(zafad);
        }
        return false;
    }
    if (zafaa.length === 3) {
        var zafag = zafaa[1];
        var zafah = zafaa[0];
        var zafai = zafag.clone().sub(zafac);
        var zafaj = zafah.clone().sub(zafac);
        var zafak = (new Vector3).crossVectors(zafai, zafaj);
        var zafal = (new Vector3).crossVectors(zafai, zafak);
        if (zafal.dot(zafad) > 0) {
            zafaa.splice(0, 1);
            zafab.copy((new Vector3).crossVectors((new Vector3).crossVectors(zafai, zafad), zafai));
            return false;
        }
        var zafam = (new Vector3).crossVectors(zafak, zafaj);
        if (zafam.dot(zafad) > 0) {
            zafaa.splice(1, 1);
            zafab.copy((new Vector3).crossVectors((new Vector3).crossVectors(zafaj, zafad), zafaj));
            return false;
        }
        if (zafak.dot(zafad) > 0) zafab.copy(zafak); else {
            var zafan = zafaa[0];
            zafaa[0] = zafaa[1];
            zafaa[1] = zafan;
            zafab.copy(zafak).negate();
        }
        return false;
    }
    var zafao = zafaa[2];
    var zafap = zafaa[1];
    var zafaq = zafaa[0];
    var zafar = zafao.clone().sub(zafac);
    var zafas = zafap.clone().sub(zafac);
    var zafat = zafaq.clone().sub(zafac);
    var zafau = (new Vector3).crossVectors(zafar, zafas);
    var zafav = (new Vector3).crossVectors(zafas, zafat);
    var zafaw = (new Vector3).crossVectors(zafat, zafar);
    if (zafau.dot(zafad) > 0) {
        zafaa.splice(0, 1);
        zafab.copy(zafau);
        return false;
    }
    if (zafav.dot(zafad) > 0) {
        zafaa.splice(2, 1);
        zafab.copy(zafav);
        return false;
    }
    if (zafaw.dot(zafad) > 0) {
        zafaa.splice(1, 1);
        zafab.copy(zafaw);
        return false;
    }
    return true;
}

export { faoxomgjksimplex };
