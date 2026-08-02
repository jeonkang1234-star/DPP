# -*- coding: utf-8 -*-
"""CLI 진입점.

사용법:
    python main.py <입력폴더> <출력폴더>

예:
    python main.py "./새 폴더" "./output"

입력폴더 아래 모든 PDF를 재귀적으로 찾아 처리하고, 출력폴더에
- <문서유형코드>.json  (문서유형별 10건 파싱 결과)
- _coverage_report.txt (사람이 읽는 커버리지 리포트)
- _coverage_report.json (기계가 읽는 커버리지 리포트)
를 생성합니다.
"""
import sys
import pipeline


def main():
    if len(sys.argv) != 3:
        print("사용법: python main.py <입력폴더> <출력폴더>")
        sys.exit(1)

    input_dir, output_dir = sys.argv[1], sys.argv[2]
    print(f"입력: {input_dir}")
    print(f"출력: {output_dir}")
    print("처리 중... (문서 수에 따라 QR 디코딩 때문에 수십 초~몇 분 걸릴 수 있습니다)")

    report, _ = pipeline.run(input_dir, output_dir)
    print()
    print(report)


if __name__ == "__main__":
    main()
