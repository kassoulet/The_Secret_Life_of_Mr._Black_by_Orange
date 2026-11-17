// Shared by fx06 (orders 12-14, frame 0x101834) and fx11 (orders 22-23, frame 0x101d10): a procedural point cloud (angles from an LCG, 3 + 3 chained rotations, perspective, 12-pixel
// splat 0x1015de) into a feedback buffer, blurred with decay and shown through a 16 KB colour table (buffer<<8 | picture). Rotation helpers, splat and blur are cloud.js's.
import { PAD, SZ, splat, SPL2, divs, blur } from './cloud.js';
const im = Math.imul, step = e => { e = (e + 0x9d) | 0; e = (e << 10 | e >>> 22); return e ^ 0x9d; };
// cfg = {passes, inner, lcg0, r(p) radius (before cfg.rsh), c(p), ang(st,c) -> [A1,A2,A3], sh (divide shift), ox, oy (offsets), fin(st,w)}
export function frame(b, T, st, cfg) {
  const S = i => T[i], C = i => T[i + 0x401];
  for (let p = 0; p < cfg.passes; p++) {
    const [A1, A2, A3] = cfg.ang(st, cfg.c(p)), R = cfg.r(p);
    let e = cfg.lcg0;
    for (let k = 0; k < cfg.inner; k++) {
      const i1 = e & 0xfff; e = step(e); const i2 = e & 0xfff; e = step(e); const i3 = e & 0xfff; e = step(e);
      let x = R, y = R, z = R, s, c, t;
      s = S(i1); c = C(i1); t = y; y = (im(y, c) - im(z, s)) >> 10; z = (im(z, c) + im(t, s)) >> 10;
      s = S(i2); c = C(i2); t = x; x = (im(x, c) - im(z, s)) >> 10; z = (im(z, c) + im(t, s)) >> 10;
      s = S(i3); c = C(i3); t = x; x = (im(x, c) - im(y, s)) >> 10; y = (im(y, c) + im(t, s)) >> 10;
      const rr = (i, a, b) => { s = S(i & 0xfff); c = C(i & 0xfff); return [(im(a, c) - im(b, s)) >> 10, (im(b, c) + im(a, s)) >> 10]; };
      [y, z] = rr(A1, y, z); [x, z] = rr(A2, x, z); [x, y] = rr(A3, x, y);
      z = (z + st.s638) | 0;
      if (z <= 0x80) continue;
      const qy = divs(y, z, cfg.sh), qx = divs(im(x, 5) >> 2, z, cfg.sh);
      splat(b, cfg.fix(qx, cfg.ox), cfg.fix(qy, cfg.oy), SPL2, 0x3b);
    }
  }
}
export { PAD, SZ, blur };
