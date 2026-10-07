# -*- coding: utf-8 -*-
"""문서 분류기 학습 → parser/models/doc_classifier.json

    pip install scikit-learn pymupdf
    python3 parser/training/build_dataset.py <pdf 폴더들> --out dataset.jsonl
    python3 parser/training/train_doc_classifier.py dataset.jsonl

- 특징: doc_classifier.featurize(서비스 추론과 같은 함수) → TF-IDF(sublinear tf, l2)
- 모델: 다중 클래스 로지스틱 회귀
- 증강: 문서마다 원문 + 일부 구간만 남긴 사본(첫 페이지만 올린 경우, OCR로 일부만 읽힌
  경우 흉내) + 줄을 무작위로 30% 지운 사본을 같이 학습한다.
- 평가: 회사(폴더) 단위로 20%를 떼어 학습에 안 쓴 회사의 문서로 정확도를 잰다.
"""
import argparse
import datetime
import json
import os
import random
import sys
from collections import Counter

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import doc_classifier  # noqa: E402
from training.labels import LABELS  # noqa: E402

OUT_PATH = os.path.join(os.path.dirname(HERE), "models", "doc_classifier.json")


def augment(text: str, rng: random.Random) -> list:
    lines = [l for l in text.split("\n") if l.strip()]
    out = [text]
    if len(lines) > 10:
        n = len(lines)
        k = max(8, int(n * rng.uniform(0.3, 0.6)))
        s = rng.randint(0, max(0, n - k))
        out.append("\n".join(lines[s:s + k]))
        out.append("\n".join(l for l in lines if rng.random() > 0.3))
    return out


def group_of(source: str) -> str:
    """검증용으로 떼어 낼 단위. 대량 데모 데이터는 회사 폴더 단위(같은 회사 문서가 학습·검증에
    섞이지 않게), 나머지(목 문서·가입 서류·합성 텍스트)는 문서 한 건 단위."""
    if "demo-bulk" in source.replace("\\", "/"):
        return os.path.basename(os.path.dirname(source))
    return source


MOCK_OVERSAMPLE = 6  # 서식이 한 장뿐인 목 문서(실제 양식 철강 문서 등)는 여러 번 증강해서 넣는다


def fit(rows, rng):
    texts, ys = [], []
    for r in rows:
        src = r["source"].replace("\\", "/")
        times = MOCK_OVERSAMPLE if ("mock-documents" in src and "demo-bulk" not in src) else 1
        for t in [x for _ in range(times) for x in augment(r["text"], rng)]:
            texts.append(t)
            ys.append(r["label"])
    vec = TfidfVectorizer(analyzer=doc_classifier.featurize, sublinear_tf=True, min_df=2,
                          max_features=20000, norm="l2")
    X = vec.fit_transform(texts)
    clf = LogisticRegression(C=8.0, max_iter=3000, class_weight="balanced")
    clf.fit(X, ys)
    return vec, clf, len(texts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dataset")
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()
    rng = random.Random(args.seed)

    rows = [json.loads(l) for l in open(args.dataset, encoding="utf-8")]
    groups = sorted({group_of(r["source"]) for r in rows})
    rng.shuffle(groups)
    held = set(groups[: max(1, len(groups) // 5)])
    train = [r for r in rows if group_of(r["source"]) not in held]
    test = [r for r in rows if group_of(r["source"]) in held]

    # 1) 평가: 학습에 안 쓴 회사의 문서로
    vec, clf, n_aug = fit(train, rng)
    pred = clf.predict(vec.transform([r["text"] for r in test]))
    print(f"[평가] 학습 {len(train)}건(증강 {n_aug}) / 검증 {len(test)}건 (회사 {len(held)}곳 제외)")
    print(classification_report([r["label"] for r in test], pred, digits=3, zero_division=0))

    # 2) 최종: 전체 데이터로 다시 학습해서 내보낸다
    vec, clf, n_aug = fit(rows, rng)
    vocab = {tok: int(j) for tok, j in vec.vocabulary_.items()}
    model = {
        "version": datetime.date.today().isoformat() + "-tfidf-lr",
        "classes": [str(c) for c in clf.classes_],
        "labels": {c: LABELS.get(c, c) for c in clf.classes_},
        "vocabulary": vocab,
        "idf": [round(float(x), 5) for x in vec.idf_],
        "coef": [[round(float(x), 4) for x in row] for row in clf.coef_],
        "intercept": [round(float(x), 5) for x in clf.intercept_],
        "sublinear_tf": True,
        "trained_on": {"documents": len(rows), "augmented": n_aug,
                       "per_class": dict(Counter(r["label"] for r in rows))},
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(model, f, ensure_ascii=False, separators=(",", ":"))
    print(f"저장: {OUT_PATH} ({os.path.getsize(OUT_PATH) / 1e6:.1f} MB, 특징 {len(vocab)}개, 클래스 {len(model['classes'])}개)")


if __name__ == "__main__":
    main()
