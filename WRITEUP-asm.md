# The Secret Life of Mr. Black (Orange, 1997) - asm snippets worth reading

All addresses are linear addresses of obj1 (code) as loaded by `re/le.py` at `0x100000` (data object at `0x200000`). `DEMO.EXE` is an MZ stub + PMODE/W 1.20 + an
**uncompressed** LE image, so no unpacking is needed; listings come from `re/obj1.dis` (`objdump -M intel` of exactly those bytes; capstone was not installable in this
environment, so the listings are objdump's, with the instruction bytes dropped) and were cross-checked against the data the port uses. Code is a mix of Watcom C (file I/O, IMS player glue) and
hand-written asm (effects `0x1002f0..0x106xxx`), 386-style: integer only (no FPU in any effect), no MMX, 32-bit flat model, **VGA mode 13h**.

---

## 1. Tables aligned to 64 KB so `bh`/`bl` *are* the index (init `0x1058d6`, loop `0x105d44`)

The loader of the eye-zoom scene allocates the picture buffer and rounds it so that the **pixels** (after the 0x30a-byte RIX3 header: 10 + 768 palette) start on a 64 KB boundary:

```
1058e8: add eax,0x30a
1058ed: or  eax,0xffff
1058f2: inc eax            ; round up to a multiple of 0x10000 ...
1058f3: sub eax,0x30a      ; ... after the header
1058f8: mov [0x215cf0],eax
```

The inner loop then never builds an address: it loads the (aligned) base into `ebx` and overwrites the two low bytes with the texture coordinates, which live in the high bytes of the
fixed-point accumulators `ecx`, `edx` (8.8):

```
105d44: mov ebx,[0x215cf0]
105d4c: mov bh,ch          ; v = bits 8..15 of ecx
105d4e: mov bl,dh          ; u = bits 8..15 of edx
105d50: mov al,[ebx]       ; texel
105d52: add ecx,esi        ; v += dv
105d54: add edx,ebp        ; u += du
```

Why it is clever: the `& 255` of both coordinates, the `v * 256` and the `+ u` are all free (two byte moves), and the texture wraps for free. The 4x4 cell loop is
unrolled (four pixels packed with `rol eax,16`, then one `mov [edi],eax`). The same alignment idiom (`or eax,0xffff; inc eax`) is used for the three tables of the ghost scene
(`0x103730`) and the texture/shade tables of the eye warp.

## 2. A three-table cross-fade with only byte moves (ghost blend, `0x103ac1`)

Setup (`0x10371e`) puts three **64 KB-aligned** tables in `eax`, `ebx`, `edx`; their low 16 bits are free to be the index:

```
103ac1: mov ah,[ebp]       ; m   = 5-bit mask  (alffa.raw >> 3, done once at 0x1037bb: lods / shr al,3 / stos)
103ac4: mov bh,ah
103ac6: neg bh
103ac8: add bh,0x20        ; 32 - m
103acb: mov al,[esi]       ; ghost pixel
103acd: mov bl,[edi]       ; background pixel
103acf: mov dl,[eax]       ; T1[m, ghost]
103ad1: mov dh,[ebx]       ; T1[32-m, background]
103ad3: mov al,[edx]       ; T2[ ... ]  -> blended colour
103ad5: mov [edi],al
```

An alpha blend of two 256-colour pixels with a 32-level mask, per pixel: 3 loads, no multiply, no palette maths. The 16 KB table `T1` scales a colour by a level, the 64 KB `T2` adds two
scaled colours back into the palette. Preparing the mask as 5 bits (`shr al,3`) is what makes `32 - m` fit in a byte.

## 3. Saturating byte add without a branch (`0x102eda`, frame blit)

```
102eda: mov al,[esi]
102edc: add al,[edi]       ; CF = overflow
102ede: sbb ah,ah          ; ah = 0 or 0xff
102ee0: or  al,ah          ; clamp to 255
102ee2: mov [edi],al
```

Used for the 256 blob blits per frame of scenes 2 and 5, for the screen composition (`shr al,1; add al,bl; sbb ah,ah; or al,ah` at `0x102f85`) and for the intro's noise
(`0x102850`, four pixels interleaved in `dl/dh/bl/bh`). Four instructions, no compare, no branch; the standard pre-MMX saturation idiom.

## 4. SWAR blur: four pixels per dword, masks instead of clamps (`0x101053`)

```
101053: mov eax,[esi-1]
101056: add eax,[esi+1]
101059: add eax,[esi-0x140]
10105f: add eax,[esi+0x140]     ; four neighbours, four pixels at a time (unaligned dwords)
101065: shr eax,2
101068: and eax,0x3f3f3f3f      ; average, drop bits shifted in from the neighbour byte
10106d: mov ebx,eax
10106f: shr ebx,2
101072: and ebx,0x1f1f1f1f
101078: sub eax,ebx             ; times 3/4 : decay
10107a: and eax,0x3f3f3f3f
10107f: mov [edi],eax
```

The loop count is `0x3e80` dwords = the whole 64000-byte screen in 16000 iterations. It is correct only because every pixel is `<= 0x3f` (the splat refuses to add above
`0x37`/`0x3b`), so the sum of four pixels `<= 0xfc` never carries into the next byte. `0x1062b5` (scene 12) is the same idea unrolled to 8 bytes per iteration, with the decay
`a - (((a >> 2) & 0x3f3f3f3f) >> 1 & 0x3f3f3f3f)`; and that variant tolerates carries because it is fed by dword adds of sprites (the effect lives with the artefact).

## 5. The 12-pixel star splat, bounds first, address by `shl 6; lea` (`0x100856`)

```
100890: mov eax,[0x206b38]          ; x (0..0x137 tested before)
100895: mov edi,[0x206b40]          ; y (0..0xbf)
10089b: shl edi,6
10089e: lea edi,[edi+edi*4]         ; y * 320 = y*64 + y*256
1008a1: add edi,[0x20bb70]          ; buffer
1008a7: add edi,eax
1008a9: cmp byte [edi+1],0x37
1008ad: jae 0x1008b3
1008af: add byte [edi+1],4          ; ... 12 such pairs at +1,+2,+0x140..0x143,+0x280..0x283,+0x3c1,+0x3c2
```

Fully unrolled, saturating at the limit with compare + `jae` (so the blur masks above stay valid). The same body is pasted into the wire-frame line routine twice
(`0x105244` unclipped, `0x105320` per-pixel clipped): `0x10507e` first tests whether **both ends** are inside the screen and only then picks the clip-free loop.

## 6. Line drawing without Bresenham (`0x10507e`)

```
10508f: mov ecx,eax ... cmp eax,ecx / jl / mov ecx,eax   ; ecx = max(|dx|,|dy|)   (8.8 coordinates)
1050a8: shr ecx,8                                       ; number of pixel steps
1050b4: mov eax,[x2]; sub eax,[x1]; shl eax,4; cdq; idiv ecx    ; step x  in .12
1050d6: idiv ecx                                                  ; step y
105244: mov eax,ebx / sar eax,0xc ... edi = (y>>12)*320 + (x>>12) ; splat ; add ebx,ebp ; add edx,esi ; dec ecx ; jne
```

Two `idiv`s per line, then every pixel is two adds and two shifts. Coordinates are kept at `<< 4` so the 8.8 inputs become 20.12 accumulators without losing the fraction of the step. The line is drawn with the
12-pixel star, so the "wire" is a soft glow.

## 7. A chained 3D rotation in 9 instructions per axis (`0x100dc5` ff.)

```
100dbe: mov edx,[esi*4+0x206b68]   ; sin
100dc5: mov ebp,[esi*4+0x207b6c]   ; cos  (0x207b6c = 0x206b68 + 0x1004: index + 0x401)
100dcc: mov edi,edx
100dce: mov esi,ebp
100dd0: imul edx,ebx / imul ebx,ebp / imul edi,eax / imul eax,esi
100ddc: sub eax,edx / add ebx,edi / sar eax,0xa / sar ebx,0xa
```

Four `imul` and 10-bit shifts, no `cdq`/division. Six of these (three of them with a distance-driven angle, section 8, three global) are chained per point, 2048 points per frame.
The cosine is the same table read 1025 entries later, so there is one table instead of two.

## 8. The "twirl" angle from a squared falloff (`0x100d70`)

```
100d70: mov edx,eax / add edx,[0x200b10] / imul edx,edx     ; (x + offset)^2
100d7b: mov ebp,ebx / imul ebp,ebp / add edx,ebp            ; + y^2
100d82: shr edx,0x13 / cmp edx,0x1000 / jb / mov edx,0x1000 ; clamp the distance
100d92: neg edx / add edx,0x1000                            ; 0x1000 - d
100d9a: imul edx,edx / shr edx,0xb
100da0: imul edx,edx / shr edx,0xb                          ; ((1-d)^2)^2
100da8: imul esi,[0x20d290] / sar esi,0xf / and esi,0xfff   ; * a time-varying sine -> angle index
```

The angle with which a point is rotated about an axis falls off as `(1 - d)^4` with the distance to that axis, so the cloud is **twisted like a screw** and untwists at the rim,
without any trigonometry beyond the table lookup that follows. Two squarings replace a pow(), and the final `and 0xfff` wraps the table index for free.

## 9. Perspective with a 64-bit dividend that drops bits (`0x100f7c`)

```
100f7c: lea eax,[eax+eax*4]
100f7f: sar eax,2                 ; x * 5/4
100f82: xchg ebx,eax
100f83: cdq
100f84: shl eax,0xf               ; the shift drops the high bits of eax, edx stays the sign
100f87: idiv ecx                  ; (x << 15) / z
```

`cdq; shl eax,N; idiv` is the cheapest way to get `(v << N) / z`, but the `shl` does not touch `edx`: for `|v| >= 2^(31-N)` the dividend is wrong. The original lives with
it (it can only happen for points at the very edge); the port reproduces it exactly with a BigInt path in `cloud.js divs()`. The `lea; sar` pair is the x*5/4 horizontal stretch, done
with an address calculation.

## 10. Chunky -> four planes in one gather (`0x1024fa`)

```
102500: mov al,[esi+4] / mov ah,[esi+6] / rol eax,0x10
102509: mov al,[esi]   / mov ah,[esi+2]    ; four source bytes 2 apart -> one dword
10250e: mov [edi],eax                      ; plane 0 line
102510: mov ebx,eax / shr ebx,2 / and ebx,0x3f3f3f3f / sub eax,ebx : mov [edi+0xa0],eax        ; x - x/4
102523: shr ebx,1 / and ebx,0x3f3f3f3f / add eax,ebx : mov [edi+0x50],eax / mov [edi+0xf0],eax ; + x/8
```

The 320x400 intro is unchained (mode X-like): each map-mask pass writes the pixels of one plane, i.e. every 4th source pixel. `rol eax,16` lets two byte-pairs be assembled
into one dword, and the **three brightness levels of the interleaved scanlines are made with SWAR shifts** on all four pixels at once, so the vertical 1:2 enlargement doubles as a
scanline-shading effect.

## 11. 2x2 downscale + tile in one pass (`0x102f95`)

```
102fa5: mov al,[esi+4] / mov ah,[esi+6] / rol eax,16 / mov al,[esi] / mov ah,[esi+2]   ; every 2nd pixel
102fb3: shr eax,1
102fb5: and eax,0x7f7f7f7f                                                            ; /2, no cross-byte bleed
102fba: mov [edi],eax / mov [edi+0xa0],eax / mov [edi+0x7d00],eax / mov [edi+0x7da0],eax
```

Four stores place the half-size copy in the four quadrants of the next frame's buffer. A 160x100 image replicated 2x2 is the whole mechanism of the receding tunnel of scene 2
(and, with `/2 - /2/32`, scene 5). The two buffers are swapped by an `xchg [mem],esi` (`0x102fee`).

## 12. Add-rol-xor, a 3-instruction generator, used three ways

```
102826: add ebp,0x9d / 10282c: rol ebp,0xb / 10282f: xor ebp,0x9d      ; intro noise
100a5f: add ebx,0x9d / 100a65: rol ebx,0xa / 100a68: xor ebx,0x9d      ; point table (and scenes 6, 11 per-point angles)
```

The generator is `s = rol(s + 0x9d, k) ^ 0x9d`. The intro takes the low byte and multiplies it by the fade with `imul eax,[fade]; mov [edi],ah` (`>> 8` is just reading `ah`); the
point table takes `& 0xffff` minus `0x7fff` for a uniform signed coordinate; scenes 6/11 take `& 0xfff` as a sine-table index and **re-seed the generator every pass** (`0x5c23` / `1`), so a
pass always draws the same cloud. Determinism is what lets the port reproduce 750-frame runs bit for bit.

## 13. Palette and page flips locked to the retrace (`0x102f47`)

```
102f47: mov dx,0x3da
102f4b: in al,dx / test al,8 / je 0x102f4b      ; wait for retrace to begin
102f50: in al,dx / test al,8 / jne 0x102f50     ; then for it to end
102f55: mov esi,0x212381 / mov ecx,0x300 / mov dx,0x3c8 / xor al,al / out dx,al / inc dx
102f68: rep outsb                                ; 768 DAC bytes in one string instruction
```

All fades are made by recomputing a 768-byte palette (`min(0x3f, pal*f >> 8)`, `0x102f28`) and pushing it during retrace; there are no per-pixel fades anywhere. The intro additionally
flips the displayed page by two CRTC writes (`out 3d4h, 0Dh / 0Ch` start address low/high, `0x1028e8`). The emulation clock cost model charges 1 us per port access, which is why these
retrace loops cost many emulated microseconds but few instructions (see `re/NOTES.md`).

## 14. Allocation through DPMI, double buffers by pointer arithmetic (`0x102be4`)

```
102be4: mov cx,ax / shr eax,0x10 / mov bx,ax
102bed: mov ax,0x501 / int 0x31     ; DPMI allocate memory block: BX:CX = size, returns BX:CX = linear, SI:DI = handle
102bf3: mov ax,bx / shl eax,0x10 / mov ax,cx       ; eax = linear address; ebx = handle
```

Buffers are carved from a single block (`+0x2800` blob, `+0xfa00` A, `+0xfa00` B) and swapped by exchanging pointers; the 64 KB-aligned scenes request extra and round up (section 1).

## 15. A re-assembled timer word (`0x100b9c`, `0x102ce6`, ...)

```
100b9f: mov eax,0 / mov gs,eax / mov esi,0x200ab9 / mov eax,gs:[esi] / mov [0x200ac8],eax
```

Every effect begins by copying three dwords at `0x200ab9`, `0x200abd`, `0x200ac1` (the IMS timer word and two position values) through a null `gs` selector with unaligned loads.
The dwords sit at odd addresses (a packed struct, not aligned). The code reads them once at the top of the frame and works on the copies (`0x200ac8` etc.); that the reason is a consistent snapshot against the IRQ0 updates is a plausible reading, not verified. The port's
"time word" `w` is `dword [0x200ab9]`, 65536 units per second.

---

**Not claimed:** the NOP padding after the conditional jumps in `0x106114..0x106135` (4 x `nop` after each `js`/`ja`) looks like assembler branch relaxation, but no evidence for the reason was found.
Also, the IMS player internals (`0x108xxx..0x11cxxx`) are Niklas Beisert's library and are not analysed here.
