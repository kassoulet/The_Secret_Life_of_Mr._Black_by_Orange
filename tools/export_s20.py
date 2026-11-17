#!/usr/bin/env python3
"""export_s20.py ORACLE_DIR : zoom-eye data (dumped at the first frame call by re/oracle_s20.py) -> web/assets/s20.bin
layout: texture 256x256 | DAC 768 (6-bit) | sine/cos 5122 i32 | init 5 i32 (fade level [216348], last t [216338], flag [21634c], [21589c], tex ptr)"""
import sys, numpy as np
z = np.load(sys.argv[1] + '/mem.npz'); H = __file__.rsplit('/', 2)[0] + '/'
open(H + 'web/assets/s20.bin', 'wb').write(z['tex'].tobytes() + z['pal'].tobytes() + z['sine'].tobytes()[:5122 * 4] + z['init'].astype('<i4').tobytes())
