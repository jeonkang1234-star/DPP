# -*- coding: utf-8 -*-
"""제품에 붙는 DPP 라벨/택 이미지(PIL). QR에는 실제 공개 여권 주소를 넣는다."""
import qrcode
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
KR = 1  # ttc 안에서 KR 페이스 인덱스


def _f(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size, index=KR)


def make_label(path, company, product, serial, url, style="white", accent=(0, 69, 169), w=900, h=560, lines=None):
    bg = {"white": (246, 246, 242), "yellow": (250, 214, 64), "kraft": (196, 160, 116), "silver": (214, 218, 222),
          "black": (28, 30, 33)}[style]
    fg = (240, 240, 240) if style == "black" else (22, 24, 28)
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    # 상단 띠
    d.rectangle([0, 0, w, 86], fill=accent)
    d.text((28, 16), company, font=_f(44, True), fill=(255, 255, 255))
    # QR
    q = qrcode.QRCode(border=1, box_size=10, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url)
    q.make(fit=True)
    qi = q.make_image(fill_color="black", back_color="white").convert("RGB")
    qs = h - 86 - 50
    qi = qi.resize((qs, qs), Image.NEAREST)
    img.paste(qi, (w - qs - 26, 86 + 25))
    x = 28
    y = 106
    d.text((x, y), product[:22], font=_f(38, True), fill=fg)
    y += 58
    for ln in (lines or []):
        d.text((x, y), ln[:30], font=_f(28), fill=fg)
        y += 40
    d.text((x, h - 118), "S/N " + serial, font=_f(30, True), fill=fg)
    d.text((x, h - 70), "Digital Product Passport · EU ESPR", font=_f(24), fill=fg)
    # 바코드 흉내(단순 줄무늬) - 시리얼 해시로 폭을 바꾼다
    bx = x + 470
    hsh = abs(hash(serial))
    for i in range(34):
        bw = 2 + (hsh >> (i % 30)) % 3
        if i % 2 == 0:
            d.rectangle([bx, h - 118, bx + bw, h - 78], fill=fg)
        bx += bw + 1
        if bx > w - qs - 40:
            break
    img.save(path)
    return path


def make_stencil(path, text1, text2, color=(250, 250, 250), w=1024, h=512):
    """강재 마구리/표면에 스프레이로 쓴 마킹 - 투명 배경 PNG."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((20, 40), text1, font=_f(120, True), fill=color + (235,))
    d.text((20, 250), text2, font=_f(96, True), fill=color + (220,))
    img.save(path)
    return path
