#!/usr/bin/env python3
"""export_s18.py ORACLE_DIR : wire-frame room data (memory dumped at the first frame call by re/oracle_s18.py) -> web/assets/s18.bin
layout: vertices 96x3 i32 | edges 96x2 i32 (vertex indices) | z offset i32 (0x214b06) | sine/cos 5122 i32 (cos(i) = S[1025+i]) | shade table 16384 | background 64000 | DAC 768 (6-bit)"""
import sys, numpy as np
z = np.load(sys.argv[1] + '/mem.npz'); H = __file__.rsplit('/', 2)[0] + '/'
pal = open(sys.argv[1] + '/pal.bin', 'rb').read()[:768]
open(H + 'web/assets/s18.bin', 'wb').write(z['verts'].tobytes() + z['edges'].tobytes() + z['zoff'].tobytes() + z['sine'].tobytes()[:5122 * 4] + z['t'].tobytes() + z['bg'].tobytes()[:64000] + pal)
