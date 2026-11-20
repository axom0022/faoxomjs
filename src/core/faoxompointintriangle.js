function faoxompointintriangle(zafpa, zafpb, zafpc, zafpd) {
    var zafpe = zafpd.clone().sub(zafpb);
    var zafpf = zafpc.clone().sub(zafpb);
    var zafpg = zafpa.clone().sub(zafpb);
    var zafph = zafpe.dot(zafpe);
    var zafpi = zafpe.dot(zafpf);
    var zafpj = zafpe.dot(zafpg);
    var zafpk = zafpf.dot(zafpf);
    var zafpl = zafpf.dot(zafpg);
    var zafpm = 1 / (zafph * zafpk - zafpi * zafpi || 1);
    var zafpn = (zafpk * zafpj - zafpi * zafpl) * zafpm;
    var zafpo = (zafph * zafpl - zafpi * zafpj) * zafpm;
    return zafpn >= 0 && zafpo >= 0 && zafpn + zafpo <= 1;
}

export { faoxompointintriangle };
