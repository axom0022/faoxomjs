import { faoxomfbxarray } from "./faoxomfbxarray.js";
import { faoxomfbxlayervalue } from "./faoxomfbxlayervalue.js";
import { faoxomfbxnumber } from "./faoxomfbxnumber.js";

function faoxomfbxlayertuple(layer, arrayName, indexName, mappingIndex, vertexIndex, polygonIndex, size, fallback) { var source = faoxomfbxlayervalue(layer, arrayName, indexName, mappingIndex, vertexIndex, polygonIndex, -1); var values = layer ? faoxomfbxarray(layer, arrayName) : null; if (!values || source < 0) return fallback.slice(); var out = []; for (var i = 0; i < size; i++) out.push(faoxomfbxnumber(values[source * size + i])); return out; }

export { faoxomfbxlayertuple };
