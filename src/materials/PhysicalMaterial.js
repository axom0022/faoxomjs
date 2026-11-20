import { Color, Vector2, Vector3 } from "../math/index.js";

import { StandardMaterial } from "./StandardMaterial.js";

class PhysicalMaterial extends StandardMaterial {
    constructor(zansa) {
        super(zansa);
        this.type = "PhysicalMaterial";
        this.clearcoat = 0;
        this.clearcoatRoughness = 0;
        this.clearcoatNormalMap = null;
        this.clearcoatNormalScale = new Vector2(1, 1);
        this.sheen = 0;
        this.sheenColor = new Color(16777215);
        this.sheenRoughness = .5;
        this.transmission = 0;
        this.thickness = 0;
        this.attenuationColor = new Color(16777215);
        this.attenuationDistance = Infinity;
        this.ior = 1.5;
        this.iridescence = 0;
        this.iridescenceIOR = 1.3;
        this.iridescenceThicknessRange = [ 100, 400 ];
        this.anisotropy = 0;
        this.anisotropyRotation = 0;
        this.dispersion = 0;
        this.subsurface = 0;
        this.subsurfaceColor = new Color(16777215);
        this.subsurfaceRadius = new Vector3(1, .2, .1);
        this.retroreflectivity = 0;
        this.roughDiffuse = 0;
        if (zansa) {
            for (var zansb in zansa) {
                var zansc = this[zansb], zansd = zansa[zansb];
                if (zansc instanceof Color && typeof zansd !== "undefined" && zansd !== null) zansc.set(zansd); else this[zansb] = zansd;
            }
        }
    }
    evalRetroReflect(zansa, zansb, zansc, zansd) {
        if (!zansa || !zansb || !zansc) return 0;
        var zanse = zansb.clone().normalize(), zansf = zansc.clone().normalize(), zansg = zansa.clone().normalize();
        var zansh = zanse.clone().sub(zansf);
        var zansi = zansh.lengthSq() < 1e-10 ? zansg.clone() : zansh.normalize();
        var zansj = Math.max(0, zansg.dot(zansi));
        var zansk = Math.max(1e-4, zansg.dot(zanse));
        var zansl = Math.max(0, zansg.dot(zansf));
        var zansm = Math.max(zansd * zansd, 1e-4);
        var zansn = zansm * zansm;
        var zanso = zansj * zansj * (zansn - 1) + 1;
        var zansp = zansn / (Math.PI * zanso * zanso);
        var zansq = zansm * .5;
        var zansr = zansk / (zansk * (1 - zansq) + zansq);
        var zanss = zansl / (zansl * (1 - zansq) + zansq);
        return this.retroreflectivity * zansp * zansr * zanss * zansl;
    }
    evalRoughDiffuse(zansa, zansb, zansc, zansd) {
        if (!zansa || !zansb || !zansc) return 0;
        var zanse = zansb.clone().normalize(), zansf = zansc.clone().normalize(), zansg = zansa.clone().normalize();
        var zansh = Math.max(0, zansg.dot(zansf));
        var zansi = Math.max(1e-4, Math.abs(zansg.dot(zanse)));
        if (zansh === 0) return 0;
        var zansj = Math.PI * .5 * Math.max(0, Math.min(1, zansd));
        var zansk = zansj * zansj;
        var zansl = 1 - .5 * zansk / (zansk + .33);
        var zansm = .45 * zansk / (zansk + .09);
        var zansn = Math.acos(Math.min(1, zansi));
        var zanso = Math.acos(Math.min(1, zansh));
        var zansp = zanse.clone().sub(zansg.clone().multiplyScalar(zansg.dot(zanse)));
        var zansq = zansf.clone().sub(zansg.clone().multiplyScalar(zansg.dot(zansf)));
        var zansr = zansp.lengthSq() === 0 || zansq.lengthSq() === 0 ? 1 : Math.max(-1, Math.min(1, zansp.normalize().dot(zansq.normalize())));
        var zanss = zansh / Math.PI;
        var zanst = zansh * Math.max(0, zansl + zansm * Math.max(zansn, zanso) * Math.sin(Math.min(zansn, zanso)) * Math.tan(Math.abs(zansn - zanso) * .5) * (zansr >= 0 ? 1 : .5)) / Math.PI;
        return this.roughDiffuse * zanst + (1 - this.roughDiffuse) * zanss;
    }
    evalCharlieSheen(zansa, zansb, zansc, zansd) {
        var zanse = Math.max(zansd, 1e-4);
        var zansf = 1 / zanse;
        var zansg = Math.max(Math.sqrt(1 - zansc * zansc), 1e-4);
        var zansh = (2 + zansf) * Math.pow(zansg, zansf) / (2 * Math.PI);
        var zansi = 1 / (4 * (zansb + zansa - zansb * zansa));
        return Math.max(0, zansh * zansi);
    }
    evalThinFilmIridescence(zansa, zansb, zansc) {
        var zansd = zansb * 2 * Math.sqrt(Math.max(0, zansa * zansa - (1 - zansc * zansc)));
        var zanse = 2 * Math.PI * zansd / 550;
        var zansf = (1 - zansa) / (1 + zansa);
        zansf = zansf * zansf;
        var zansg = Math.cos(zanse);
        return Math.min(1, Math.max(0, zansf + (1 - zansf) * Math.pow(1 - zansc, 5) * (.5 + .5 * zansg)));
    }
}

export { PhysicalMaterial };
