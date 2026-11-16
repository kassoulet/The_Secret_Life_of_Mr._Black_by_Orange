// Scene 7 (order 15, ~108-115 s): static picture. The sequencer's loop for this order has NO frame function (0x1005e5..0x100604 only polls the music/keyboard):
// init 0x10095e = mode 13h, file name [0x20d5da] (cncd.scx) -> DAC from the RIX3 palette (offset 10, 768 B, 6-bit), 64000 pixel bytes copied to VRAM. Bit-exact against golden t0110.
let A;
export async function init() { A = new Uint8Array(await (await fetch('assets/cncd.scx')).arrayBuffer()); }
export function render(t, ctx) {
  ctx.h = 200; ctx.idx.set(A.subarray(778, 778 + 64000));
  for (let i = 0; i < 768; i++) ctx.pal[i] = Math.round(A[10 + i] * 255 / 63);
}
