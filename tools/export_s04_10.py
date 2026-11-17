#!/usr/bin/env python3
"""export_s04_10.py ORACLE_DIR : scenes 2 and 5 static data (re/oracle_s04_10.py mem_a/mem_b.npz) -> web/assets/s02.bin, s05.bin
s02: sine 5122 i32 | vars 0x211cf0..+0xa0 | blob buffer 0x2800 | fade 256 i32 | DAC 768 | kk table 64000
s05: data object 0x200000..0x206b68 + sine | vars | blob buffer | fade | DAC | scroller vars 0x212680..+0x800 | font strip file 0xcc00 | first-blob raw (esi,ebp) 2 i32"""
import sys, json, numpy as np
d = sys.argv[1]; H = __file__.rsplit('/', 2)[0] + '/'
for k, n in (('a', 's02'), ('b', 's05')):
    z = np.load(f'{d}/mem_{k}.npz'); p = z['ptrs']
    assert p[1] == p[0] + 0x2800 and p[2] == p[1] + 0xfa00 and p[3] == p[0], p
    assert not z['spr'][0x2800:].any()
    b = (z['obj2'].tobytes()[:0x6b68 + 5122 * 4] if k == 'b' else z['sine'].tobytes()[:5122 * 4]) + z['state'].tobytes() + z['spr'][:0x2800].tobytes() + z['fade'].tobytes() + z['pal'].tobytes()
    if k == 'a': b += z['kk'].tobytes()
    else:
        f = json.load(open(d + '/b_first.json'))[0]
        b += z['scr'].tobytes() + z['pfile'].tobytes() + (np.array(f, np.int64) & 0xffffffff).astype('<u4').tobytes()
    open(f'{H}web/assets/{n}.bin', 'wb').write(b); print(n, len(b), bytes(z['name']))
