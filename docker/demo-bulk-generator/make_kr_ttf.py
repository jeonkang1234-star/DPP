from fontTools.ttLib import TTCollection, TTFont, newTable
from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
import sys
uni = list(range(0x20,0x7f))+list(range(0xa0,0x180))+list(range(0x2000,0x2070))+list(range(0x2100,0x2200))+list(range(0x2460,0x2500))+list(range(0x2500,0x2600))+list(range(0x3000,0x3040))+list(range(0x3130,0x3190))+list(range(0xAC00,0xD7A4))+list(range(0xFF00,0xFFF0))+[0x3bc,0x3a9,0x394,0x2212,0x2264,0x2265,0xb0,0xd7,0xae,0x2122,0x2022]
for src,out in (("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc","KR-Regular.ttf"),("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc","KR-Bold.ttf")):
    f = TTCollection(src).fonts[1]
    opts = subset.Options(); opts.layout_features=[]; opts.name_IDs=['*']; opts.notdef_outline=True
    s = subset.Subsetter(opts); s.populate(unicodes=uni); s.subset(f)
    gs = f.getGlyphSet(); order=f.getGlyphOrder()
    glyf = newTable('glyf'); glyf.glyphOrder=order; glyf.glyphs={}
    for g in order:
        pen = TTGlyphPen(gs); gs[g].draw(Cu2QuPen(pen, 1.0, reverse_direction=True)); glyf.glyphs[g]=pen.glyph()
    f['glyf']=glyf; f['loca']=newTable('loca')
    f['maxp'].tableVersion=0x00010000
    for k in ('maxZones','maxTwilightPoints','maxStorage','maxFunctionDefs','maxInstructionDefs','maxStackElements','maxSizeOfInstructions','maxComponentElements','maxPoints','maxContours','maxCompositePoints','maxCompositeContours','maxComponentDepth'):
        setattr(f['maxp'],k,0)
    f['maxp'].maxZones=1
    del f['CFF ']
    if 'VORG' in f: del f['VORG']
    f['post'].formatType=2.0; f['post'].extraNames=[]; f['post'].mapping={}
    f['head'].glyphDataFormat=0
    f.sfntVersion="\x00\x01\x00\x00"
    f.save(out); print(out)
