// Shared by fx03 (orders 6-7, frame 0x100b9c) and fx04 (orders 8-9, frame 0x1010e8): the 2048-point 3D cloud (6 chained rotations with a distance-dependent angle, perspective
// divide, 12-pixel splat 0x100856 into a 320x200 byte buffer), 4-neighbour blur with decay (carry-free: all bytes <= 0x3f) and the buffer swap. Buffers have 0x1400 bytes of zero padding in front.
// T = sine table (i32, 0x206b68; cos(i) = T[i + 0x401]), pts = 2048*3 i32 (0x200b38).
export const PAD = 0x1400, SZ = PAD + 64000 + 0x1400;
const SPL = [1, 4, 2, 4, 0x140, 4, 0x141, 8, 0x142, 8, 0x143, 4, 0x280, 4, 0x281, 8, 0x282, 8, 0x283, 4, 0x3c1, 4, 0x3c2, 4];
// splat 12 pixels: add inc (4/8 here, 2/4 in the 0x1015de variant used by scenes 6 and 11, limit 0x3b) while the byte is below the limit
export const SPL2 = SPL.map((v, i) => i & 1 ? v >> 1 : v);
export function splat(b, x, y, spl = SPL, lim = 0x37) {
  if (x < 0 || x > 0x137 || y < 0 || y > 0xbf) return;
  const e = PAD + y * 320 + x;
  for (let k = 0; k < 24; k += 2) { const o = e + spl[k]; if (b[o] < lim) b[o] += spl[k + 1]; }
}
// idiv of (sign(v) : v<<sh) by c, exactly as `cdq; shl eax,sh; idiv ecx` (the shift drops high bits when |v| >= 2^(31-sh))
export function divs(v, c, sh) {
  const L = 2 ** (31 - sh);
  if (v > -L && v < L) return Math.trunc(v * 2 ** sh / c);
  return Number(BigInt.asIntN(64, (v < 0 ? -1n : 0n) << 32n | BigInt(((v << sh) >>> 0))) / BigInt(c));
}
// p = {o10,o08,o0c (offsets), a1c,a20,a24 (angle indices, 0..4095), m (= sine factor 0x20d290), zadd, post(eax,ebx,ecx)->ecx (scene 4 depth term), pre(z)...}
export function project(b, T, pts, n, p) {
  const S = i => T[i], C = i => T[i + 0x401], im = Math.imul;
  const { o10, o08, o0c, a1c, a20, a24, m } = p;
  const ang = (a, c, o) => {   // distance-driven angle index
    const d = ((im(a + o, a + o) + im(c, c)) >>> 0) >>> 0x13;
    let e = 0x1000 - (d < 0x1000 ? d : 0x1000);
    e = (im(e, e) >>> 11); e = (im(e, e) >>> 11);
    return im(e, m) >> 15 & 0xfff;
  };
  for (let k = 0; k < n; k++) {
    let x = pts[k * 3], y = pts[k * 3 + 1], z = pts[k * 3 + 2];
    if (p.pre !== undefined) { z = ((((z << 10) + p.pre) >> 10) & 0xffff) - 0x7fff; y = ((((y << 10) + p.pre) >> 10) & 0xffff) - 0x7fff; }
    let i, s, c, t;
    i = ang(x, y, o10); s = S(i); c = C(i); t = x + o10; x = ((im(t, c) - im(y, s)) >> 10) - o10; y = (im(y, c) + im(t, s)) >> 10;   // sar of (a-b): wraps like the CPU
    i = ang(y, z, o08); s = S(i); c = C(i); t = y + o08; y = ((im(t, c) - im(z, s)) >> 10) - o08; z = (im(z, c) + im(t, s)) >> 10;
    i = ang(z, x, o0c); s = S(i); c = C(i); t = z + o0c; { const nx = (im(x, c) - im(t, s)) >> 10; z = ((im(t, c) + im(x, s)) >> 10) - o0c; x = nx; }
    s = S(a24); c = C(a24); { const nx = (im(x, c) - im(y, s)) >> 10; y = (im(y, c) + im(x, s)) >> 10; x = nx; }
    s = S(a20); c = C(a20); { const nx = (im(x, c) - im(z, s)) >> 10; z = (im(z, c) + im(x, s)) >> 10; x = nx; }
    s = S(a1c); c = C(a1c); { const ny = (im(y, c) - im(z, s)) >> 10; z = (im(z, c) + im(y, s)) >> 10; y = ny; }
    z = p.z(x, y, z);
    if (z <= 0x16) continue;
    const qy = divs(y, z, 15), qx = divs((im(x, 5) >> 2), z, 15);
    splat(b, (qx + 0x9f80) >> 8, (qy + 0x6380) >> 8);
  }
}
// blur: dst[i] = ((a-1 + a+1 + a-320 + a+320 as dwords) >> 2 & 0x3f3f3f3f) minus its >>2 (& 0x1f1f1f1f), & 0x3f3f3f3f
export function blur(s, d, sh = 2) {
  for (let i = PAD; i < PAD + 64000; i += 4) {
    const L = o => (s[o] | s[o + 1] << 8 | s[o + 2] << 16 | s[o + 3] << 24);
    let a = (L(i - 1) + L(i + 1) + L(i - 320) + L(i + 320)) | 0;
    a = (a >>> 2) & 0x3f3f3f3f; a = (a - (((a >>> sh) & 0x1f1f1f1f))) & 0x3f3f3f3f;
    d[i] = a; d[i + 1] = a >> 8; d[i + 2] = a >> 16; d[i + 3] = a >> 24;
  }
}
