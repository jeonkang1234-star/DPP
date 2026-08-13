# -*- coding: utf-8 -*-
"""페이지를 이미지로 렌더링해 QR코드를 디코딩. 외부 시스템 라이브러리(zbar 등) 불필요, OpenCV만 사용."""
import numpy as np
import cv2
import fitz

_detector = cv2.QRCodeDetector()


def decode_qr_on_page(page, zoom: float = 3.0):
    """PyMuPDF page 객체 -> 디코딩된 QR 문자열 리스트 (없으면 빈 리스트).
    zoom=3.0이 속도/인식률 트레이드오프상 적당함 (2.0은 빠르지만 인식률 급락)."""
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    if pix.n == 4:
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2GRAY)
    elif pix.n == 3:
        img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # 단일 QR 우선 시도(빠름), 실패 시에만 다중 QR 시도(느림, 페이지에 QR 여러 개인 특수 케이스 대비)
    results = []
    data, points, _ = _detector.detectAndDecode(img)
    if data:
        results = [data]
    else:
        try:
            ok, decoded_info, points, _ = _detector.detectAndDecodeMulti(img)
            if ok:
                results = [d for d in decoded_info if d]
        except cv2.error:
            pass
    return results
