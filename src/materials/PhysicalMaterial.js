import { Color, Vector2, Vector3 } from "../math/index.js";
import { StandardMaterial } from "./StandardMaterial.js";

class PhysicalMaterial extends StandardMaterial {
    constructor(parameters) {
        super(parameters);
        this.type = "PhysicalMaterial";
        this.clearcoat = 0.0;
        this.clearcoatRoughness = 0.0;
        this.clearcoatNormalMap = null;
        this.clearcoatNormalScale = new Vector2(1, 1);
        this.sheen = 0.0;
        this.sheenColor = new Color(0xffffff);
        this.sheenRoughness = 0.5;
        this.transmission = 0.0;
        this.thickness = 0.0;
        this.attenuationColor = new Color(0xffffff);
        this.attenuationDistance = Infinity;
        this.ior = 1.5;
        this.iridescence = 0.0;
        this.iridescenceIOR = 1.3;
        this.iridescenceThicknessRange = [100, 400];
        this.anisotropy = 0.0;
        this.anisotropyRotation = 0.0;
        this.dispersion = 0.0;
        this.subsurface = 0.0;
        this.subsurfaceColor = new Color(0xffffff);
        this.subsurfaceRadius = new Vector3(1.0, 0.2, 0.1);
        this.retroreflectivity = 0.0;
        this.roughDiffuse = 0.0;
        if (parameters) {
            for (var key in parameters) this[key] = parameters[key];
        }
    }
    evalRetroReflect(normal, viewDir, lightDir, roughness) {
        if (!normal || !viewDir || !lightDir) return 0;
        var v = viewDir.clone().normalize(), l = lightDir.clone().normalize(), n = normal.clone().normalize();
        var back = v.clone().sub(l);
        var h = back.lengthSq() < 1e-10 ? n.clone() : back.normalize();
        var NdotH = Math.max(0, n.dot(h));
        var NdotV = Math.max(1e-4, n.dot(v));
        var NdotL = Math.max(0, n.dot(l));
        var a = Math.max(roughness * roughness, 1e-4);
        var a2 = a * a;
        var denominator = NdotH * NdotH * (a2 - 1) + 1;
        var D = a2 / (Math.PI * denominator * denominator);
        var k = a * 0.5;
        var GV = NdotV / (NdotV * (1 - k) + k);
        var GL = NdotL / (NdotL * (1 - k) + k);
        return this.retroreflectivity * D * GV * GL * NdotL;
    }
    evalRoughDiffuse(normal, viewDir, lightDir, roughness) {
        if (!normal || !viewDir || !lightDir) return 0;
        var v = viewDir.clone().normalize(), l = lightDir.clone().normalize(), n = normal.clone().normalize();
        var NdotL = Math.max(0, n.dot(l));
        var NdotV = Math.max(1e-4, Math.abs(n.dot(v)));
        if (NdotL === 0) return 0;
        var sigma = (Math.PI * 0.5) * Math.max(0, Math.min(1, roughness));
        var sigma2 = sigma * sigma;
        var A = 1 - 0.5 * sigma2 / (sigma2 + 0.33);
        var B = 0.45 * sigma2 / (sigma2 + 0.09);
        var thetaV = Math.acos(Math.min(1, NdotV));
        var thetaL = Math.acos(Math.min(1, NdotL));
        var vPerp = v.clone().sub(n.clone().multiplyScalar(n.dot(v)));
        var lPerp = l.clone().sub(n.clone().multiplyScalar(n.dot(l)));
        var cosPhi = vPerp.lengthSq() === 0 || lPerp.lengthSq() === 0 ? 1 : Math.max(-1, Math.min(1, vPerp.normalize().dot(lPerp.normalize())));
        var lambert = NdotL / Math.PI;
        var orenNayar = NdotL * Math.max(0, A + B * Math.max(thetaV, thetaL) * Math.sin(Math.min(thetaV, thetaL)) * Math.tan(Math.abs(thetaV - thetaL) * 0.5) * (cosPhi >= 0 ? 1 : 0.5)) / Math.PI;
        return this.roughDiffuse * orenNayar + (1 - this.roughDiffuse) * lambert;
    }
    evalCharlieSheen(NdotV, NdotL, NdotH, roughness) {
        var r = Math.max(roughness, 0.0001);
        var invR = 1.0 / r;
        var sinH = Math.max(Math.sqrt(1.0 - NdotH * NdotH), 0.0001);
        var D = (2.0 + invR) * Math.pow(sinH, invR) / (2.0 * Math.PI);
        var V = 1.0 / (4.0 * (NdotL + NdotV - NdotL * NdotV));
        return Math.max(0.0, D * V);
    }
    evalThinFilmIridescence(ior, thickness, cosTheta) {
        var d1 = thickness * 2.0 * Math.sqrt(Math.max(0.0, ior * ior - (1.0 - cosTheta * cosTheta)));
        var phi = (2.0 * Math.PI * d1) / 550.0;
        var r0 = (1.0 - ior) / (1.0 + ior);
        r0 = r0 * r0;
        var cosPhi = Math.cos(phi);
        return Math.min(1.0, Math.max(0.0, r0 + (1.0 - r0) * Math.pow(1.0 - cosTheta, 5.0) * (0.5 + 0.5 * cosPhi)));
    }
}

export { PhysicalMaterial };
