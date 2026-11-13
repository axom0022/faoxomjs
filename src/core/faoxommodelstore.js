import { faoxommodelstorefallback } from "./faoxommodelstorefallback.js";

function faoxommodelstore() { if (typeof globalThis !== "undefined") { if (!globalThis.FaoxomJsModels) globalThis.FaoxomJsModels = {}; return globalThis.FaoxomJsModels; } return faoxommodelstorefallback; }

export { faoxommodelstore };
