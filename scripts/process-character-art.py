"""Prepara el arte de personajes cedido por Giiku Games para la web.

Uso: python3 scripts/process-character-art.py <carpeta Characters> src/assets/characters

Las ilustraciones originales vienen con fondo blanco y las fichas de
especialización llevan un pie con el nombre impreso. El script:
1. recorta el pie (el nombre se muestra como texto traducible en la web),
2. vuelve transparente el blanco conectado con el borde (relleno por
   inundación, así no se borran ojos ni brillos blancos del personaje),
3. suaviza el borde del recorte y ajusta la imagen a su contenido,
4. guarda WebP con transparencia a un tamaño máximo de 2x el de pantalla.

next/image genera después AVIF y WebP a cada ancho necesario.
Requiere Pillow. Ver docs/mejoras/arte-de-personajes.md.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
SRC=sys.argv[1].rstrip('/')+'/'
OUT=sys.argv[2]

def cutout(path, crop_bottom=0.0, thresh=236):
    im=Image.open(SRC+path).convert('RGB')
    if crop_bottom:
        w,h=im.size; im=im.crop((0,0,w,int(h*(1-crop_bottom))))
    w,h=im.size
    # Máscara de píxeles casi blancos (canal mínimo >= umbral).
    px=im.load()
    m=Image.new('L',(w,h),0); mp=m.load()
    for y in range(h):
        for x in range(w):
            p=px[x,y]
            if min(p)>=thresh: mp[x,y]=255
    for x in range(0,w,4):
        for y in (0,h-1):
            if mp[x,y]==255: ImageDraw.floodfill(m,(x,y),128,thresh=0)
    for y in range(0,h,4):
        for x in (0,w-1):
            if mp[x,y]==255: ImageDraw.floodfill(m,(x,y),128,thresh=0)
    alpha=m.point(lambda v:0 if v==128 else 255)
    alpha=alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out=im.convert('RGBA'); out.putalpha(alpha)
    bbox=alpha.point(lambda v:255 if v>8 else 0).getbbox()
    return out.crop(bbox)

def save(im,name,maxh):
    if im.height>maxh:
        im=im.resize((round(im.width*maxh/im.height),maxh),Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp','WEBP',quality=82,method=6)
    print(name,im.size)

jobs=[
 ('Mercenary/mercenary_female_illust.jpg','mercenary',0),
 ('Explorer/explorer_female_illust.jpg','explorer',0),
 ('Noble/noble_female_illust.jpg','noble',0),
 ('Saint/saint_female_illust.jpg','saint',0),
 ('Mercenary/Mercenary_m3_Gladiator.jpg','gladiator',0.13),
 ('Mercenary/Mercenary_f4_Guardian_Swordsman.jpg','guardian-swordsman',0.13),
 ('Explorer/Explorer_m3_Excavator.jpg','excavator',0.13),
 ('Explorer/Explorer_f4_Sniper.jpg','sniper',0.13),
 ('Noble/Noble_f3_Court_Magician.jpg','court-magician',0.13),
 ('Noble/Noble_m4_Magic_Knight.jpg','magic-knight',0.13),
 ('Saint/Saint_f3_Priest.jpg','priest',0.13),
 ('Saint/Saint_m4_Shaman.jpg','shaman',0.13),
]
for p,n,c in jobs: save(cutout(p,c),n,900 if c==0 else 560)
hero=Image.open(SRC+'Noble/mkweiblichausgeschnitten.png').convert('RGBA')
hero=hero.crop(hero.getchannel('A').getbbox()); save(hero,'hero-noble',1010)
