import { Color, faoxomclamp } from "../math/index.js";

import { faoxomfbxnumber } from "./faoxomfbxnumber.js";

function faoxomfbxcolor(zaeja, zaejb) {
    if (!zaeja || zaeja.length < 3) return new Color(zaejb === undefined ? 16777215 : zaejb);
    return new Color(faoxomclamp(faoxomfbxnumber(zaeja[0]), 0, 1), faoxomclamp(faoxomfbxnumber(zaeja[1]), 0, 1), faoxomclamp(faoxomfbxnumber(zaeja[2]), 0, 1));
}

export { faoxomfbxcolor };
