function faoxombase64bytes(zadpa) {
    var zadpb = zadpa.replace(/-/g, "+").replace(/_/g, "/");
    var zadpc = typeof atob === "function" ? atob(zadpb) : typeof Buffer !== "undefined" ? Buffer.from(zadpb, "base64").toString("binary") : "";
    var zadpd = new Uint8Array(zadpc.length);
    for (var zadpe = 0; zadpe < zadpc.length; zadpe++) zadpd[zadpe] = zadpc.charCodeAt(zadpe);
    return zadpd.buffer;
}

export { faoxombase64bytes };
