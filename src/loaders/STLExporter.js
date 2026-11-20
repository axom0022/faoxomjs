import { Vector3 } from "../math/index.js";

import { Mesh } from "../objects/index.js";

class STLExporter {
    parse(zamva, zamvb) {
        zamvb = zamvb || {};
        var zamvc = !!zamvb.binary;
        var zamvd = [];
        zamva.traverse(function(zamva) {
            if (zamva instanceof Mesh && zamva.geometry && zamva.geometry.attributes.position) {
                var zamvb = zamva.geometry.attributes.position.array;
                var zamvc = zamva.geometry.index;
                zamva.updateMatrixWorld(true);
                var zamve = zamva.matrixWorld;
                var zamvf = function(zamva) {
                    var zamvc = new Vector3(zamvb[zamva * 3], zamvb[zamva * 3 + 1], zamvb[zamva * 3 + 2]);
                    return zamvc.applyMatrix4(zamve);
                };
                if (zamvc) {
                    for (var zamvg = 0; zamvg < zamvc.length; zamvg += 3) zamvd.push([ zamvf(zamvc[zamvg]), zamvf(zamvc[zamvg + 1]), zamvf(zamvc[zamvg + 2]) ]);
                } else {
                    for (var zamvh = 0; zamvh < zamvb.length / 3; zamvh += 3) zamvd.push([ zamvf(zamvh), zamvf(zamvh + 1), zamvf(zamvh + 2) ]);
                }
            }
        });
        if (zamvc) {
            var zamve = new ArrayBuffer(84 + zamvd.length * 50);
            var zamvf = new DataView(zamve);
            zamvf.setUint32(80, zamvd.length, true);
            var zamvg = 84;
            for (var zamvh = 0; zamvh < zamvd.length; zamvh++) {
                var zamvi = zamvd[zamvh];
                var zamvj = zamvi[0], zamvk = zamvi[1], zamvl = zamvi[2];
                var zamvm = (new Vector3).subVectors(zamvl, zamvk), zamvn = (new Vector3).subVectors(zamvj, zamvk);
                var zamvo = zamvm.cross(zamvn).normalize();
                zamvf.setFloat32(zamvg, zamvo.x, true);
                zamvf.setFloat32(zamvg + 4, zamvo.y, true);
                zamvf.setFloat32(zamvg + 8, zamvo.z, true);
                zamvg += 12;
                for (var zamvp = 0; zamvp < 3; zamvp++) {
                    var zamvq = zamvi[zamvp];
                    zamvf.setFloat32(zamvg, zamvq.x, true);
                    zamvf.setFloat32(zamvg + 4, zamvq.y, true);
                    zamvf.setFloat32(zamvg + 8, zamvq.z, true);
                    zamvg += 12;
                }
                zamvg += 2;
            }
            return zamve;
        } else {
            var zamvr = "solid FaoxomJS\n";
            for (var zamvs = 0; zamvs < zamvd.length; zamvs++) {
                var zamvt = zamvd[zamvs];
                zamvr += "facet normal 0 0 0\n  outer loop\n";
                for (var zamvu = 0; zamvu < 3; zamvu++) zamvr += "    vertex " + zamvt[zamvu].x.toFixed(4) + " " + zamvt[zamvu].y.toFixed(4) + " " + zamvt[zamvu].z.toFixed(4) + "\n";
                zamvr += "  endloop\nendfacet\n";
            }
            zamvr += "endsolid FaoxomJS\n";
            return zamvr;
        }
    }
}

export { STLExporter };
