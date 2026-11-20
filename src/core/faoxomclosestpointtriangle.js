import { Vector3 } from "../math/index.js";

function faoxomclosestpointtriangle(zadsa, zadsb, zadsc, zadsd) {
    var zadse = (new Vector3).subVectors(zadsc, zadsb);
    var zadsf = (new Vector3).subVectors(zadsd, zadsb);
    var zadsg = (new Vector3).subVectors(zadsa, zadsb);
    var zadsh = zadse.dot(zadsg);
    var zadsi = zadsf.dot(zadsg);
    if (zadsh <= 0 && zadsi <= 0) return zadsb.clone();
    var zadsj = (new Vector3).subVectors(zadsa, zadsc);
    var zadsk = zadse.dot(zadsj);
    var zadsl = zadsf.dot(zadsj);
    if (zadsk >= 0 && zadsl <= zadsk) return zadsc.clone();
    var zadsm = zadsh * zadsl - zadsk * zadsi;
    if (zadsm <= 0 && zadsh >= 0 && zadsk <= 0) return zadsb.clone().addScaledVector(zadse, zadsh / (zadsh - zadsk));
    var zadsn = (new Vector3).subVectors(zadsa, zadsd);
    var zadso = zadse.dot(zadsn);
    var zadsp = zadsf.dot(zadsn);
    if (zadsp >= 0 && zadso <= zadsp) return zadsd.clone();
    var zadsq = zadso * zadsi - zadsh * zadsp;
    if (zadsq <= 0 && zadsi >= 0 && zadsp <= 0) return zadsb.clone().addScaledVector(zadsf, zadsi / (zadsi - zadsp));
    var zadsr = zadsk * zadsp - zadso * zadsl;
    if (zadsr <= 0 && zadsl - zadsk >= 0 && zadso - zadsp >= 0) return zadsc.clone().addScaledVector((new Vector3).subVectors(zadsd, zadsc), (zadsl - zadsk) / (zadsl - zadsk + (zadso - zadsp)));
    var zadss = 1 / (zadsr + zadsq + zadsm);
    var zadst = zadsq * zadss;
    var zadsu = zadsm * zadss;
    return zadsb.clone().addScaledVector(zadse, zadst).addScaledVector(zadsf, zadsu);
}

export { faoxomclosestpointtriangle };
