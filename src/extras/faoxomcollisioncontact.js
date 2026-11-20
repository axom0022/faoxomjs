import { faoxomaabbcontact, faoxomgjkcontact, faoxomheightfieldcontact, faoxomobbcontact, faoxomshapevertices, faoxomworldpoint } from "../core/index.js";

import { Vector3 } from "../math/index.js";

import { faoxommeshcontact } from "./faoxommeshcontact.js";

function zajua(zajua, zajub) {
    var zajuc = (zajua.shape.normal ? zajua.shape.normal.clone() : new Vector3(0, 1, 0)).normalize();
    zajuc.applyQuaternion(zajua.rotation);
    var zajud = zajua.position.clone().addScaledVector(zajuc, zajua.shape.constant || 0);
    var zajue = null;
    var zajuf = 0;
    if (zajub.shape.type === "sphere") {
        zajue = zajub.position.clone().addScaledVector(zajuc, -zajub.shape.radius);
        zajuf = zajub.shape.radius - zajub.position.clone().sub(zajud).dot(zajuc);
    } else {
        var zajug = zajub.shape.vertices && zajub.shape.vertices.length ? zajub.shape.vertices : faoxomshapevertices(zajub.shape);
        var zajuh = Infinity;
        for (var zajui = 0; zajui < zajug.length; zajui++) {
            var zajuj = faoxomworldpoint(zajub.position, zajub.rotation, zajug[zajui]);
            var zajuk = zajuj.clone().sub(zajud).dot(zajuc);
            if (zajuk < zajuh) {
                zajuh = zajuk;
                zajue = zajuj;
            }
        }
        zajuf = -zajuh;
    }
    if (!isFinite(zajuf) || zajuf <= 0) return null;
    return {
        normal: zajuc,
        penetration: zajuf,
        point: zajue
    };
}

function faoxomcollisioncontact(zajub, zajuc) {
    var zajud = zajub.shape.type === "plane";
    var zajue = zajuc.shape.type === "plane";
    if (zajud || zajue) {
        if (zajud && zajue) return null;
        if (zajud) return zajua(zajub, zajuc);
        var zajuf = zajua(zajuc, zajub);
        if (zajuf) {
            zajuf.normal.negate();
            return zajuf;
        }
        return null;
    }
    var zajug = faoxomheightfieldcontact(zajub, zajuc);
    if (zajug) return zajug;
    if (zajub.shape.type === "mesh") {
        var zajuh = faoxommeshcontact(zajub, zajuc, true);
        if (zajuh) return zajuh;
        if (zajuc.shape.type === "mesh") return null;
    }
    if (zajuc.shape.type === "mesh") {
        var zajui = faoxommeshcontact(zajuc, zajub, false);
        if (zajui) return zajui;
    }
    if ((zajub.shape.type === "box" || zajub.shape.type === "obb") && (zajuc.shape.type === "box" || zajuc.shape.type === "obb")) return faoxomobbcontact(zajub, zajuc);
    var zajuj = zajub.shape.type === "convex" || zajub.shape.type === "compound";
    var zajuk = zajuc.shape.type === "convex" || zajuc.shape.type === "compound";
    if (zajuj || zajuk) {
        var zajul = faoxomgjkcontact(zajub, zajuc);
        if (zajul) return zajul;
        return null;
    }
    if (zajub.shape.type === "sphere" && zajuc.shape.type === "sphere") {
        var zajum = (new Vector3).subVectors(zajuc.position, zajub.position);
        var zajun = zajum.length();
        var zajuo = zajub.shape.radius + zajuc.shape.radius;
        if (zajun >= zajuo) return null;
        var zajup = zajun > 1e-8 ? zajum.multiplyScalar(1 / zajun) : new Vector3(1, 0, 0);
        return {
            normal: zajup,
            penetration: zajuo - zajun,
            point: zajub.position.clone().addScaledVector(zajup, zajub.shape.radius - (zajuo - zajun) * .5)
        };
    }
    return faoxomaabbcontact(zajub, zajuc);
}

export { faoxomcollisioncontact };
