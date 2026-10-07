# -*- coding: utf-8 -*-
"""'DPP 서류가 아닌 문서'(OTHER) 학습용 텍스트 생성기(2026-10-07).

분류기가 19종만 알면, 전혀 상관없는 파일(이력서·뉴스·청구서·과제 PDF 등)이 들어와도 그중
하나로 억지로 끼워 맞춘다 - 확률이 낮게 나와서 예전 기준(다른 유형이라고 '확신'할 때만 반려)에서는
그대로 통과됐다. 그래서 "어떤 서류도 아님"을 따로 배우게 한다. 장르 템플릿 + 어휘 풀로 만든다.

    python3 parser/training/synthetic_other.py --n 900 --out other.jsonl
"""
import argparse
import json
import random

KO_NOUNS = ["회의", "예산", "학생", "프로젝트", "고객", "일정", "보고", "시장", "정책", "교육", "행사", "여행",
            "건강", "음식", "가격", "서비스", "계약", "직원", "부서", "목표", "성과", "문제", "해결", "연구",
            "데이터", "분석", "결과", "방법", "사례", "지역", "주민", "공원", "도서관", "버스", "날씨", "주말",
            "가족", "친구", "영화", "음악", "운동", "병원", "약속", "쇼핑", "커피", "점심", "회사", "학교"]
KO_VERBS = ["진행했다", "발표했다", "논의했다", "확인했다", "준비한다", "검토한다", "결정했다", "요청했다",
            "공유했다", "마무리했다", "시작한다", "개선했다", "참석했다", "안내한다", "추천한다"]
EN_WORDS = ("the of and to in is was for on with as by at from this that be are have it not or which an "
            "meeting team project customer report market policy student course lecture travel weather music "
            "movie recipe kitchen apartment rent salary career experience skills education university "
            "software application server database user interface login password account email schedule").split()


def ko_sentence(rng):
    return f"{rng.choice(KO_NOUNS)} {rng.choice(KO_NOUNS)}에 대해 {rng.choice(KO_NOUNS)}을 {rng.choice(KO_VERBS)}."


def en_sentence(rng):
    return " ".join(rng.choice(EN_WORDS) for _ in range(rng.randint(8, 18))).capitalize() + "."


def para(rng, n=None, en=False):
    f = en_sentence if en else ko_sentence
    return " ".join(f(rng) for _ in range(n or rng.randint(3, 8)))


def g_news(rng):
    return "\n".join([f"[{rng.choice(['경제', '사회', '정치', '문화', '스포츠'])}] {rng.choice(KO_NOUNS)} 관련 {rng.choice(KO_NOUNS)} 발표",
                      f"입력 2026.{rng.randint(1, 12)}.{rng.randint(1, 28)} 기자 {rng.choice(['김', '이', '박', '최'])}OO"] +
                     [para(rng) for _ in range(rng.randint(3, 6))])


def g_resume(rng):
    return "\n".join(["이력서", "성명 홍길동", f"생년월일 {rng.randint(1990, 2004)}.{rng.randint(1, 12)}.{rng.randint(1, 28)}",
                      "학력", f"{rng.choice(['한국', '서울', '부산', '한빛'])}대학교 {rng.choice(['컴퓨터공학과', '경영학과', '기계공학과', '디자인학과'])} 졸업",
                      "경력", f"{rng.choice(['인턴', '연구원', '사원'])} {rng.randint(1, 3)}년", "자격증 정보처리기사 토익 " + str(rng.randint(700, 990)),
                      "자기소개서", para(rng, 6)])


def g_invoice(rng):
    lines = [rng.choice(["INVOICE", "Invoice", "청구서", "견적서", "거래명세서", "세금계산서"]),
             f"No. {rng.randint(1000, 9999)}", "Bill To / 공급받는자", f"{rng.choice(['ABC', '한빛', '대한', 'Nova'])} {rng.choice(['Corp', '상사', '무역', 'Inc.'])}"]
    for _ in range(rng.randint(2, 7)):
        lines.append(f"{rng.choice(['컨설팅', '웹사이트 제작', 'Office chair', 'Laptop', '사무용품', '광고비', 'Software license'])} "
                     f"{rng.randint(1, 20)} {rng.randint(10, 900)},000 원")
    lines += ["합계 Total", "부가세 VAT", "결제 조건 Payment terms Net 30", "입금 계좌 국민은행"]
    return "\n".join(lines)


def g_minutes(rng):
    return "\n".join(["회의록", f"일시 2026-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d} 14:00", "참석자 김OO, 이OO, 박OO",
                      "안건"] + [f"{i + 1}. {ko_sentence(rng)}" for i in range(rng.randint(3, 6))] + ["결정 사항", para(rng, 3), "다음 회의 일정 추후 공지"])


def g_contract(rng):
    lines = [rng.choice(["용역 계약서", "임대차 계약서", "근로계약서", "비밀유지계약서", "SERVICE AGREEMENT"])]
    for i in range(rng.randint(5, 10)):
        lines.append(f"제{i + 1}조 ({rng.choice(['목적', '계약기간', '대금', '해지', '비밀유지', '손해배상', '분쟁해결'])}) {para(rng, 2)}")
    lines += ["갑", "을", "서명 날인"]
    return "\n".join(lines)


def g_paper(rng):
    return "\n".join([en_sentence(rng).title(), "Abstract", para(rng, 6, en=True), "1. Introduction", para(rng, 8, en=True),
                      "2. Related Work", para(rng, 6, en=True), "References", "[1] " + en_sentence(rng)])


def g_recipe(rng):
    return "\n".join([f"{rng.choice(['김치찌개', '파스타', '된장국', '볶음밥', 'Pancakes', 'Curry'])} 만들기", "재료",
                      *[f"{rng.choice(['양파', '마늘', '대파', '돼지고기', '두부', '계란', '밀가루', '설탕', '소금'])} {rng.randint(1, 300)}g" for _ in range(rng.randint(4, 8))],
                      "만드는 법", *[f"{i + 1}. {ko_sentence(rng)}" for i in range(rng.randint(3, 6))]])


def g_notice(rng):
    return "\n".join([rng.choice(["공지사항", "안내문", "가정통신문", "알림", "NOTICE"]), para(rng, 2),
                      f"기간 2026.{rng.randint(1, 12)}.{rng.randint(1, 28)} ~ 2026.{rng.randint(1, 12)}.{rng.randint(1, 28)}",
                      f"장소 {rng.choice(['본관 3층 대회의실', '체육관', '시민회관', '온라인 Zoom'])}", "문의 02-000-0000", para(rng, 3)])


def g_email(rng):
    return "\n".join([f"From: {rng.choice(['kim', 'lee', 'park', 'john'])}@example.com", "To: team@example.com",
                      f"Subject: {en_sentence(rng)}", "", rng.choice(["안녕하세요,", "Hi all,", "Dear team,"]),
                      para(rng, 4, en=rng.random() < 0.5), "", rng.choice(["감사합니다.", "Best regards,", "Thanks,"])])


def g_receipt(rng):
    lines = [rng.choice(["영수증", "RECEIPT", "카드 매출전표"]), f"{rng.choice(['스타벅스', 'GS25', '이마트', 'CU', '올리브영'])} {rng.choice(['강남점', '시흥점', '정왕점'])}"]
    for _ in range(rng.randint(1, 6)):
        lines.append(f"{rng.choice(['아메리카노', '샌드위치', '생수', '라면', '우유', '과자'])} {rng.randint(1, 3)} {rng.randint(1, 9)},{rng.randint(100, 900)}")
    lines += ["합계", "카드 승인", "감사합니다"]
    return "\n".join(lines)


def g_lecture(rng):
    return "\n".join([f"{rng.choice(['자료구조', '운영체제', '미적분학', '경영학원론', '데이터베이스'])} {rng.randint(1, 15)}주차 강의노트",
                      *[f"- {ko_sentence(rng)}" for _ in range(rng.randint(5, 12))], "과제", para(rng, 2)])


def g_code(rng):
    return "\n".join(["def main():", "    for i in range(10):", "        print(i)", "import os", "class User:", "    def __init__(self, name):",
                      "        self.name = name", "SELECT * FROM users WHERE id = 1;", "public static void main(String[] args) {", "}"]
                     [:rng.randint(4, 10)] + [en_sentence(rng)])


def g_travel(rng):
    return "\n".join([f"{rng.choice(['제주도', '부산', '오사카', '다낭', '파리'])} 여행 일정",
                      *[f"{d + 1}일차 {ko_sentence(rng)}" for d in range(rng.randint(2, 5))], "준비물 여권 충전기 우산"])


def g_salad(rng):
    if rng.random() < 0.5:
        return para(rng, rng.randint(4, 12))
    return para(rng, rng.randint(4, 12), en=True)


GENRES = [g_news, g_resume, g_invoice, g_minutes, g_contract, g_paper, g_recipe, g_notice, g_email,
          g_receipt, g_lecture, g_code, g_travel, g_salad]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=900)
    ap.add_argument("--seed", type=int, default=23)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    rng = random.Random(args.seed)
    with open(args.out, "w", encoding="utf-8") as f:
        for i in range(args.n):
            g = GENRES[i % len(GENRES)]
            f.write(json.dumps({"label": "OTHER", "source": f"synthetic/other/{g.__name__}/{i}", "text": g(rng)},
                               ensure_ascii=False) + "\n")
    print(f"{args.n}건 저장 → {args.out}")


if __name__ == "__main__":
    main()
