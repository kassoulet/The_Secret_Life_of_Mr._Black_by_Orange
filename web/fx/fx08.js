// Scene 8 in the player's numbering (IT orders 16-17, ~115-129 s): photo panned by sines + a "ghost" sprite blended over it. Port of the frame function 0x103807 (init 0x10371e).
// The frame is a PURE function of the time word t = dword [0x200ab9] (65536 units/s of the IMS timer, signed): no accumulation, seek is free.
//  photo (640x400 RIX, palette in the DAC) is copied 320x200 from offset x + 640 y with x = ((S[a9c]+S[aa4]+S[aa8]+S[aac])>>2 + 0x400)*0xab>>11, y = (((S[aac]+S[ab0]+S[ab4]+S[ab8])>>2 + 0x400)*0x91>>11) + 0x32
//  (a9c = -6t>>10, aa0 = 5t>>10, aa4 = -7t>>10, aa8 = 8t>>10, aac = -9t>>10, ab0 = -6t>>10, ab4 = 4t>>10, ab8 = 5t>>10, all &0xfff; S = 4096-entry sine, cos(i) = S[1025+i]);
//  the ghost rectangle (x0,y0,x1,y1 of the ghost picture) is drawn at x0, y0 + 10 + (cos(t>>8 & 0xfff) >> 4), clipped to 320x200, pixel = T2[T1[(32-m)*256+bg]*256 + T1[m*256+g]] (m = 5-bit mask).
let D;
export async function init() { D = new Uint8Array(await (await fetch('assets/s16.bin')).arrayBuffer()); const dv = new DataView(D.buffer);
  D.photo = D.subarray(0, 256000); D.ghost = D.subarray(256000, 337920); D.mask = D.subarray(337920, 419840); D.t1 = D.subarray(419840, 436224); D.t2 = D.subarray(436224, 501760);
  D.S = new Int32Array(5122); for (let i = 0; i < 5122; i++) D.S[i] = dv.getInt32(501760 + 4 * i, true); const o = 501760 + 5122 * 4;
  D.rect = [0, 1, 2, 3].map(i => dv.getInt32(o + 4 * i, true)); D.pal = D.subarray(o + 16, o + 16 + 768); }
export function frame(t, out) {   // t: signed 32-bit time word; out: Uint8Array(64000)
  const { S, photo, ghost, mask, t1, t2 } = D, A = k => (Math.imul(t, k) >> 10) & 0xfff;
  const a9c = A(-6), a0 = A(5), a4 = A(-7), a8 = A(8), ac = A(-9), b0 = A(-6), b4 = A(4), b8 = A(5);
  let bx = (((S[a9c] + S[a4] + S[a8] + S[ac]) >> 2) + 0x400) * 0xab >> 11;
  let ey = ((((S[ac] + S[b0] + S[b4] + S[b8]) >> 2) + 0x400) * 0x91 >> 11) + 0x32;
  const src = bx + ey * 640;
  for (let y = 0; y < 200; y++) out.set(photo.subarray(src + y * 640, src + y * 640 + 320), y * 320);
  const [x0, y0, x1, y1] = D.rect; const dx = x0, dy = (S[1025 + ((t >> 8) & 0xfff)] >> 4) + 10 + y0;
  let w = x1 - x0, h = y1 - y0; if (w < 0 || h < 0) return;
  let ed = dy * 320 + dx, sr = y0 * 320 + x0;
  if (dx + w >= 0x13f) { w -= dx + w - 0x140; if (w <= 0) return; }
  if (dy + h >= 0xc7) { h -= dy + h - 0xc8; if (h <= 0) return; }
  if (dx <= 0) { ed += -dx; sr += -dx; w -= -dx; if (w <= 0) return; }
  if (dy <= 0) { h -= -dy; if (h <= 0) return; ed += -dy * 320; sr += -dy * 320; }
  for (let r = 0; r < h; r++, ed += 320, sr += 320) for (let c = 0; c < w; c++) {
    const m = mask[sr + c], g = ghost[sr + c], bg = out[ed + c];
    out[ed + c] = t2[(t1[((32 - m) & 255) << 8 | bg] << 8) | t1[m << 8 | g]];
  }
}
// time word of a music time (s): W0 at the first frame, 65536/s. UNRESOLVED/machine dependent: W0 (IMS timer start), the frame times (vsync phase of the harness clock).
export const W0 = { w: 0, t: 114.61 };   // the oracle's first frame (order 16 starts at clock 114.61 s) has word t = 1
export function render(t, ctx) { ctx.h = 200; frame((W0.w + Math.round((t - W0.t) * 65536)) | 0, ctx.idx); for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(D.pal[i] * 255 / 63); }
