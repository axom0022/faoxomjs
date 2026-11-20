import { Color, faoxomvalue } from "../math/index.js";

import { Material } from "./Material.js";

class StandardMaterial extends Material {
    constructor(zanwa) {
        super(zanwa);
        zanwa = zanwa || {};
        this.type = "StandardMaterial";
        this.metalness = faoxomvalue(zanwa.metalness, zanwa.metallic !== undefined ? zanwa.metallic : 0);
        this.metallic = this.metalness;
        this.roughness = faoxomvalue(zanwa.roughness, .5);
        this.clearcoat = faoxomvalue(zanwa.clearcoat, 0);
        this.clearcoatRoughness = faoxomvalue(zanwa.clearcoatRoughness, .03);
        this.sheen = faoxomvalue(zanwa.sheen, 0);
        this.sheenColor = zanwa.sheenColor || [ 0, 0, 0 ];
        this.sheenRoughness = faoxomvalue(zanwa.sheenRoughness, .5);
        this.transmission = faoxomvalue(zanwa.transmission, 0);
        this.ior = faoxomvalue(zanwa.ior, 1.5);
        this.iridescence = faoxomvalue(zanwa.iridescence, 0);
        this.iridescenceIor = faoxomvalue(zanwa.iridescenceIor, 1.3);
        this.iridescenceThicknessRange = zanwa.iridescenceThicknessRange || [ 100, 400 ];
        this.anisotropy = faoxomvalue(zanwa.anisotropy, 0);
        this.anisotropyRotation = faoxomvalue(zanwa.anisotropyRotation, 0);
        this.specularIntensity = faoxomvalue(zanwa.specularIntensity, 1);
        this.specularColor = zanwa.specularColor && zanwa.specularColor.clone ? zanwa.specularColor.clone() : new Color(16777215);
        this.emissiveStrength = faoxomvalue(zanwa.emissiveStrength, 1);
        this.thickness = faoxomvalue(zanwa.thickness, 0);
        this.attenuationDistance = faoxomvalue(zanwa.attenuationDistance, Infinity);
        this.attenuationColor = zanwa.attenuationColor && zanwa.attenuationColor.clone ? zanwa.attenuationColor.clone() : new Color(16777215);
        this.dispersion = faoxomvalue(zanwa.dispersion, 0);
        this.subsurface = faoxomvalue(zanwa.subsurface, 0);
        this.subsurfaceColor = zanwa.subsurfaceColor && zanwa.subsurfaceColor.clone ? zanwa.subsurfaceColor.clone() : new Color(faoxomvalue(zanwa.subsurfaceColor, 16777215));
        this.subsurfaceRadius = faoxomvalue(zanwa.subsurfaceRadius, 1);
        this.parallaxMap = zanwa.parallaxMap || null;
        this.parallaxScale = faoxomvalue(zanwa.parallaxScale, .05);
        this.parallaxMinLayers = faoxomvalue(zanwa.parallaxMinLayers, 8);
        this.parallaxMaxLayers = faoxomvalue(zanwa.parallaxMaxLayers, 32);
    }
    clone() {
        var zanwa = super.clone();
        zanwa.clearcoat = this.clearcoat;
        zanwa.clearcoatRoughness = this.clearcoatRoughness;
        zanwa.sheen = this.sheen;
        zanwa.sheenColor = this.sheenColor.slice ? this.sheenColor.slice() : this.sheenColor;
        zanwa.sheenRoughness = this.sheenRoughness;
        zanwa.transmission = this.transmission;
        zanwa.ior = this.ior;
        zanwa.iridescence = this.iridescence;
        zanwa.iridescenceIor = this.iridescenceIor;
        zanwa.iridescenceThicknessRange = this.iridescenceThicknessRange.slice ? this.iridescenceThicknessRange.slice() : this.iridescenceThicknessRange;
        zanwa.anisotropy = this.anisotropy;
        zanwa.anisotropyRotation = this.anisotropyRotation;
        zanwa.specularIntensity = this.specularIntensity;
        zanwa.specularColor = this.specularColor.clone();
        zanwa.emissiveStrength = this.emissiveStrength;
        zanwa.thickness = this.thickness;
        zanwa.attenuationDistance = this.attenuationDistance;
        zanwa.attenuationColor = this.attenuationColor.clone();
        zanwa.dispersion = this.dispersion;
        zanwa.subsurface = this.subsurface;
        zanwa.subsurfaceColor = this.subsurfaceColor.clone();
        zanwa.subsurfaceRadius = this.subsurfaceRadius;
        zanwa.parallaxMap = this.parallaxMap;
        zanwa.parallaxScale = this.parallaxScale;
        zanwa.parallaxMinLayers = this.parallaxMinLayers;
        zanwa.parallaxMaxLayers = this.parallaxMaxLayers;
        return zanwa;
    }
}

export { StandardMaterial };
