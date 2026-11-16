#!/usr/bin/env python3
"""export_s16.py ORACLE_DIR : scene 16 data (memory dumped at the first frame call by re/oracle_s16.py) -> web/assets/s16.bin
layout: photo 256000 (640x400) | ghost 81920 (320x256: the blit reads rows up to ~254 when the sprite is high) | mask 81920 (already >>3: 0..31) | T1 16384 | T2 65536 | sine/cos 5122 i32 (0x206b68; cos(i) = S[1025+i]) | sprite rect 4 i32 (x0,y0,x1,y1) | DAC 768 (6-bit)"""
import sys, struct, numpy as np
z = np.load(sys.argv[1] + '/mem.npz'); H = __file__.rsplit('/', 2)[0] + '/'
sp = z['sprite'].tobytes(); rect = struct.unpack('<4i', sp[:16]); print('sprite struct', struct.unpack('<8i', sp[:32]))
open(H + 'web/assets/s16.bin', 'wb').write(z['photo'].tobytes() [:256000] + z['ghost'].tobytes()[:81920] + z['mask'].tobytes()[:81920] + z['t1'].tobytes() + z['t2'].tobytes() + z['sine'].tobytes()[:5122 * 4] + struct.pack('<4i', *rect) + z['pal'].tobytes())
