# -*- coding: utf-8 -*-
"""실제 제철소 밀시트 양식을 흉내 낸 학습용 텍스트 생성기(2026-10-07).

우리 목 문서는 전부 한글 세로표 양식("원소 → 측정값 → 규격")이라, 그것만 학습하면 실제
POSCO·현대제철식 가로표 영문 밀시트(Mill Test Certificate, 検査証明書, YP/TS/EL, Heat No.
열에 코일이 여러 행)를 '제강 성적서'로 확신하지 못한다(OCR 실측 확률 0.11).
그래서 실제 양식의 어휘·배치를 가진 텍스트를 만들어 같이 학습시킨다. PDF를 그릴 필요는 없다 -
분류기는 텍스트만 본다.

    python3 parser/training/synthetic_real_style.py --n 120 --out real_style.jsonl
"""
import argparse
import json
import random

MILLS = [
    ("POSCO", "Pohang Works"), ("POSCO", "Gwangyang Works"), ("HYUNDAI STEEL", "Dangjin Works"),
    ("DONGKUK STEEL", "Pohang Works"), ("NIPPON STEEL", "Kimitsu Works"), ("JFE STEEL", "East Japan Works"),
    ("SEAH STEEL", "Gunsan"), ("KG STEEL", "Dangjin"),
]
COMMODITIES = ["HOT ROLLED COIL", "COLD ROLLED COIL", "HOT ROLLED PLATE", "H-BEAM", "STEEL PLATE",
               "GALVANIZED STEEL COIL", "PICKLED & OILED COIL", "REBAR", "WIRE ROD"]
SPECS = ["JS-SPHT1", "JS-SPHC", "JIS G3101 SS400", "KS D3503 SS275", "EN 10025-2 S355JR",
         "ASTM A36", "JIS G3131 SPHC", "KS D3515 SM490A", "EN 10025-2 S275JR", "ASTM A572 Gr.50"]
CERT_LINES = [
    "We certify that the material has been made in accordance with the order and is in compliance.",
    "This material has been fully killed and made by basic oxygen process.",
    "Test Certificate is issued according to ISO 10474/EN 10204 3.1.",
    "Inspection certificate EN 10204 type 3.1",
    "We hereby certify that the material described herein has been manufactured and tested with satisfactory results.",
    "Legal sanction can be imposed on forging. Improper use of product can cause safety issues.",
    "The products specified in the present MTC have been fully processed in South Korea.",
]
FOOTNOTES = [
    "* Position - T : Top, M : Middle, B : Bottom",
    "* Tensile Test. Direction : Longitudinal, Gauge Length : 50 mm(Rectangular)",
    "YP Method : Upper Point", "* Bend Test - Direction : Transversal, Angle : 180",
    "* Division - L : Ladle Analysis, P : Product Analysis", "Surveyor To:",
    "Charpy Impact Test (J) 0 C", "Ultrasonic Test : Good", "Visual & Dimension : Good",
]
TITLES = ["Mill Test Certificate", "MILL TEST CERTIFICATE", "Inspection Certificate",
          "MILL SHEET", "Material Test Certificate", "Mill Test Certificate 検査証明書",
          "INSPECTION CERTIFICATE (EN 10204 3.1)", "검사증명서 Mill Test Certificate"]
HEAD_FIELDS = ["Order No.", "PO No.", "Supplier", "Commodity", "Customer", "Spec & Type",
               "Certificate No.", "Date of Issue", "Contract No.", "Destination", "Invoice No."]
JP = ["契約番号", "注文番号", "注文者", "品名", "顧客社", "規格", "寸法", "製品番号", "数量", "重量",
      "製鋼番号", "引張試験", "曲げ試験", "化学成分"]
ELEMENTS = ["C", "Si", "Mn", "P", "S", "Cu", "Ni", "Cr", "Mo", "V", "Nb", "Ti", "Al", "B", "N", "Ceq"]


def one(rng: random.Random) -> str:
    mill, works = rng.choice(MILLS)
    lines = []
    if rng.random() < 0.7:
        lines.append(mill)
    lines.append(rng.choice(TITLES))
    if rng.random() < 0.5:
        lines.append("検査証明書")
    for f in rng.sample(HEAD_FIELDS, rng.randint(4, 8)):
        val = {"Commodity": rng.choice(COMMODITIES), "Spec & Type": rng.choice(SPECS)}.get(f, "")
        if f in ("Certificate No.", "Order No.", "PO No.") and rng.random() < 0.6:
            val = f"{rng.choice('ABCDEFGHJK')}{rng.randint(100000, 999999)}"
        lines.append(f"{f} : {val}".rstrip())
    if rng.random() < 0.6:
        lines.extend(rng.sample(JP, rng.randint(3, 8)))
    els = ["C", "Si", "Mn", "P", "S"] + rng.sample(ELEMENTS[5:], rng.randint(0, 6))
    head = ["Size", "Product No.", "Quantity", "Weight (kg)", "Heat No.", "Country of Melt & Pour",
            "Position", "Tensile Test", "YP", "TS", "EL", "(MPa)", "(%)", "Bend Test", "Division",
            "Chemical Composition"]
    if rng.random() < 0.4:
        head = [h.replace("YP", "YS").replace("EL", "EL(%)") for h in head]
    if rng.random() < 0.4:
        head += ["Impact Test", "Charpy V-notch (J)"]
    lines.append(" ".join(head) + " " + " ".join(f"{e} (%)" for e in els))
    heat = f"{rng.choice('SHRTK')}{rng.randint(10000, 99999)}"
    for _ in range(rng.randint(1, 8)):
        if rng.random() < 0.4:
            heat = f"{rng.choice('SHRTK')}{rng.randint(10000, 99999)}"
        size = f"{rng.choice([1.2, 2.0, 2.95, 3.2, 4.5, 6.0, 9.0, 12.0, 20.0])}x{rng.choice([914, 925, 1219, 1250, 1500])}x{rng.choice(['C', 6000, 12000])}"
        row = [size, f"{rng.randint(1000000, 9999999)}" if rng.random() < 0.6 else "", "1",
               f"{rng.randint(5, 30)},{rng.randint(100, 999)}", heat, rng.choice(["KOR", "JPN", "KR"]),
               rng.choice(["T", "M", "B"]), str(rng.randint(200, 480)), str(rng.randint(300, 620)),
               str(rng.randint(18, 48)), "Good", rng.choice(["L", "P"])]
        row += [f"{rng.uniform(0.001, 0.25):.4f}" for _ in els]
        lines.append(" ".join(row))
    lines.append("*** Sub Total *** " + str(rng.randint(1, 8)))
    lines.append("*** Grand Total ***")
    lines.extend(rng.sample(FOOTNOTES, rng.randint(2, 6)))
    lines.extend(rng.sample(CERT_LINES, rng.randint(2, 5)))
    if rng.random() < 0.5:
        lines.append(f"{mill} {works}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=120)
    ap.add_argument("--seed", type=int, default=11)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    with open(args.out, "w", encoding="utf-8") as f:
        for i in range(args.n):
            f.write(json.dumps({"label": "MILL_SHEET", "source": f"synthetic/real-style-mill/{i}",
                                "text": one(rng)}, ensure_ascii=False) + "\n")
    print(f"{args.n}건 저장 → {args.out}")


if __name__ == "__main__":
    main()
