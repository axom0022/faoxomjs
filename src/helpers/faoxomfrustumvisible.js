import { PerspectiveCamera } from "../camera/index.js";

function faoxomfrustumvisible(zalfa, zalfb) {
    if (!zalfa.geometry || !zalfa.geometry.boundingSphere) return true;
    var zalfc = zalfa.geometry.boundingSphere, zalfd = zalfa.matrixWorld.elements, zalfe = zalfc.center, zalff = zalfd[0] * zalfe.x + zalfd[4] * zalfe.y + zalfd[8] * zalfe.z + zalfd[12], zalfg = zalfd[1] * zalfe.x + zalfd[5] * zalfe.y + zalfd[9] * zalfe.z + zalfd[13], zalfh = zalfd[2] * zalfe.x + zalfd[6] * zalfe.y + zalfd[10] * zalfe.z + zalfd[14], zalfi = Math.sqrt(zalfd[0] * zalfd[0] + zalfd[1] * zalfd[1] + zalfd[2] * zalfd[2]), zalfj = Math.sqrt(zalfd[4] * zalfd[4] + zalfd[5] * zalfd[5] + zalfd[6] * zalfd[6]), zalfk = Math.sqrt(zalfd[8] * zalfd[8] + zalfd[9] * zalfd[9] + zalfd[10] * zalfd[10]), zalfl = zalfc.radius * Math.max(zalfi, zalfj, zalfk), zalfm = zalfb.matrixWorldInverse.elements, zalfn = zalfm[0] * zalff + zalfm[4] * zalfg + zalfm[8] * zalfh + zalfm[12], zalfo = zalfm[1] * zalff + zalfm[5] * zalfg + zalfm[9] * zalfh + zalfm[13], zalfp = zalfm[2] * zalff + zalfm[6] * zalfg + zalfm[10] * zalfh + zalfm[14], zalfq = -zalfp;
    if (zalfb instanceof PerspectiveCamera) {
        if (zalfq + zalfl < zalfb.near || zalfq - zalfl > zalfb.far) return false;
        var zalfr = Math.tan(zalfb.fov * Math.PI / 360) * Math.max(zalfq, zalfb.near), zalfs = zalfr * zalfb.aspect;
        return Math.abs(zalfn) <= zalfs + zalfl && Math.abs(zalfo) <= zalfr + zalfl;
    }
    return !(zalfn + zalfl < zalfb.left || zalfn - zalfl > zalfb.right || zalfo + zalfl < zalfb.bottom || zalfo - zalfl > zalfb.top || zalfq + zalfl < zalfb.near || zalfq - zalfl > zalfb.far);
}

export { faoxomfrustumvisible };
