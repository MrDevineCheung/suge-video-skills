import sys
from PIL import Image
import numpy as np
from scipy import ndimage
for n in sys.argv[1:]:
  f=f'assets/c_{n}.png'
  a=np.array(Image.open(f).convert('RGBA')).astype(np.int32)
  r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
  green=(g>r+40)&(g>b+40)&(g>120); al[green]=0
  m=(g>np.maximum(r,b)+10)&(al>0)&(al<250); a[...,1]=np.where(m,np.maximum(r,b),g)
  mask=al>40; lab,k=ndimage.label(mask)
  if k>1:
    sz=ndimage.sum(mask,lab,range(1,k+1)); keep=np.isin(lab,1+np.where(sz>sz.max()*0.02)[0]); al[~keep]=0
  a[...,3]=al; im=Image.fromarray(a.astype(np.uint8)); im=im.crop(im.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox())
  if max(im.size)>1100: s=1100/max(im.size); im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
  im.save(f); print(n,im.size)
