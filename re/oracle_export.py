#!/usr/bin/env python3
"""oracle_export.py IN.npy OUTDIR : split the intro oracle into meta.json (pre/post state, irqs, clk), idx.bin (N*400*320), pal.bin (N*768)"""
import sys,os,json,numpy as np
f=np.load(sys.argv[1],allow_pickle=True); o=sys.argv[2]; os.makedirs(o,exist_ok=True)
json.dump([dict(pre=[int(x) for x in p['pre']],post=[int(x) for x in p['post']],irqs=int(p['irqs']),clk=p['clk']) for p in f],open(o+'/meta.json','w'))
open(o+'/idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in f)); open(o+'/pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in f))
print(len(f))
