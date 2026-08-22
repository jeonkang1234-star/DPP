# -*- coding: utf-8 -*-
"""세관·시장감독기관 가입 증빙서류 + 제조사 도메인 확장 증빙서류 mock PDF 생성기.

■ 왜 파서 제약이 없는가
사업자등록증(biz_reg_certs.py)과 달리 이 문서들은 자동 판정에 쓰이지 않는다.
  - 세관/시장감독기관 가입: OrganizationService가 공적 계정은 자동승인을 아예 시도하지
    않고 항상 관리자 수동 심사로 보낸다.
  - 도메인 확장: DomainGrantService가 파일을 저장만 하고, 관리자가 화면에서 눈으로 본다.
그래서 텍스트 레이어 형식을 맞출 필요가 없고 "그럴듯하게" 보이기만 하면 된다.
다만 관리자 화면이 PDF를 iframe으로 그대로 띄우므로(FE approvalVals.js) 페이지 크기와
글꼴은 다른 mock 문서와 맞춰 둔다.

■ 기관명·사람 이름은 전부 가상이다
실존 기관(관세청, 국가기술표준원 등)의 이름이나 직인을 흉내내지 않는다. 문서 맨 위에
「데모용 모의 문서」 띠를 넣고 하단에도 같은 취지를 다시 적어서, 이 파일만 따로 돌아다녀도
실제 공문으로 오인될 여지를 없앤다.

실행:
    python3 docker/mock-documents/generator/gov_and_domain_docs.py
결과:
    docker/mock-documents/signup/기관_*.pdf
    docker/mock-documents/signup/도메인확장_*.pdf
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from render import Doc, register_fonts  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "signup")

GREY = (0.45, 0.48, 0.55)


def demo_header(d, issuer, doc_no):
    """모든 문서 공통 머리말 - 발신 기관, 문서번호, 그리고 데모 표시."""
    d.band("데모용 모의 문서 · IEUM DPP 플랫폼 시연 전용 · 실제 효력 없음", size=9, gap=20)
    d.space(6)
    d.line(issuer, size=11, bold=True, gap=15)
    d.line("문서번호 : " + doc_no, size=9, gap=13, color=GREY)
    d.rule()


def demo_footer(d, signer):
    d.space(10)
    d.line("2026 년 08 월 12 일", size=11, gap=22)
    d.line(signer, size=14, bold=True, gap=30)
    d.rule()
    d.line("※ 본 문서는 IEUM DPP 플랫폼 데모용으로 생성된 가상의 문서입니다.", size=8.5, gap=12, color=GREY)
    d.line("   기재된 기관·직위·성명은 모두 실존하지 않으며, 어떠한 법적 효력도 없습니다.", size=8.5, gap=12, color=GREY)
    d.save()


# ── 1. 세관 - 시스템 이용기관 지정 공문 ────────────────────────────────
def customs_designation(path):
    d = Doc(path)
    demo_header(d, "관세행정청 한서세관", "한서세관-통관기획-2026-0412")
    d.line("디지털 제품여권(DPP) 검증시스템 이용기관 지정 통보", size=17, bold=True, gap=30)

    d.line("수신 : IEUM DPP 플랫폼 운영기관장", size=10.5, gap=16)
    d.line("제목 : 수입통관 단계 DPP 검증시스템 이용기관 지정 및 계정 개설 요청", size=10.5, gap=22)
    d.rule()

    d.band("1. 지정 내용", gap=18)
    d.line("기관명 : 관세행정청 한서세관", size=10.5, gap=15)
    d.line("관할 구역 : 한서항 및 인접 보세구역 일원", size=10.5, gap=15)
    d.line("기관 식별 코드 : KR-HSC-041", size=10.5, gap=15)
    d.line("담당 부서 : 수입통관과 전자통관팀", size=10.5, gap=15)
    d.line("이용 범위 : 수입 신고 물품의 DPP 진위·적합성 검증 및 통관 판정 기록", size=10.5, gap=20)

    d.band("2. 계정 개설 대상", gap=18)
    d.line("담당자 : 한지원 (수입통관과 · 통관 심사관)", size=10.5, gap=15)
    d.line("업무용 연락처 : 041-555-0412", size=10.5, gap=15)
    d.line("업무용 전자우편 : customs.demo@ieum.test", size=10.5, gap=20)

    d.band("3. 요청 사항", gap=18)
    d.line("가. 위 담당자에 대하여 세관 권한의 플랫폼 계정을 개설하여 주시기 바랍니다.", size=10.5, gap=15)
    d.line("나. 통관 판정 이력은 본 세관의 기관 식별 코드로 기록되어야 합니다.", size=10.5, gap=15)
    d.line("다. 담당자 변경 시 본 공문을 갱신하여 재통보하겠습니다.", size=10.5, gap=20)

    demo_footer(d, "관세행정청 한서세관장")


# ── 2. 세관 - 담당 공무원 재직증명서 ───────────────────────────────────
def customs_employment(path):
    d = Doc(path)
    demo_header(d, "관세행정청 한서세관", "한서세관-인사-2026-0188")
    d.line("재 직 증 명 서", size=20, bold=True, gap=30)

    d.band("인적 사항", gap=18)
    d.line("성명 : 한지원", size=11, gap=17)
    d.line("소속 : 관세행정청 한서세관 수입통관과", size=11, gap=17)
    d.line("직위 : 통관 심사관", size=11, gap=17)
    d.line("고유 사번 : HSC-2021-0188", size=11, gap=17)
    d.line("재직 기간 : 2021년 03월 02일 ~ 현재", size=11, gap=22)
    d.rule()

    d.band("담당 업무", gap=18)
    d.line("수입 신고 물품의 서류 심사 및 적합성 검증", size=10.5, gap=15)
    d.line("디지털 제품여권(DPP) 진위 확인 및 통관 판정", size=10.5, gap=15)
    d.line("전자통관시스템 연계 자료의 관리", size=10.5, gap=22)
    d.rule()

    d.line("위 사람은 본 기관에 위와 같이 재직하고 있음을 증명합니다.", size=10.5, gap=20)
    d.line("본 증명서는 디지털 제품여권 플랫폼 계정 개설 목적으로 발급되었습니다.", size=10, gap=20, color=GREY)

    demo_footer(d, "관세행정청 한서세관장")


# ── 3. 시장감독기관 - 조사기관 지정 공문 ───────────────────────────────
def msa_designation(path):
    d = Doc(path)
    demo_header(d, "제품안전관리원", "제품안전관리원-안전조사-2026-0233")
    d.line("시장감시기관 지정 및 DPP 열람 권한 부여 통보", size=17, bold=True, gap=30)

    d.line("수신 : IEUM DPP 플랫폼 운영기관장", size=10.5, gap=16)
    d.line("제목 : 유통 제품 안전조사 목적의 DPP 레지스트리 열람 계정 개설 요청", size=10.5, gap=22)
    d.rule()

    d.band("1. 지정 내용", gap=18)
    d.line("기관명 : 제품안전관리원", size=10.5, gap=15)
    d.line("담당 관할 구역 : 중부권 (KR-CJU)", size=10.5, gap=15)
    d.line("기관 식별 코드 : KR-PSA-023", size=10.5, gap=15)
    d.line("담당 부서 : 제품안전조사부 유통조사팀", size=10.5, gap=15)
    d.line("근거 : 제품안전 관리에 관한 내부 규정 제12조(시장 감시)", size=10.5, gap=20)

    d.band("2. 계정 개설 대상", gap=18)
    d.line("담당자 : 윤가람 (제품안전조사부 · 사무관)", size=10.5, gap=15)
    d.line("업무용 연락처 : 043-555-0233", size=10.5, gap=15)
    d.line("업무용 전자우편 : msa.demo@ieum.test", size=10.5, gap=20)

    d.band("3. 열람 범위", gap=18)
    d.line("가. 유통 중인 제품의 DPP 공개 항목 조회", size=10.5, gap=15)
    d.line("나. 규정 충족 여부 증명(영지식증명) 결과의 열람", size=10.5, gap=15)
    d.line("다. 조사 목적 외 열람은 금지되며, 열람 이력은 감사 로그에 기록됩니다.", size=10.5, gap=20)

    demo_footer(d, "제품안전관리원장")


# ── 4. 시장감독기관 - 담당자 재직증명서 ────────────────────────────────
def msa_employment(path):
    d = Doc(path)
    demo_header(d, "제품안전관리원", "제품안전관리원-인사-2026-0091")
    d.line("재 직 증 명 서", size=20, bold=True, gap=30)

    d.band("인적 사항", gap=18)
    d.line("성명 : 윤가람", size=11, gap=17)
    d.line("소속 : 제품안전관리원 제품안전조사부 유통조사팀", size=11, gap=17)
    d.line("직위 : 사무관", size=11, gap=17)
    d.line("고유 사번 : PSA-2019-0091", size=11, gap=17)
    d.line("재직 기간 : 2019년 09월 16일 ~ 현재", size=11, gap=22)
    d.rule()

    d.band("담당 업무", gap=18)
    d.line("유통 제품의 안전성 조사 및 시정조치 요구", size=10.5, gap=15)
    d.line("디지털 제품여권 레지스트리 조사·열람", size=10.5, gap=15)
    d.line("조사 결과의 기록 및 관계기관 통보", size=10.5, gap=22)
    d.rule()

    d.line("위 사람은 본 기관에 위와 같이 재직하고 있음을 증명합니다.", size=10.5, gap=20)
    d.line("본 증명서는 디지털 제품여권 플랫폼 계정 개설 목적으로 발급되었습니다.", size=10, gap=20, color=GREY)

    demo_footer(d, "제품안전관리원장")


# ── 5. 도메인 확장 - 공장등록증(배터리 라인 신설) ──────────────────────
#
# 데모 흐름: 한빛제강(사업자등록증_한빛제강.pdf로 가입한 철강 제조사)이 마이페이지에서
# 배터리 도메인 확장을 신청하며 이 문서를 첨부한다.
def factory_registration(path):
    d = Doc(path)
    demo_header(d, "평택시청 기업지원과", "평택-공장등록-2026-0774")
    d.line("공 장 등 록 증", size=20, bold=True, gap=30)

    d.band("등록 사항", gap=18)
    d.line("등록번호 : PTK-2026-0774", size=11, bold=True, gap=18)
    d.line("회사명 : 한빛제강 주식회사", size=11, gap=17)
    d.line("사업자등록번호 : 205-86-11222", size=11, gap=17)
    d.line("대표자 : 강민석", size=11, gap=17)
    d.line("공장 소재지 : 경기도 평택시 포승공단로 45 (제2공장)", size=11, gap=17)
    d.line("등록일 : 2026년 06월 30일", size=11, gap=22)
    d.rule()

    d.band("생산 품목", gap=18)
    d.line("업종 : 일차전지 및 축전지 제조업 (표준산업분류 28202)", size=10.5, gap=16)
    d.line("주요 생산품 : 리튬이온 이차전지 셀 · 모듈", size=10.5, gap=16)
    d.line("연간 생산능력 : 셀 1,200 만셀 / 모듈 84,000 대", size=10.5, gap=16)
    d.line("제조 설비 : 전극 코팅 2기, 조립 라인 3기, 화성 공정 1기", size=10.5, gap=16)
    d.line("가동 개시일 : 2026년 07월 15일", size=10.5, gap=22)
    d.rule()

    d.band("비고", gap=18)
    d.line("기존 철강 제조(제1공장)와 별도로 이차전지 제조 라인을 신설하였음.", size=10.5, gap=15)
    d.line("디지털 제품여권 배터리 도메인 발급을 위한 증빙으로 제출함.", size=10.5, gap=20)

    demo_footer(d, "평 택 시 장")


# ── 6. 도메인 확장 - 제3자 인증서(섬유 품목 확대) ──────────────────────
def iso_certificate(path):
    d = Doc(path)
    demo_header(d, "대한시험인증 주식회사 (인정기관 등록 제 KAB-0117 호)", "DTC-QMS-2026-1183")
    d.line("품질경영시스템 인증서", size=19, bold=True, gap=24)
    d.line("ISO 9001 : 2015", size=13, bold=True, gap=28)

    d.band("인증 대상", gap=18)
    d.line("인증번호 : DTC-QMS-2026-1183", size=11, bold=True, gap=18)
    d.line("조직명 : 한빛제강 주식회사", size=11, gap=17)
    d.line("사업자등록번호 : 205-86-11222", size=11, gap=17)
    d.line("주소 : 경기도 평택시 포승공단로 45", size=11, gap=17)
    d.line("최초 인증일 : 2020년 05월 11일", size=11, gap=17)
    d.line("이번 확대 인증일 : 2026년 07월 28일", size=11, gap=17)
    d.line("유효기간 : 2029년 05월 10일까지", size=11, gap=22)
    d.rule()

    d.band("인증 범위", gap=18)
    d.line("열간압연 강판 및 형강의 설계·제조·판매", size=10.5, gap=16)
    d.line("산업용 직물 및 부직포의 제조·가공·판매  ← 이번 확대 항목", size=10.5, gap=16)
    d.line("리튬이온 이차전지 셀 및 모듈의 제조·판매", size=10.5, gap=22)
    d.rule()

    d.band("비고", gap=18)
    d.line("2026년 07월 심사에서 섬유 제품 생산 라인이 인증 범위에 추가되었음.", size=10.5, gap=15)
    d.line("디지털 제품여권 섬유·패션 도메인 발급을 위한 증빙으로 제출함.", size=10.5, gap=20)

    demo_footer(d, "대한시험인증 주식회사 대표이사")


DOCS = [
    ("기관_세관_지정공문_한서세관.pdf", customs_designation),
    ("기관_세관_재직증명서_한지원.pdf", customs_employment),
    ("기관_시장감독_지정공문_제품안전관리원.pdf", msa_designation),
    ("기관_시장감독_재직증명서_윤가람.pdf", msa_employment),
    ("도메인확장_공장등록증_한빛제강-배터리.pdf", factory_registration),
    ("도메인확장_ISO9001인증서_한빛제강-섬유.pdf", iso_certificate),
]


def main():
    register_fonts()
    out = os.path.abspath(OUT_DIR)
    os.makedirs(out, exist_ok=True)
    made = []
    for fname, fn in DOCS:
        p = os.path.join(out, fname)
        fn(p)
        made.append(p)
    for p in made:
        print("생성:", os.path.relpath(p, os.getcwd()))
    print("\n총 %d개" % len(made))


if __name__ == "__main__":
    main()
