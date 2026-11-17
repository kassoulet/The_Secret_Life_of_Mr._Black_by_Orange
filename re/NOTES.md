# markku - reverse-engineering log

## Executable layout (corrects the first notes: the dump was NOT an unpacked program)
- DEMO.EXE = MZ stub + PMODE/W **1.20** extender (code 0x55..0x261b) + a plain, **uncompressed LE image** at file offset 0x2620
  (strings are readable in the raw EXE). `re/le.py` parses it (object table, page map, fixup records; handles 32-bit offset, 16:32 and
  self-relative fixups, the single 16-bit selector fixup is ignored) and `le.load([base1, base2])` returns the objects relocated to any
  bases. No emulation of the extender is needed any more.
  - obj1 = code, 0x227b5 bytes (preferred base 0x10000); obj2 = data/bss, 0x2c620 bytes (0x1e pages in the file), also holds the stack (ESP = top).
  - entry = obj1+0xaabc = Watcom `_cstart` (`WATCOM C/C++32 Run-Time system` string right there). Stack/PSP/DOS-extender probe as in b-hyper.
  - Harness loads obj1 at 0x100000, obj2 at 0x200000. `re/obj1.dis` = `objdump -M intel` of obj1 at VMA 0x100000 (use this one).
- `re/image.bin` / `low.bin` / `mem.bin.gz` / `image.dis` / `unpack_pmodew.py` come from the first attempt (run the extender stub until it stops
  at its first `int 10h`): `image.bin` is just the EXE read into memory at 0x10100c (shifted by 0x100c, not relocated), so it is **not** a useful
  image; kept only for history. Use `le.py` / `obj1.dis`.

## Program structure (obj1, linear 0x100000 + ...)
- Mixed Watcom C (file I/O, IMS player glue 0x108xxx..0x11cxxx, CRT 0x119xxx..0x120xxx) and hand-written asm (effects 0x1002f0..0x106xxx).
- `0x1002f0` = main demo sequencer: for every part `init -> loop { read music position (0x100010 -> 3 dwords at esp: [0]=time?, [4]=order, [8]=row);
  key check 0x10ad94(0x60 = Esc scan code); frame function } until order >= N`. **The parts are keyed on the IT order**, not on a clock:
  | orders (virtual time) | init | frame | what the golden frames show |
  |---|---|---|---|
  | 0-1 (0-15 s) | 0x102640 | 0x10275f | intro: scratchy blue/white picture (320x400 unchained, noise + fade out) |
  | 2-3 (15-29 s) | 0x102b74 0x103c4a | 0x103d67 | eye picture (k1.scx) zoom/rotate/warp, flashing white-framed "MY WIFE / MY SON / MY DAUGHTER / MR BLACK" title cards with photos (wife/son/daugh/all.raw), then credits (dune / hoplite / frank / der piipo) and fade |
  | 4-5 (29-44 s) | 0x104e26 0x102c16 | 0x102ce6 | green rings/plasma ("kk" tables), flashing |
  | 6-7 (44-58 s) | 0x102ffc 0x100ab2 | 0x100b9c | white particle cloud with a bar strip on the right edge |
  | 8-9 (58-72 s) | 0x10159e 0x100996 | 0x1010e8 | red/orange particle ring around a dark hole |
  | 10-11 (72-86 s) | 0x101590 0x1034da 0x102c16 | 0x10314d | glowing spiral tiles with scrolling digits of pi |
  | 12-14 (86-108 s) | 0x102ffc 0x1036de | 0x1016e6 | swirling light-trail flowers (motion blur / feedback) |
  | 15 (108-115 s) | 0x1005cf.. | 0x101834 | picture (kuva*, woman in space) |
  | 16-17 (115-129 s) | 0x10095e.. | 0x10371e/0x103807 | photo of two men with beer + ghost figure fading in (all.raw / andi.raw) |
  | 18-19 (129-144 s) | 0x103b29 0x105421 | 0x1054bf | wire-frame perspective room/grid, rotating |
  | 20-21 (144-158 s) | 0x105838 0x1058d6 | 0x105960 | zooming/warped eye picture (k2/zrva) |
  | 22-23 (158-172 s) | 0x105f51 0x101785 | 0x101d10 | white starburst (alffa.raw?) with colour trails |
  | 24 (172-183 s) | 0x1061cd | 0x106263 | blurred text/logo fade-out; at order >= 25 (0x19) the sequencer returns, 0x1063ac = shutdown, `int 21h/4Ch` at 183.3 s |
  (thresholds in the code: 2,4,6,8,10,12,15,16,18,20,22,24,25. The init/frame function assignment of rows from order 15 on is a guess from call order in 0x1002f0, the descriptions/times come from the golden frames; PETTERI file names are guesses from sizes/looks, not yet traced.)
- PETTERI is opened by `0x10028a` (loads the whole 1.7 MB through DOS read + directory lookup by name `0x100231`: compares the 12-byte name against the table).
- The data refs are `ds:0x200xxx` (obj2 data), `0x21dxxx` (bss: IMS player object at 0x21d264, IMS function pointer table ~0x21d424).

## Music player: Indoor Music System (IMS) v0.6 (c) 1994-97 Niklas Beisert / pascal (Cubic Team)
- The EXE shows the IMS **setup screen** (text mode, "device: quiet, port, dma, irq, rate ...", "2*return:start, 2*esc:quit") right after
  "loading data..." and waits on `int 16h` (ah=0x11 kbhit loop). The harness presses return twice -> device **quiet** (no sound card; the
  SB/GUS/WSS probes of ports 0x2x6/0x2xE etc. fail). IMS in quiet mode still runs its timer and the IT sequencer, so positions advance.
  (The INFOFILE rant against CUBIC TEAM is ironic: the demo uses their player.)
- IMS installs its own IRQ0 handler (0x11cf6c via DOS 25h/08h; saves/chain through the old vector with `pushf; call far`), reprograms PIT channel 0
  (`out 43h,34h`, reload value ~17 k -> ~70 Hz) and calls the sequencer (0x10ad88) from it, switching to a private stack (`lss esp,[0x22ad7c]`).
  The timer lib also reads the PIT counter back (0x11d11c) for sub-tick time.
- KUSI.IT: standard Impulse Tracker 2.x file ('IMPM'), 27 orders (26 used + 255 end marker, order list `0 8 1 2 5 6 3 4 28 4 23 7 9 10 17 18 19 20 21 22 24 25 24 26 27 29`),
  51 instruments / 51 samples, 29 patterns, initial speed 6, tempo 134 (0.112 s/row, 7.2 s per 64-row pattern -> ~3.6 min). "Order" in the sequencer above
  means the position in this order list (IMS reports the order index).

## PETTERI (done: `re/petteri.py` -> `re/assets/`, previews `re/assets/png/`)
- u32 count (23), then 23 x {name[12], u32 offset} (offsets relative to the end of the directory at 0x174), files back to back, **no compression**.
- `*.scx` = RIX3 images (`RIX3`, u16 w, u16 h, flag 0xaf, 768-byte 6-bit palette, w*h pixels): cncd 320x200, kuva/kuva2/kuva3 320x200, zrva 256x256, k1 640x400,
  k2 320x256. `*.raw` = 64000-byte 320x200 8-bit images without palette (wife, son, all, daugh, andi, koodi, tahta: the "MY WIFE/SON/..." photos and board),
  f1.raw 102400, alffa.raw 81920. `*.shd` 16 KB tables (shade/colour maps for kuva/kuva2/kuva3/zrva/kk), `kk.mix` 64 KB, `pallo64.ani` 256000 B (animation frames, ball?).
  Exact use of raw/shd/ani files is a next step.

## Emulation harness (re/emucore.py, vga.py, harness.py) - works
- `emucore.py` = b-hyper's DOS/DPMI stubs adapted (no capstone): int21 (open/read/seek/close, 25h/35h vectors, 4Ah, 44h ...), int31 (alloc, selectors, phys map), int10, int16;
  `petteri` and `.it` names resolve to the host files. `le.py` loads the objects. GDT flat, DS limit 64 MB, PSP selector 0x24 (ES at entry).
- `vga.py` = VGA planar emulation behind an MMIO window at 0xA0000: chain-4 (mode 13h) and unchained (mode X/Y) memory, map mask, latches, write modes 0-3, DAC (ports 3c8/3c9 and int10 10h),
  CRTC start address/offset/line compare/max scan line, 0x3da retrace bit, PIT counter latch. `frame()` renders what the CRT shows (320x200, or 320x400 when the CRTC says so).
- `harness.py` = virtual clock: time = instructions*20 ns + 1 us per port access (so busy-wait loops on 0x3da cost time but few emulated instructions); run in chunks of 2000 instructions;
  between chunks the demo's IRQ0 handler is injected when the PIT period elapsed (and IF=1); retrace is 70 Hz of virtual time; BIOS tick 0x46c follows the clock.
  `python3 harness.py OUTDIR T0 T1 STEP` writes tNNNN.NN.png; env `CKPT=dir CKN=10` writes checkpoints every 10 s, `RESUME=file` continues (verified bit-identical frames).
  Speed ~4-10 s of host time per demo second (intro is the slowest: 400-line unchained writes through the MMIO window).
- The clock model is *not* the original timing (no calibration against real hardware): the instruction/IO costs only decide how many frames the code manages per music tick.
  Music rows advance at exactly 9 rows/s (tempo 134 / speed 6) because the IRQ rate comes from the PIT reload the player programs.

## Golden frames (re/golden/)
`golden/tNNNN.NN.png` every 5 s of virtual time (native 320x200 or 320x400 for the intro) + `contact.png`; the complete 1-fps set was produced with `python3 harness.py OUT 0 240 1` (~15 min host, checkpoints with `CKPT=dir`). Whole demo = 183.3 s, then DOS exit. Order change times (virtual): 0:0 1:8 2:15 3:22 4:29 5:36 6:44 7:51 8:58 9:65 10:72 11:79 12:86 13:94 14:101 15:108 16:115 17:122 18:129 19:137 20:144 21:151 22:158 23:165 24:172 25:182 s (rows run at 9/s; the last pattern is slower).

## Phase 2: intro (scene 0, orders 0-1) - ported, bit-exact against the oracle
- Oracle: `re/oracle_intro.py OUT.npy TMAX` hooks the frame function 0x10275f (entry: state + the 3 position dwords it reads) and its `ret` 0x1029d4
  (displayed 320x400 page through CRTC start/stride, DAC 768 B, state, IRQ count, clock). `re/oracle_export.py` splits it into meta.json/idx.bin/pal.bin.
  `vga.frame_idx()` = indexed CRT image. Run to 15.5 s of virtual time: 503 frames.
- Port: `web/fx/intro.js` = literal port of 0x10275f (noise LFSR `ebp=rol(ebp+0x9d,11)^0x9d` * fade >> 8, saturating add with the pallo64.ani window,
  2x2 box/average into a 160-wide buffer, palette * (256-fade) >> 8, 4 expanders 0x1024fa/0x10258c into the 4 planes, page flip 0 <-> 32000).
  `node re/check_intro.mjs ORACLE_DIR` replays the oracle's per-frame inputs: **503 frames, 0 state mismatches, 0 pixel diffs, 0 palette byte diffs**.
- Tables exported from the LE data object: `web/assets/intro_pal.bin` (0x20f2ea), `intro_tab.json` (fade table 0x20f8ea, 256 dwords, seed 34690, interval 6144, wrap 0x3e800), `pallo64.ani`.
- Inputs: the demo reads a time word (0x200ab9, 65536 units/s from the IMS timer, starts ~4059038503), row and order every frame. The frame times come from
  the vsync waits in the (emulated) virtual clock, so `web/assets/intro_frames.json` ([clock s, time, row, order] per frame) is *recorded* from the oracle, not derived.
- Seek class: ACCUMULATING (noise LFSR, scroll offset, page flip). `fx00.js` replays frames from 0 (~1.2 ms/frame, 503 frames < 1 s). Not a pure function of t.
- Not verified: the scroll branch (`time - last >= 6144`) never fires in this run (the time word is negative as a signed dword, so `jl` is always taken, `last` stays 0
  and the picture never scrolls). The branch is ported from the disassembly but not exercised by the oracle.
  The last frame (order 2, past the fade table's first 128 entries) is covered since the full 256-entry table is exported.
- Hash of the shown intro is static from ~2 s to ~8 s because the fade level is 0 there (noise 0): that is the original, not a stuck player.
- Audio in the web player: libopenmpt (chiptune3) plays KUSI.IT; scene times in `web/timetable.js` are the rounded order-change times of the Unicorn run, so
  sync to the original IMS timing is approximate (libopenmpt vs IMS, and the harness clock model).
- Other scenes (2-13): not ported, no oracle yet. Player shows a "not ported yet" placeholder for them.

## Scene 7 (order 15, picture): ported (`web/fx/fx07.js`, `node re/check_fx07.mjs`)
- Sequencer re-read (calls in 0x1002f0): the loop for order 15 has **no frame function**; init 0x10095e shows `cncd.scx` (file name at 0x20d5da; RIX3: palette at +10, pixels at +778) and nothing changes. 0x102207 is a cleanup call after the previous loop.
- Correction to the table above from order 12 on: the loop 12-14 uses frame **0x101834** (3D rotation of the light-trail flowers, init 0x102ffc 0x1036de 0x1016e6), the picture scene is 15 only; 16 = init 0x10371e, frame 0x103807; 17 = init 0x103b29 0x105421, frame 0x1054bf, etc. (each init/frame pair is the call pair around the `cmp [esp+4],N` threshold).
- Matches golden t0110 to 0 samples (> 2/255, 6-bit scaling); no per-frame oracle needed (static).

## Next steps
1. Per-scene RE of the sequencer table above (init/frame functions) -> JS effects; start from the simplest (intro noise 0x10275f, text scroller, fades).
2. Decode which PETTERI files each scene uses (watch file offsets passed to 0x100231 / reads of `assets/*`).
3. Music: port an IT player to JS (libopenmpt in `web/vendor` like b-hyper) - KUSI.IT is a plain IT 2.x file, so libopenmpt is enough, positions via order/row.
4. Aspect: 320x200 (mode 13h) and the 320x400 intro (unchained) are both shown at 4:3.

## Scenes 8 and 9 (orders 16-17, 18-19)
- fx08 (frame 0x103807): ghost/mask buffers are 81920 bytes each (a 64000 dump left the bottom rows wrong). `node re/check_fx08.mjs`: 0 differing pixels over 556 frames (`re/oracle16`, `re/oracle_s16.py`, `tools/export_s16.py`).
- fx09 (frame 0x1054bf, init 0x103b29/0x105421): wire-frame room, a pure function of the time word t (no accumulation). `re/oracle_s18.py` -> `re/oracle18`, `tools/export_s18.py` -> `web/assets/s18.bin`, `node re/check_fx09.mjs`: 0 differing pixels over 501 frames (oracle t is the original's own time word per frame; its machine-dependent frame times are not reproduced).
- Player wiring (done): `fx0N.render(t, ctx)` maps the music clock to the time word, word = (t - scene start) * 65536; starts are the oracle's order-change clocks (`web/timetable.js`: 114.61, 128.97, 143.2857, 171.9233). fx08 W0 = {w:0, t:114.61} (first frame has word 1).

## Scenes 10 and 12 (orders 20-21, 24-25)
- fx10 (frame 0x105960, init 0x1058d6): zoom of the 256x256 `zrva.scx` through an 81x51 warped grid (two radial bulges, rotation from four sine phases), 4x4 cells filled by interpolation. Pure function of t; fade (order 21 row 32+) telescopes: level = max(0, 0x40000 - (w - Tp)), Tp = 701391 from the oracle. `re/oracle_s20.py` -> `re/oracle20`, `tools/export_s20.py` -> `web/assets/s20.bin`, `node re/check_fx10.mjs`: 0 differing pixels and 0 palette bytes over 501 frames.
- fx12 (frame 0x106263, init 0x1061cd): feedback blur (raw unaligned dword adds with carry, 4 neighbours +-1 byte and +-0x500) of a 64000-byte buffer pair + 645 dots (x,-y scaled by 0x2000 - min(0x2000, w>>7), 16 cycling 16x16 sprites added with carry), order 25 palette fade by table[row]. `re/oracle_s24.py`, `tools/export_s24.py`, `node re/check_fx12.mjs` replays the oracle's (t,row,order) calls: 0 differing pixels / palette bytes over 795 frames. State accumulates, so the player replays from the scene start (~270 ms for a seek to the end).
- Scene 11 (init 0x101785, frame 0x101d10, orders 22-23), read but NOT ported: 64 passes x 128 points, per point three LCG-ish values ((v+0x9d) rol 10 ^ 0x9d, &0xfff) pick angles, a chain of 6 rotations (angles from [20d624..2c], sine table 0x206b68, cos = table at 0x207b6c), perspective divide (x*5/4<<8 / (z+[20d638])) + (160,100), 0x1015de adds small increments to a 4x4 pixel splat in buffer [20d66c]; then a 4-neighbour blur (320 stride, `and 3f3f3f3f`, -1/4) into [20d670], swap, DAC scale (order 24 branch: [20f0f7+row*4] + sine wobble), 64K blend-table remap [20f0b7]/[20f0bb] to VGA, then rotation state update from w (x11, x-13, x12 >>10; [20dc77..] 14,11,-29). Needs an oracle (`re/oracle_s22.py`) dumping 0x20d5e8..0x20d680, tables 0x20f0b7/0x20f0bb/0x20f0f7, the sine tables and buffers.
- TODO: scene 11, scenes 1-6.
