# markku - "The Secret Life of Mr. Black" (Orange, 1997)
Port status: **phase 1 done (harness + golden frames); JS port: 1 of 13 scenes (the intro, orders 0-1) ported and bit-exact against the Unicorn oracle; scenes 2-13 not ported (placeholder).** Credits: code Hoplite, music Dune (KUSI.IT), graphics Der Piipo, animation Frank. Own `.git` in this folder; original files (DEMO.EXE, KUSI.IT, PETTERI) untouched.

Files: DEMO.EXE (MZ stub + PMODE/W 1.20 + uncompressed LE image, Watcom C + hand-written asm), KUSI.IT (Impulse Tracker 2.x module, played by Niklas Beisert's **Indoor Music System v0.6**), PETTERI (1.7 MB container of 23 files: RIX3 pictures, raw 320x200 images, shade tables, an animation; no compression).

What works (see `re/NOTES.md`):
- `re/le.py` loads the LE objects with fixups; `re/emucore.py` + `re/vga.py` + `re/harness.py` run the original under Unicorn (DOS/DPMI/VGA mode 13h + unchained, PIT/IRQ0, virtual clock, checkpoints) with the IMS setup screen answered ("quiet" device).
- `re/petteri.py` unpacks PETTERI into `re/assets/` (+ PNG previews).
- `re/golden/` = native-resolution frames captured from the original (`python3 re/harness.py OUT T0 T1 STEP`).
- The demo is sequenced by the IT **order** (scene changes at orders 2,4,6,8,10,12,15,16,18,20,22,24,25), so seek = pick the order/row and render.

Bit-exact vs approximated: the intro effect (`web/fx/intro.js`) is bit-exact (503 frames, 0 pixel / 0 palette differences, `node re/check_intro.mjs`) given the recorded per-frame inputs (`web/assets/intro_frames.json`, taken from the oracle, not derived); its scroll branch never fires in the oracle and is untested. Scenes 2-13: nothing ported. Run: `cd web && python3 -m http.server`; test: `node test-player.mjs`, `node tools/uitest.mjs` (headless Chrome; also checks seek determinism). The golden frames come from an emulation whose timing model is approximate (instruction/port-cost clock, no real-hardware calibration), so *when* inside a scene a frame appears is approximate; the pixels of a frame are produced by the original code. Display: mode 13h 320x200 and the 320x400 intro are shown at 4:3 (pixels are not square); the player needs pause + seek.
