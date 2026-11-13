import { faoxomsupport } from "./faoxomsupport.js";

function faoxomminkowskisupport(a, b, direction) { return faoxomsupport(a.shape, a.position, a.rotation, direction).sub(faoxomsupport(b.shape, b.position, b.rotation, direction.clone().negate())); }

export { faoxomminkowskisupport };
