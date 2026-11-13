import { faoxomfbxchild } from "./faoxomfbxchild.js";
import { faoxomfbxchildren } from "./faoxomfbxchildren.js";

function faoxomfbxproperty(node, name, fallback) { var properties = faoxomfbxchild(faoxomfbxchild(node, "Properties70"), "P"); var list = faoxomfbxchildren(faoxomfbxchild(node, "Properties70"), "P"); for (var i = 0; i < list.length; i++) if (String(list[i].properties[0]) === name) return list[i].properties.slice(4); return fallback; }

export { faoxomfbxproperty };
