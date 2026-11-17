#!/usr/bin/env python3
"""export_s24.py ORACLE_DIR : scene 12 static data (re/oracle_s24.py mem.npz) -> web/assets/s24.bin = points 0x285*8=5160 | sprites 0x1500 | DAC 768 | fade table 1024 (the 0x3e800-byte buffer starts all zero)"""
import sys, numpy as np
z = np.load(sys.argv[1] + '/mem.npz'); assert not z['buf'].any()
open(__file__.rsplit('/', 2)[0] + '/web/assets/s24.bin', 'wb').write(z['pts'].tobytes() + z['spr'].tobytes() + z['pal'].tobytes() + z['fade'].tobytes())
