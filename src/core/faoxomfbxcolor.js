import { Color, faoxomclamp } from "../math/index.js";
import { faoxomfbxnumber } from "./faoxomfbxnumber.js";

function faoxomfbxcolor(values, fallback) { if (!values || values.length < 3) return new Color(fallback === undefined ? 0xffffff : fallback); return new Color(faoxomclamp(faoxomfbxnumber(values[0]), 0, 1), faoxomclamp(faoxomfbxnumber(values[1]), 0, 1), faoxomclamp(faoxomfbxnumber(values[2]), 0, 1)); }

export { faoxomfbxcolor };
