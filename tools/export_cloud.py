#!/usr/bin/env python3
"""export_cloud.py ORACLE_DIR_3_4 ORACLE_DIR_6 ORACLE_DIR_11 : scenes 3, 4, 6, 11 static data from the oracles' first-call memory (re/oracle_gen.py *_mem.npz) -> web/assets/s03.bin s04.bin s06.bin s11.bin
(see the fx03/fx04/fx06/fx11 headers for the layouts). Missing directories are skipped."""
import sys, os, numpy as np
H = __file__.rsplit('/', 2)[0] + '/'
class M:
    def __init__(s, p):
        z = np.load(p); s.r = [(0x200000, z['obj2'].tobytes()), (int(z['heapbase'][0]), z['heap'].tobytes()), (int(z['arenabase'][0]), z['arena'].tobytes())]
    def rd(s, a, n):
        for b, d in s.r:
            if b <= a and a + n <= b + len(d): return d[a - b:a - b + n]
        raise KeyError(hex(a))
    def d4(s, a): return int.from_bytes(s.rd(a, 4), 'little', signed=True)
def sine(m): return m.rd(0x206b68, 5122 * 4)
def pal(d, k):
    n = 768; import json
    meta = json.load(open(f'{d}/{k}_meta.json')); p = open(f'{d}/{k}_pal.bin', 'rb').read()
    ps = {p[i * n:(i + 1) * n] for i in range(len(meta))}
    print(k, len(meta), 'frames,', len(ps), 'distinct DACs'); return p[:n]
a, b, c = (sys.argv[1:4] + [None] * 3)[:3]
if a and os.path.exists(f'{a}/s3_mem.npz'):
    m = M(f'{a}/s3_mem.npz'); out = sine(m) + m.rd(0x200b38, 6144 * 4) + m.rd(m.d4(0x20d5c9) & 0xffffffff, 64000) + m.rd(0x20d29c, 4)
    open(H + 'web/assets/s03.bin', 'wb').write(out); print('s03', len(out), m.rd(0x20d5cd, 12))
if a and os.path.exists(f'{a}/s4_mem.npz'):
    m = M(f'{a}/s4_mem.npz'); tab = m.rd(m.d4(0x200ad8) & 0xffffffff, 16384)
    out = sine(m) + m.rd(0x200b38, 6144 * 4) + m.rd(m.d4(0x200ad4) & 0xffffffff, 64000) + tab + pal(a, 's4') + m.rd(0x200acc, 4) + m.rd(0x200b30, 4)
    open(H + 'web/assets/s04.bin', 'wb').write(out); print('s04', len(out), m.rd(0x200adc, 12), m.rd(0x200ae8, 12))
for d, k, n in ((b, 's6', 's06'), (c, 's11', 's11')):
    if d and os.path.exists(f'{d}/{k}_mem.npz'):
        m = M(f'{d}/{k}_mem.npz'); v = b''.join(m.rd(a, 4) for a in (0x20d5f4, 0x20d5f8, 0x20d5fc, 0x20d600, 0x20d604, 0x20d608, 0x20d638, 0x20f0b3))
        out = sine(m) + v + m.rd(m.d4(0x20f0b7) & 0xffffffff, 16384) + m.rd(m.d4(0x20f0bb) & 0xffffffff, 64000) + pal(d, k) + (m.rd(0x20f0f7, 256) if k == 's11' else b'')
        open(H + f'web/assets/{n}.bin', 'wb').write(out); print(n, len(out), m.rd(0x20f0cb, 12), m.rd(0x20f0bf, 12), m.rd(0x20f0e3, 12), m.rd(0x20f0d7, 12))
# scene 1 (oracle_gen s1): sine | shade table 64K (0x2141e0) | texture 64K (0x2141e4) | DAC source 768 (0x214220) | overlay map 132 B | overlays (distinct cells of the pointer table at 0x2148ac, 64000 each)
if os.path.exists('re/oracle_s1/s1_mem.npz') or (a and False):
    m = M('re/oracle_s1/s1_mem.npz'); tb = [m.d4(0x2148ac + 4 * i) & 0xffffffff for i in range(132)]; cells = sorted(set(tb)); ptr = lambda a: m.d4(a) & 0xffffffff
    out = sine(m) + m.rd(ptr(0x2141e0), 65536) + m.rd(ptr(0x2141e4), 65536) + m.rd(0x214220, 768) + bytes(cells.index(x) for x in tb) + b''.join(m.rd(ptr(c), 64000) for c in cells)
    open(H + 'web/assets/s01.bin', 'wb').write(out); print('s01', len(out), len(cells), 'overlays')
