function faoxombase64text(zadqa) {
    var zadqb = zadqa instanceof Uint8Array ? zadqa : new Uint8Array(zadqa);
    var zadqc = [];
    for (var zadqd = 0; zadqd < zadqb.length; zadqd += 8192) zadqc.push(String.fromCharCode.apply(null, zadqb.subarray(zadqd, Math.min(zadqd + 8192, zadqb.length))));
    var zadqe = zadqc.join("");
    return typeof btoa === "function" ? btoa(zadqe) : typeof Buffer !== "undefined" ? Buffer.from(zadqe, "binary").toString("base64") : "";
}

export { faoxombase64text };
