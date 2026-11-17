// Scene 9 in the player's numbering (IT orders 18-19, ~129-144 s): wire-frame room (96 vertices, 96 edges) over a picture. Port of the frame function 0x1054bf (init 0x103b29 0x105421).
// The frame is a PURE function of the time word t = dword [0x200ab9] (65536 units/s of the IMS timer, signed): no accumulation (the line buffer is cleared after each frame), seek is free.
//  angles (0x105846): A = 3t>>10 & 0xfff, B = 2t>>10 & 0xfff, C = 7t>>10 & 0xfff, z offset = t>>10; S = 4096-entry sine, cos(i) = S[1025+i];
//  vertex (x,y,z): rotate (x,y) by A, (x,z) by B, (y,z) by C (each ((a*c - b*s) >> 10, (b*c + a*s) >> 10), 32-bit wraps), then x*2, y*2, z + zoff;
//  edge (a,b): z += [0x214b06] (zc); order by z; z2 <= 1: skipped; z1 <= 1: clipped to z = 1 (fraction ((y2-y1)<<8)/(z2-z1)); project x = (x<<14)/(z+0x401) + 0xa000, y = ... + 0x6400 (8.8 fixed);
//  line 0x10507e: n = max(|dx|,|dy|)>>8 steps of (d<<4)/n, position >>12 (sar), splat = saturating (<0x37) add of 4/8 on 12 bytes around the pixel, per-pixel clip unless both ends are inside;
//  display: out = T[(line << 8) | picture] (0x214ae0 shade table).
let D;
export async function init(a) {
  const u = new Uint8Array(await (await fetch('assets/s18.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  D = { V: new Int32Array(288), E: new Int32Array(192), S: new Int32Array(5122), zc: dv.getInt32(1920, true) };
  for (let i = 0; i < 288; i++) D.V[i] = dv.getInt32(4 * i, true);
  for (let i = 0; i < 192; i++) D.E[i] = dv.getInt32(1152 + 4 * i, true);
  for (let i = 0; i < 5122; i++) D.S[i] = dv.getInt32(1924 + 4 * i, true);
  D.T = u.subarray(22412, 38796); D.bg = u.subarray(38796, 102796); D.pal = u.subarray(102796, 103564); D.L = new Uint8Array(64000);
}
const OFF = [1, 4, 2, 4, 0x140, 4, 0x141, 8, 0x142, 8, 0x143, 4, 0x280, 4, 0x281, 8, 0x282, 8, 0x283, 4, 0x3c1, 4, 0x3c2, 4];
function splat(L, p) { for (let i = 0; i < 24; i += 2) { const q = p + OFF[i]; if (L[q] < 0x37) L[q] += OFF[i + 1]; } }
function line(L, x1, y1, x2, y2) {
  let n = Math.abs(x1 - x2) | 0; const m = Math.abs(y1 - y2) | 0; if (m >= n) n = m; n >>>= 8; if (n <= 0) return;
  const sx = (((x2 - x1) << 4) / n) | 0, sy = (((y2 - y1) << 4) / n) | 0; let bx = x1 << 4, by = y1 << 4;
  x1 >>= 8; y1 >>= 8; x2 >>= 8; y2 >>= 8;
  if (x1 < 0 && x2 < 0 || y1 < 0 && y2 < 0 || x1 > 0x13c && x2 > 0x13c || y1 > 0xc4 && y2 > 0xc4) return;
  const inside = x1 >= 0 && x2 >= 0 && x1 <= 0x13c && x2 <= 0x13c && y1 >= 0 && y2 >= 0 && y1 <= 0xc4 && y2 <= 0xc4;
  for (; n > 0; n--, bx = (bx + sx) | 0, by = (by + sy) | 0) {
    const px = bx >> 12, py = by >> 12;
    if (!inside && (px < 0 || py < 0 || px > 0x13c || py > 0xc4)) continue;
    splat(L, py * 320 + px);
  }
}
export function frame(t, out) {   // t: signed 32-bit time word; out: Uint8Array(64000)
  const { S, V, E, zc, T, bg, L } = D, a1 = (Math.imul(t, 3) >> 10) & 0xfff, a2 = (Math.imul(t, 2) >> 10) & 0xfff, a3 = (Math.imul(t, 7) >> 10) & 0xfff, zo = t >> 10;
  const P = new Int32Array(288), sa = S[a1], ca = S[1025 + a1], sb = S[a2], cb = S[1025 + a2], sc = S[a3], cc = S[1025 + a3];
  for (let i = 0; i < 96; i++) {
    let x = V[3 * i], y = V[3 * i + 1], z = V[3 * i + 2], nx, ny;
    nx = (Math.imul(x, ca) - Math.imul(y, sa)) >> 10; ny = (Math.imul(y, ca) + Math.imul(x, sa)) >> 10; x = nx; y = ny;
    nx = (Math.imul(x, cb) - Math.imul(z, sb)) >> 10; ny = (Math.imul(z, cb) + Math.imul(x, sb)) >> 10; x = nx; z = ny;
    nx = (Math.imul(y, cc) - Math.imul(z, sc)) >> 10; ny = (Math.imul(z, cc) + Math.imul(y, sc)) >> 10; y = nx; z = ny;
    P[3 * i] = x << 1; P[3 * i + 1] = y << 1; P[3 * i + 2] = (z + zo) | 0;
  }
  L.fill(0);
  for (let k = 0; k < 96; k++) {
    const a = 3 * E[2 * k], b = 3 * E[2 * k + 1];
    let x1 = P[a], y1 = P[a + 1], z1 = (P[a + 2] + zc) | 0, x2 = P[b], y2 = P[b + 1], z2 = (P[b + 2] + zc) | 0;
    if (z1 >= z2) { [x1, x2] = [x2, x1]; [y1, y2] = [y2, y1]; [z1, z2] = [z2, z1]; }
    if (z2 <= 1) continue;
    if (z1 <= 1) {
      const d = z2 - z1; if (d <= 0) continue;
      const f = Math.abs(z1 - 1); z1 += f;
      const qy = (((y2 - y1) << 8) / d) | 0, qx = (((x2 - x1) << 8) / d) | 0;
      y1 = (y1 + (Math.imul(qy, f) >> 8)) | 0; x1 = (x1 + (Math.imul(qx, f) >> 8)) | 0;
    }
    z1 += 0x401; z2 += 0x401;
    line(L, (((x1 << 14) / z1) | 0) + 0xa000, (((y1 << 14) / z1) | 0) + 0x6400, (((x2 << 14) / z2) | 0) + 0xa000, (((y2 << 14) / z2) | 0) + 0x6400);
  }
  for (let i = 0; i < 64000; i++) out[i] = T[L[i] << 8 | bg[i]];
}
// Time word = IMS timer since the scene started (65536/s; the oracle's first frame has t = 1, orders 18 starts at clock 128.97 s): word = (music t - T0) * 65536.
export const T0 = 128.97;
export function render(t, ctx) { ctx.h = 200; frame(Math.max(0, Math.round((t - T0) * 65536)) | 0, ctx.idx); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(D.pal[i] * 255 / 63); }
