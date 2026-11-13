function faoxomfbxread64(view, offset) { return typeof view.getBigUint64 === "function" ? Number(view.getBigUint64(offset, true)) : view.getUint32(offset, true) + view.getUint32(offset + 4, true) * 4294967296; }

export { faoxomfbxread64 };
