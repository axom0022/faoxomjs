import { faoxomsupport } from "./faoxomsupport.js";

function faoxomminkowskisupport(zafka, zafkb, zafkc) {
    return faoxomsupport(zafka.shape, zafka.position, zafka.rotation, zafkc).sub(faoxomsupport(zafkb.shape, zafkb.position, zafkb.rotation, zafkc.clone().negate()));
}

export { faoxomminkowskisupport };
