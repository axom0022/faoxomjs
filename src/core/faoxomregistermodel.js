import { faoxommodelstore } from "./faoxommodelstore.js";
import { faoxomstate } from "./faoxomstate.js";

function faoxomregistermodel(name, data, options) { if (!name || data === undefined) throw new Error("registerModel requires a model name and data"); var entry = null; if (data && typeof data === "object" && !(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) { if (data.format && (data.data !== undefined || data.json !== undefined)) entry = { format: data.format, data: data.data, json: data.json }; else if (data.asset) entry = { format: "gltf", json: data.json !== undefined ? data.json : data }; } if (!entry && typeof data === "string" && data.charAt(0) === "{") entry = { format: "gltf", json: JSON.parse(data) }; if (!entry) entry = { format: (options && options.format) || "glb", data: data }; var store = faoxommodelstore(); if (Object.prototype.hasOwnProperty.call(store, name) && (store[name].data !== entry.data || store[name].json !== entry.json)) faoxomstate.faoxommodelstoreversion++; store[name] = entry; return entry; }

export { faoxomregistermodel };
