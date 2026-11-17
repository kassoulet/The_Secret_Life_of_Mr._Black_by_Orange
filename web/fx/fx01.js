// Scene 1 (IT orders 2-3, ~15-29 s): eye picture warped over a 41x26 grid + the flashing photo/credit overlays. Port of the frame function 0x103d67 (parameters 0x104e34).
// A pure function of (time word w, order, row): angles from w -> three rotated corners of a plane -> 26x41 grid of (u, v, shade) records (wave-displaced depth, perspective 0x800000/z)
// -> 40x25 cells of 8x8 pixels (second-order interpolated u,v, linear shade, texture + shade table lookups) -> DAC scaled by the fade -> screen = shadeTable[(overlay >> 2) << 8 | pixel].
// Tables come from the oracle's first call (tools/export_cloud.py -> assets/s01.bin).
import { divs } from './cloud.js';
let T, shade, tex, pal0, map, ov;
const im = Math.imul, rec = new Int32Array(26 * 41 * 3);   // u, v, shade per grid point
export const scr = new Uint8Array(64000);
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s01.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  let o = 0; T = Int32Array.from({ length: 5122 }, (_, i) => dv.getInt32(4 * i, true)); o = 5122 * 4;
  shade = u.subarray(o, o += 65536); tex = u.subarray(o, o += 65536); pal0 = u.subarray(o, o += 768); map = u.subarray(o, o += 132);
  ov = []; while (o + 64000 <= u.length) ov.push(u.subarray(o, o += 64000));
}
const S = i => T[i & 0xfff], C = i => T[(i & 0xfff) + 0x401];
export function call(w, order, row) {
  w |= 0; const a = (k) => im(w, k) >> 10 & 0xfff;
  let p50 = a(4), p54 = a(-5), p58 = a(-3), p5c = a(5);
  const a40 = a(3), a44 = a(2), r0 = S(a40) & 0xfff, r1 = (S(a40) + S(a44)) & 0xfff;
  let e = S(a(7)) >> 1; e = (e + S(a(8))) >> 1; e = (e + S(a(6))) >> 1; e = (e + S(a(4))) & 0xfff; const r2 = e;
  let fade = w >> 8; if (fade >= 0x100) fade = 0x100;
  if (order === 3 && row >= 0x20) fade = (0x20 - (row - 0x20)) << 3;
  if (order === 4) fade = 0;
  const off = w >> 6, k4c = S(a(4)) << 6;
  const rot = (x, y, z) => {
    let s = S(r0), c = C(r0), t = y; y = (im(y, c) - im(z, s)) >> 10; z = (im(z, c) + im(t, s)) >> 10;
    s = S(r1); c = C(r1); t = x; x = (im(x, c) - im(z, s)) >> 10; z = (im(z, c) + im(t, s)) >> 10;
    s = S(r2); c = C(r2); t = x; x = (im(x, c) - im(y, s)) >> 10; y = (im(y, c) + im(t, s)) >> 10;
    return [x, y, z];
  };
  const P0 = rot(-256, -256, 256), P1 = rot(256, -256, 256), P2 = rot(-256, 256, 256);
  const dc = [0, 1, 2].map(i => divs(P1[i] - P0[i], 0x29, 8)), dr = [0, 1, 2].map(i => divs(P2[i] - P0[i], 0x1a, 8));
  let X = P0[0] << 8, Y = P0[1] << 8, Z = P0[2] << 8, n = 0;
  for (let r = 0; r < 26; r++) {
    p50 = (p50 + 0x1d7) & 0xfff; p58 = (p58 + 0x274) & 0xfff;
    let q4 = p54, q6 = p5c, x = X, y = Y, z = Z;
    for (let c = 0; c < 41; c++) {
      q4 = (q4 + 0x129) & 0xfff; q6 = (q6 + 0x18c) & 0xfff;
      let ec = (z + 2 * S(p50) + 2 * S(q4) + 2 * S(p58) + 2 * S(q6) + k4c) | 0, u = ec >>> 0;
      if (u <= 0x1000) ec = 0x1000; if (u >= 0xfffff000) ec = -0x1000;
      let sh = 0x20, g = (ec ^ (ec >> 31)) - 0x8000;
      if (g < 0) { g = -g >>> 10; sh = (0x20 - (g & 0xff)) & 0xff; }
      const k = divs(0x800000, ec, 0) | 0;   // 0x800000 / ec (cdq; idiv)
      let ua = im(x, k) >> 8, va = im(y, k) >> 8;
      if (k >= 0) { ua += off; va += off; } else { ua -= off; va -= off; }
      rec[n++] = ua; rec[n++] = va; rec[n++] = sh;
      x += dc[0]; y += dc[1]; z += dc[2];
    }
    X += dr[0]; Y += dr[1]; Z += dr[2];
  }
  // cells
  const R = (r, c) => (r * 41 + c) * 3;
  for (let r = 0; r < 25; r++) for (let c = 0; c < 40; c++) {
    const A = R(r, c), B = R(r, c + 1), D = R(r + 1, c), E = R(r + 1, c + 1);
    const dsx = (rec[B + 2] - rec[A + 2]) << 5, dsy = (rec[D + 2] - rec[A + 2]) << 5;
    const dul = (rec[D] - rec[A]) >> 3, dvl = (rec[D + 1] - rec[A + 1]) >> 3;
    let dux = (rec[B] - rec[A]) >> 3, dvx = (rec[B + 1] - rec[A + 1]) >> 3;
    const ddu = ((((rec[E] - rec[D]) >> 3) - dux) >> 3), ddv = ((((rec[E + 1] - rec[D + 1]) >> 3) - dvx) >> 3);
    let U = rec[A], V = rec[A + 1], Sh = rec[A + 2] << 8, o = r * 8 * 320 + c * 8;
    for (let y = 0; y < 8; y++) {
      let u = U, v = V, s = Sh;
      for (let x = 0; x < 8; x++) { scr[o + x] = shade[(s >> 8 & 255) << 8 | tex[(v >> 8 & 255) << 8 | (u >> 8 & 255)]]; s += dsx; u += dux; v += dvx; }
      dux += ddu; dvx += ddv; U += dul; V += dvl; Sh += dsy; o += 320;
    }
  }
  const pal = new Uint8Array(768); for (let i = 0; i < 768; i++) pal[i] = im(pal0[i], fade) >> 8;
  const O = ov[map[(order - 2) * 64 + row]];
  for (let i = 0; i < 64000; i++) scr[i] = shade[(O[i] >> 2) << 8 | scr[i]];
  return pal;
}
export let T0 = 14.4490, next = 0;
export function render(t, ctx) {
  const w = Math.max(0, Math.round((t - T0) * 65536)), r = Math.floor(w * 9 / 65536);
  const pal = call(w, 2 + (r >> 6), r & 63);
  ctx.h = 200; ctx.idx.set(scr); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(pal[i] * 255 / 63);
}
