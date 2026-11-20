import { faoxomarray } from "../core/index.js";

import { Color, Quaternion, Vector2, Vector3, Vector4 } from "../math/index.js";

class AnimationTrack {
    constructor(zabba, zabbb, zabbc, zabbd, zabbe) {
        this.name = zabba || "";
        this.times = faoxomarray(zabbb);
        this.values = zabbc || [];
        this.valueType = zabbd || "number";
        this.interpolation = zabbe || "LINEAR";
        this.cubicSpline = this.interpolation === "CUBICSPLINE";
        this.valueSize = this.valueType === "number" ? 1 : this.valueType === "array" ? this.times.length ? this.values.length / this.times.length / (this.cubicSpline ? 3 : 1) : 1 : this.valueType === "quaternion" ? 4 : this.valueType === "color" ? 3 : this.valueType === "vector2" ? 2 : this.valueType === "vector4" ? 4 : 3;
    }
    valueOffset(zabba, zabbb) {
        return this.cubicSpline ? (zabba * 3 + (zabbb || 1)) * this.valueSize : zabba * this.valueSize;
    }
    retime(zabba) {
        if (!zabba || !isFinite(zabba)) return this;
        for (var zabbb = 0; zabbb < this.times.length; zabbb++) this.times[zabbb] += zabba;
        return this;
    }
    getValue(zabba, zabbb, zabbc) {
        var zabbd = this.valueOffset(zabba, zabbc);
        var zabbe;
        if (this.valueType === "number") return this.values[zabbd] === undefined ? this.values[zabba] : this.values[zabbd];
        if (this.valueType === "array") {
            var zabbf = zabbb || [];
            zabbf.length = this.valueSize;
            for (var zabbg = 0; zabbg < this.valueSize; zabbg++) zabbf[zabbg] = this.values[zabbd + zabbg];
            return zabbf;
        }
        if (this.valueType === "vector3") zabbe = zabbb || new Vector3; else if (this.valueType === "vector2") zabbe = zabbb || new Vector2; else if (this.valueType === "vector4") zabbe = zabbb || new Vector4; else if (this.valueType === "quaternion") zabbe = zabbb || new Quaternion; else if (this.valueType === "color") zabbe = zabbb || new Color; else zabbe = zabbb || new Vector3;
        if (zabbe.fromArray) zabbe.fromArray(this.values, zabbd);
        return zabbe;
    }
    sample(zabba, zabbb) {
        var zabbc = this.times.length;
        if (!zabbc) return zabbb;
        if (zabba <= this.times[0]) return this.getValue(0, zabbb);
        if (zabba >= this.times[zabbc - 1]) return this.getValue(zabbc - 1, zabbb);
        var zabbd = 0;
        while (zabbd < zabbc - 1 && zabba >= this.times[zabbd + 1]) zabbd++;
        var zabbe = this.times[zabbd + 1] - this.times[zabbd] || 1;
        var zabbf = (zabba - this.times[zabbd]) / zabbe;
        if (this.interpolation === "STEP") return this.getValue(zabbd, zabbb);
        if (this.cubicSpline) {
            var zabbg = this.getValue(zabbd, null, 1), zabbh = this.getValue(zabbd, null, 2), zabbi = this.getValue(zabbd + 1, null, 1), zabbj = this.getValue(zabbd + 1, null, 0);
            var zabbk = 2 * zabbf * zabbf * zabbf - 3 * zabbf * zabbf + 1, zabbl = zabbf * zabbf * zabbf - 2 * zabbf * zabbf + zabbf, zabbm = -2 * zabbf * zabbf * zabbf + 3 * zabbf * zabbf, zabbn = zabbf * zabbf * zabbf - zabbf * zabbf;
            if (this.valueType === "number") return zabbk * zabbg + zabbl * zabbe * zabbh + zabbm * zabbi + zabbn * zabbe * zabbj;
            if (this.valueType === "array") {
                var zabbo = [];
                for (var zabbp = 0; zabbp < this.valueSize; zabbp++) zabbo[zabbp] = zabbk * zabbg[zabbp] + zabbl * zabbe * zabbh[zabbp] + zabbm * zabbi[zabbp] + zabbn * zabbe * zabbj[zabbp];
                return zabbo;
            }
            var zabbq = zabbb || (this.valueType === "quaternion" ? new Quaternion : this.valueType === "vector2" ? new Vector2 : this.valueType === "vector4" ? new Vector4 : this.valueType === "color" ? new Color : new Vector3);
            for (var zabbr = 0; zabbr < this.valueSize; zabbr++) zabbq[zabbr === 0 ? "x" : zabbr === 1 ? "y" : zabbr === 2 ? "z" : "w"] = zabbk * zabbg[zabbr === 0 ? "x" : zabbr === 1 ? "y" : zabbr === 2 ? "z" : "w"] + zabbl * zabbe * zabbh[zabbr === 0 ? "x" : zabbr === 1 ? "y" : zabbr === 2 ? "z" : "w"] + zabbm * zabbi[zabbr === 0 ? "x" : zabbr === 1 ? "y" : zabbr === 2 ? "z" : "w"] + zabbn * zabbe * zabbj[zabbr === 0 ? "x" : zabbr === 1 ? "y" : zabbr === 2 ? "z" : "w"];
            return this.valueType === "quaternion" ? zabbq.normalize() : zabbq;
        }
        var zabbs = this.getValue(zabbd), zabbt = this.getValue(zabbd + 1);
        if (this.valueType === "number") return zabbs + (zabbt - zabbs) * zabbf;
        if (this.valueType === "array") {
            var zabbu = [];
            for (var zabbv = 0; zabbv < this.valueSize; zabbv++) zabbu[zabbv] = zabbs[zabbv] + (zabbt[zabbv] - zabbs[zabbv]) * zabbf;
            return zabbu;
        }
        if (this.valueType === "quaternion") return zabbs.slerp(zabbt, zabbf);
        return zabbs.lerp(zabbt, zabbf);
    }
}

export { AnimationTrack };
