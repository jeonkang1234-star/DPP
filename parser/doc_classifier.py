# -*- coding: utf-8 -*-
"""문서 유형 분류기(2026-10-07) - 업로드한 칸과 실제 문서가 맞는지 판별한다.

왜 필요한가: 지금까지 문서 유형은 "사용자가 어느 업로드 칸에 올렸는가"로만 정해졌다.
BE가 칸에 맞는 registry_code를 붙여 파서에 넘길 뿐, 파일 내용이 정말 그 문서인지는 아무도
보지 않았다 - ZKP 문서(제강 성적서 등)는 값이 안 뽑혀서 우연히 걸러졌지만, 일반 문서 칸에는
아무 PDF나 올려도 '제출 완료'가 됐다.

모델: 문서 텍스트 → TF-IDF(단어 1·2그램 + 한글 단어 내부 글자 2·3그램) → 다중 클래스
로지스틱 회귀. 학습은 training/train_doc_classifier.py(scikit-learn)가 하고, 결과를
models/doc_classifier.json(어휘·IDF·가중치)으로 내보낸다. 추론은 이 파일이 순수 파이썬으로
한다 - 서비스 이미지에 scikit-learn을 넣을 필요가 없고, pickle 버전 호환 문제도 없다.

특징(feature) 추출 함수 featurize()는 학습과 추론이 똑같은 것을 써야 한다 - 학습 스크립트도
이 모듈의 featurize를 그대로 import한다.
"""
import json
import math
import os
import re

MODEL_PATH = os.environ.get(
    "DOC_CLASSIFIER_MODEL",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "doc_classifier.json"),
)

_WORD_PAT = re.compile(r"[0-9a-z가-힣]+")
_HANGUL_PAT = re.compile(r"^[가-힣]+$")
_DIGITS_PAT = re.compile(r"\d+")


def featurize(text: str) -> list:
    """문서 텍스트 → 특징 토큰 목록.

    - 숫자는 전부 0으로 바꾼다: 값(162.3 kg, H260201)이 아니라 문서의 '형식'을 보게 하려고.
    - 단어 1그램 + 이웃 단어 2그램: "mill test certificate", "heat no" 같은 고정 표현을 잡는다.
    - 한글 단어는 글자 2·3그램도 넣는다: '제강성적서'와 '제강 성적서'처럼 띄어쓰기가
      문서마다 달라도 같은 특징이 나오게.
    """
    t = _DIGITS_PAT.sub("0", (text or "").lower())
    words = _WORD_PAT.findall(t)
    feats = []
    for w in words:
        feats.append("w:" + w)
        if len(w) >= 3 and _HANGUL_PAT.match(w):
            for n in (2, 3):
                for i in range(len(w) - n + 1):
                    feats.append("c:" + w[i:i + n])
    for a, b in zip(words, words[1:]):
        feats.append("b:" + a + "_" + b)
    return feats


class DocClassifier:
    def __init__(self, model: dict):
        self.classes = model["classes"]
        self.labels = model.get("labels", {})
        self.vocab = model["vocabulary"]
        self.idf = model["idf"]
        self.coef = model["coef"]          # [n_classes][n_features]
        self.intercept = model["intercept"]
        self.sublinear_tf = model.get("sublinear_tf", True)
        self.version = model.get("version", "")
        self.trained_on = model.get("trained_on", {})

    @classmethod
    def load(cls, path: str = MODEL_PATH):
        with open(path, encoding="utf-8") as f:
            return cls(json.load(f))

    def _vector(self, text: str) -> dict:
        counts = {}
        for tok in featurize(text):
            j = self.vocab.get(tok)
            if j is not None:
                counts[j] = counts.get(j, 0) + 1
        vec = {}
        for j, c in counts.items():
            tf = (1.0 + math.log(c)) if self.sublinear_tf else float(c)
            vec[j] = tf * self.idf[j]
        norm = math.sqrt(sum(v * v for v in vec.values()))
        if norm > 0:
            for j in vec:
                vec[j] /= norm
        return vec

    def predict_proba(self, text: str) -> list:
        """[(doc_type, 확률)] 확률 내림차순."""
        vec = self._vector(text)
        scores = []
        for k, cls in enumerate(self.classes):
            row = self.coef[k]
            s = self.intercept[k] + sum(row[j] * v for j, v in vec.items())
            scores.append(s)
        m = max(scores)
        exps = [math.exp(s - m) for s in scores]
        z = sum(exps)
        probs = [(self.classes[k], exps[k] / z) for k in range(len(self.classes))]
        return sorted(probs, key=lambda x: -x[1])

    def label(self, doc_type: str) -> str:
        return self.labels.get(doc_type, doc_type)


# 판정 기준. 모델이 다른 유형이라고 '확신'할 때만 반려한다 - 애매하면 통과시킨다.
# 틀린 문서를 한 번 통과시키는 것보다 맞는 문서를 반려하는 쪽이 사용자에게 훨씬 나쁘다.
MISMATCH_MIN_TOP_PROB = float(os.environ.get("DOC_CLASSIFIER_MISMATCH_MIN_PROB", "0.6"))
MISMATCH_MAX_EXPECTED_PROB = float(os.environ.get("DOC_CLASSIFIER_EXPECTED_MAX_PROB", "0.1"))
MIN_FEATURES = 15

_model = None


def get_model():
    global _model
    if _model is None:
        _model = DocClassifier.load()
    return _model


def check(text: str, expected_doc_type: str = None) -> dict:
    """업로드한 칸(expected_doc_type)과 문서 내용이 맞는지 판정한다.

    verdict:
      MATCH        - 1순위가 기대 유형
      MISMATCH     - 다른 유형으로 확신(1순위 확률 ≥ 0.6, 기대 유형 확률 < 0.1) → 반려 대상
      UNSURE       - 1순위가 다르지만 확신이 낮음 → 통과
      UNKNOWN_TYPE - 기대 유형이 모델이 모르는 유형(학습에 없던 문서 칸) → 통과
      NO_TEXT      - 텍스트가 거의 없어 판단 불가 → 통과
    """
    model = get_model()
    n_feats = sum(1 for tok in featurize(text) if tok in model.vocab)
    probs = model.predict_proba(text)
    top_type, top_p = probs[0]
    expected_p = None
    if expected_doc_type:
        expected_p = next((p for c, p in probs if c == expected_doc_type), None)

    if n_feats < MIN_FEATURES:
        verdict = "NO_TEXT"
    elif not expected_doc_type:
        verdict = "PREDICT_ONLY"
    elif expected_p is None:
        verdict = "UNKNOWN_TYPE"
    elif top_type == expected_doc_type:
        verdict = "MATCH"
    elif top_p >= MISMATCH_MIN_TOP_PROB and expected_p < MISMATCH_MAX_EXPECTED_PROB:
        verdict = "MISMATCH"
    else:
        verdict = "UNSURE"

    return {
        "verdict": verdict,
        "expected_doc_type": expected_doc_type,
        "expected_label": model.label(expected_doc_type) if expected_doc_type else None,
        "expected_prob": round(expected_p, 4) if expected_p is not None else None,
        "predicted_doc_type": top_type,
        "predicted_label": model.label(top_type),
        "confidence": round(top_p, 4),
        "top3": [{"doc_type": c, "label": model.label(c), "prob": round(p, 4)} for c, p in probs[:3]],
        "model_version": model.version,
    }
