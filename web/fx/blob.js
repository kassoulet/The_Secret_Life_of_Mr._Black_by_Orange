// Shared by fx02 (orders 4-5) and fx05 (orders 10-11): the parameter update 0x10300a and the clipped saturating blit of the 32x32 blob (same code in 0x102ce6 / 0x10314d).
// T = sine table (i32, 0x206b68), st = variables 0x211cf0.. (i32 array, index (addr-0x211cf0)/4).
export const V = a => (a - 0x211cf0) >> 2;
export function params(st, T, w) {
  const g = a => st[V(a)], p = (a, v) => { st[V(a)] = v; }, S = i => T[i];
  let e = (S(g(0x211d08)) + S(g(0x211d0c)) + S(g(0x211d10)) + S(g(0x211d14))) >> 2; e = (e + 0x400) >>> 5; p(0x211d04, e);
  p(0x211d08, (Math.imul(w, 8) >> 10) & 0xfff); p(0x211d0c, (Math.imul(w, 12) >> 10) & 0xfff); p(0x211d10, (Math.imul(w, 15) >> 10) & 0xfff); p(0x211d14, (Math.imul(w, 19) >> 10) & 0xfff);
  let a = S((g(0x211d20) << 2) & 0xfff) << 2; p(0x211d24, a); a = S(a & 0xfff) + g(0x211d30); p(0x211d2c, a);
  p(0x211d28, Math.imul(w, 0x23) >> 10); p(0x211d30, Math.imul(w, -27) >> 10); p(0x211d20, (Math.imul(w, 2) >> 10) & 0xfff); p(0x211d18, w >> 10);
}
// blob at (X,Y) clipped to 320x200 added (saturating) to mem[A..], blob rect (x0,y0)-(x1,y1) in the sprite buffer at mem[0..]
export function blit(mem, A, X, Y, x0, y0, x1, y1) {
  let W = x1 - x0, H = y1 - y0; if (W < 0 || H < 0) return;
  if (X + W >= 0x13f) { W -= X + W - 0x13f; if (W <= 0) return; }
  if (Y + H >= 0xc7) { H -= Y + H - 0xc8; if (H <= 0) return; }
  let d = A + Y * 320 + X, s = y0 * 320 + x0;
  if (X <= 0) { d -= X; s -= X; W += X; if (W <= 0) return; }
  if (Y <= 0) { H += Y; if (H <= 0) return; d -= Y * 320; s -= Y * 320; }
  for (let y = 0; y < H; y++, d += 320, s += 320) for (let x = 0; x < W; x++) { const v = mem[d + x] + mem[s + x]; mem[d + x] = v > 255 ? 255 : v; }
}
export const u32 = (u, o) => (u[o] | u[o + 1] << 8 | u[o + 2] << 16 | u[o + 3] << 24);
export const w32 = (u, o, v) => { u[o] = v; u[o + 1] = v >> 8; u[o + 2] = v >> 16; u[o + 3] = v >> 24; };
