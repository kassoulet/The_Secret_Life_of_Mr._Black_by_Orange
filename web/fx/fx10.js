// Scene 10 (IT orders 20-21, ~143-158 s): zoom/warp of the 256x256 eye picture (zrva.scx). Port of the frame function 0x105960 (init 0x1058d6), time word t = [0x200ab9] (65536/s since the scene start).
//  1. per-t phases (0x105f5f): S = sine table (cos(i) = S[1025+i]); a = 2t, b = -3t, c = 2t, d = -2.5t (each (k*t)>>10), 0x2158c8 = 6t>>10, 0x2158cc = 16t>>10, amp = min(0x10000, 64t>>10) (sticky), mid = 16t>>10 & 0xfff;
//  2. a 81x51 grid of warped texture coordinates (8.8): two radial "bulges" at (0x5000,0x3200) and (0xf000,0x9600) (d = ((1 - r^2/256)^8 in 8.8), rotate by an angle from four sine phases, scale by amp);
//  3. every 4x4 cell is filled by a bilinear-ish interpolation of the 4 corner coordinates (factor f = (S[mid]+0x400)>>3 / 1024): texture lookup tex[(cy>>8 & 255) * 256 + (cx>>8 & 255)];
//  4. fade (from order 21 row 32): level -= t - previous t each frame (clamped at 0); DAC = pal * (level>>10) >> 8.
// Pure function of t except the fade (which telescopes: level = max(0, L0 - (t - Tp))): seek is free.
let D;
const mul = Math.imul;
export async function init() {
  const u = new Uint8Array(await (await fetch('assets/s20.bin')).arrayBuffer()), dv = new DataView(u.buffer, u.byteOffset);
  D = { tex: u.subarray(0, 65536), pal: u.subarray(65536, 66304), S: new Int32Array(5122), init: [0, 1, 2, 3, 4].map(i => dv.getInt32(66304 + 5122 * 4 + 4 * i, true)), G: new Int32Array(81 * 51 * 2) };
  for (let i = 0; i < 5122; i++) D.S[i] = dv.getInt32(66304 + 4 * i, true);
}
const K = (t, k) => mul(t, k) >> 10;
function grid(t) {
  const S = D.S, G = D.G, ph = { a0: K(t, 0x800), a8: K(t, -0xc00), a4: K(t, 0x800), ac: K(t, -0xa00), c8: K(t, 6), cc: K(t, 16) }, amp = Math.min(0x10000, K(t, 0x40));
  let b4 = (ph.a4 >> 8) & 0xfff, bc = (ph.ac >> 8) & 0xfff, o = 0, y = 0;
  for (let r = 0; r < 51; r++, y += 4) {
    let b0 = (ph.a0 >> 8) & 0xfff, b8 = (ph.a8 >> 8) & 0xfff, x = 0;
    for (let c = 0; c < 81; c++, x += 4) {
      let X = x << 8, Y = y << 8, ax = X, by = Y;
      for (const [cx, cy] of [[0x5000, 0x3200], [0xf000, 0x9600]]) {
        const dx = (ax - cx) >> 8, dy = (by - cy) >> 8;
        let d = (mul(dx, dx) + mul(dy, dy)) >> 8; d = 0x100 - d; d = mul(d, d) >> 8; d = mul(d, d) >> 8; d = mul(d, d) >> 8;
        let ex = ax - cx, ey = by - cy, f = (mul(S[((d << 4) + ph.cc) & 0xfff], d) >> 10) + 0x100;
        ax = (mul(ex, f) >> 8) + cx; by = (mul(ey, f) >> 8) + cy;
      }
      ax -= 0xa000; by -= 0x6400;
      const e1 = S[b0] + S[b4] + 0xc00, e2 = S[b8] + S[bc] + 0xc00;
      const si = (((e1 + e2) >> 3) + ph.c8) & 0xfff, sn = S[si], cs = S[si + 1025];
      let nx = (mul(ax, cs) - mul(by, sn)), ny = (mul(by, cs) + mul(ax, sn));
      nx = ((nx >> 10) + 0x8080) >> 8; ny = ((ny >> 10) + 0x8080) >> 8;
      G[o++] = mul(nx, amp) >> 8; G[o++] = mul(ny, amp) >> 8;
      b0 = (b0 + 0x40) & 0xfff; b8 = (b8 + 0x5c) & 0xfff;
    }
    b4 = (b4 + 0x40) & 0xfff; bc = (bc + 0x5c) & 0xfff;
  }
}
export function frame(t, out) {   // t: signed 32-bit time word; out: Uint8Array(64000)
  const S = D.S, G = D.G, tex = D.tex; grid(t);
  const f = (S[K(t, 16) & 0xfff] + 0x400) >> 3;
  for (let r = 0; r < 50; r++) for (let c = 0; c < 80; c++) {
    const i = (r * 81 + c) * 2, j = i + 2, k = i + 162, l = k + 2;
    const sx = (mul(G[k] - G[i], f)) >> 10, sy = (mul(G[k + 1] - G[i + 1], f)) >> 10;
    let ex = mul(G[j] - G[i], f) >> 10, ey = mul(G[j + 1] - G[i + 1], f) >> 10;
    const dex = ((mul(G[l] - G[k], f) >> 10) - ex) >> 2, dey = ((mul(G[l + 1] - G[k + 1], f) >> 10) - ey) >> 2;
    let X = G[i], Y = G[i + 1], px = ex, py = ey;   // edx/ecx = start, ebp = x step, esi = y step
    for (let q = 0; q < 4; q++) {
      let x = X, y = Y, sxs = px, sys = py;
      for (let p = 0; p < 4; p++) { out[(r * 4 + q) * 320 + c * 4 + p] = tex[((y >> 8) & 255) << 8 | ((x >> 8) & 255)]; y += sys; x += sxs; }
      X += sx; Y += sy; px += dex; py += dey;
    }
  }
}
export const T0 = 143.2857;   // clock of the oracle's first frame (word t = 0)
export const FADE = { Tp: 701391 };   // word of the frame before the first order-21 row-32 frame (oracle20); level = max(0, 0x40000 - (w - Tp))
export const pal6 = w => { const lv = Math.max(0, D.init[0] - Math.max(0, w - FADE.Tp)) >> 10, o = new Uint8Array(768); for (let i = 0; i < 768; i++) o[i] = (D.pal[i] * lv) >> 8; return o; };
export function render(t, ctx) {
  const w = Math.max(0, Math.round((t - T0) * 65536)) | 0; ctx.h = 200; frame(w, ctx.idx);
  const p = pal6(w); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(p[i] * 255 / 63);
}
