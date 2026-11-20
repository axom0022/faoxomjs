import { Quaternion, Vector3 } from "../math/index.js";

function faoxomobbcontact(zafna, zafnb) {
    var zafnc = zafna.shape.size.clone().multiplyScalar(.5);
    var zafnd = zafnb.shape.size.clone().multiplyScalar(.5);
    var zafne = zafna.rotation || new Quaternion;
    var zafnf = zafnb.rotation || new Quaternion;
    var zafng = [ new Vector3(1, 0, 0).applyQuaternion(zafne), new Vector3(0, 1, 0).applyQuaternion(zafne), new Vector3(0, 0, 1).applyQuaternion(zafne) ];
    var zafnh = [ new Vector3(1, 0, 0).applyQuaternion(zafnf), new Vector3(0, 1, 0).applyQuaternion(zafnf), new Vector3(0, 0, 1).applyQuaternion(zafnf) ];
    var zafni = zafng.concat(zafnh);
    for (var zafnj = 0; zafnj < 3; zafnj++) for (var zafnk = 0; zafnk < 3; zafnk++) {
        var zafnl = (new Vector3).crossVectors(zafng[zafnj], zafnh[zafnk]);
        if (zafnl.lengthSq() > 1e-8) zafni.push(zafnl.normalize());
    }
    var zafnm = (new Vector3).subVectors(zafnb.position, zafna.position);
    var zafnn = Infinity;
    var zafno = null;
    for (var zafnp = 0; zafnp < zafni.length; zafnp++) {
        var zafnq = zafni[zafnp].clone().normalize();
        var zafnr = zafnc.x * Math.abs(zafnq.dot(zafng[0])) + zafnc.y * Math.abs(zafnq.dot(zafng[1])) + zafnc.z * Math.abs(zafnq.dot(zafng[2]));
        var zafns = zafnd.x * Math.abs(zafnq.dot(zafnh[0])) + zafnd.y * Math.abs(zafnq.dot(zafnh[1])) + zafnd.z * Math.abs(zafnq.dot(zafnh[2]));
        var zafnt = zafnr + zafns - Math.abs(zafnm.dot(zafnq));
        if (zafnt <= 0) return null;
        if (zafnt < zafnn) {
            zafnn = zafnt;
            zafno = zafnq;
            if (zafno.dot(zafnm) < 0) zafno.negate();
        }
    }
    var zafnu = (new Vector3).addVectors(zafna.position, zafnb.position).multiplyScalar(.5);
    return {
        normal: zafno,
        penetration: zafnn,
        point: zafnu
    };
}

export { faoxomobbcontact };
