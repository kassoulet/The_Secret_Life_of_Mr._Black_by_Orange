#!/usr/bin/env python3
"""petteri.py - unpack ../PETTERI into assets/ and write PNG previews of the images (assets/png/).
PETTERI = u32 count N, then N x {char name[12] (NUL padded); u32 offset} (16 bytes each), then the files back to back; offsets are
relative to the end of the directory (4+16N); the size of a file = next offset - offset (last: to EOF). No compression.
 *.scx = RIX3 image: 'RIX3', u16 width, u16 height, u8 flags (0xaf = 256-colour palette follows), 768 B palette (6-bit VGA DAC values), then w*h 8-bit pixels.
 *.raw = headerless 8-bit pixels (64000 = 320x200; f1 102400, alffa 81920: other sizes), palette lives elsewhere (set by code).
 *.shd = 16 KB shade/colour tables, kk.mix 64 KB, pallo64.ani 256000 B = animation frames (see NOTES)."""
import struct,os,sys
from PIL import Image
H=os.path.dirname(os.path.abspath(__file__)); d=open(H+'/../PETTERI','rb').read()
n=struct.unpack('<I',d[:4])[0]; ent=[(d[4+16*i:16+16*i].split(b'\0')[0].decode(),struct.unpack('<I',d[16+16*i:20+16*i])[0]) for i in range(n)]
base=4+16*n; os.makedirs(H+'/assets/png',exist_ok=True)
for i,(nm,off) in enumerate(ent):
    end=ent[i+1][1] if i+1<n else len(d)-base; b=d[base+off:base+end]; open(H+'/assets/'+nm,'wb').write(b)
    if nm.endswith('.scx'):
        assert b[:4]==b'RIX3'; w,h=struct.unpack('<HH',b[4:8]); pal=bytes(min(255,v*4+(v>>4)) for v in b[10:778])
        im=Image.frombytes('P',(w,h),b[778:778+w*h]); im.putpalette(pal); im.convert('RGB').save(H+'/assets/png/'+nm+'.png'); print(nm,w,h,'flag %02x'%b[8],b[9])
    else: print(nm,len(b))
