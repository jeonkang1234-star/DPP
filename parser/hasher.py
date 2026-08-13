# -*- coding: utf-8 -*-
"""블록체인 앵커링용 문서 해시 계산. 공백/줄바꿈 편차를 없앤 정규화 텍스트 기준 SHA-256.
다음 단계(스마트컨트랙트 해싱)에서 이 해시를 그대로 온체인에 기록하는 걸 염두에 둠."""
import hashlib
import re


def canonicalize_text(raw_text: str) -> str:
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def sha256_of_text(raw_text: str) -> str:
    canon = canonicalize_text(raw_text)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()
