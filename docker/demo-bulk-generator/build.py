# -*- coding: utf-8 -*-
"""보여주기용 대량 데모 데이터 빌더.

출력
  out/seed-demo-bulk.sql            - psql -f 로 실행하는 단일 스크립트(COPY 스테이징 + 집합 INSERT)
  out/document-uploads/demo-bulk/   - DPP 문서 PDF (모델 x 문서유형)
  (사진은 render_photo.py 가 별도로 document-uploads/dpp-photos/demo/ 에 만든다)
"""
import datetime
import hashlib
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from orgs import build_orgs
from models import build_models, SHORT
from dpps import build_dpps
import values as V

OUT = "/home/claude/out"
DOC_DIR = os.path.join(OUT, "document-uploads", "demo-bulk")
PHOTO_URI = "/data/document-uploads/dpp-photos/demo/{}.jpg"
DOC_URI = "/data/document-uploads/demo-bulk/{}"
R = random.Random(31337)
DAY = 1440
PASSWORD_HASH = None  # 아래에서 bcrypt로 계산

FIELDS = V.FIELDS
LABEL_EN = {}
for line in open("/home/claude/label_en.csv", encoding="utf-8"):
    k, _, v = line.rstrip("\n").partition(",")
    LABEL_EN[k] = v.strip('"')

ROLE_CODE = {"S": "RAW_SUPPLIER", "T": "TEST_LAB", "R": "RECYCLER"}


def tx(*p):
    return hashlib.sha256(("tx|" + "|".join(map(str, p))).encode()).hexdigest()


# ───────────────────────────── 적용 필드 판정 ─────────────────────────────
def applicable(code, domain, passport):
    f = FIELDS[code]
    if f["domain"] not in ("COMMON", domain):
        return False
    aw = f["applies_when"]
    if aw and "battery_passport" in aw and domain == "BATTERY":
        return passport
    return True


def main():
    import bcrypt
    global PASSWORD_HASH
    PASSWORD_HASH = bcrypt.hashpw(b"Demo1234!", bcrypt.gensalt(10)).decode().replace("$2b$", "$2a$")

    orgs = build_orgs()
    ob = {o["key"]: o for o in orgs}
    models = build_models(orgs)
    dpps = build_dpps(orgs, models)

    # 모델별 협력사 고정(문서 발행 주체가 모델마다 일관되게)
    parts_by_dom = {}
    for o in orgs:
        if o["org_type"] != "MANUFACTURER":
            parts_by_dom.setdefault((o["domain"], o["org_type"]), []).append(o)
    mfr_partners = {}
    mfr_list = [o for o in orgs if o["org_type"] == "MANUFACTURER"]
    for role, code in ROLE_CODE.items():
        for dom in ("STEEL", "BATTERY", "TEXTILE"):
            cands = parts_by_dom[(dom, code)][:]
            R.shuffle(cands)
            k = 0
            for o in [x for x in mfr_list if x["domain"] == dom]:
                n = 2 if role in ("S", "T") else 1
                pool = []
                for _ in range(n):
                    pool.append(cands[k % len(cands)])
                    k += 1
                mfr_partners.setdefault(o["key"], {})[role] = pool
    model_partner = {}
    cnt = {}
    for m in models:
        pool = mfr_partners[m["org"]]
        i = cnt.get(m["org"], 0)
        cnt[m["org"]] = i + 1
        model_partner[m["sku"]] = {role: lst[i % len(lst)] for role, lst in pool.items()}
    # ── DPP별 값 생성 ──────────────────────────────────────────────
    rows_val, rows_mat, rows_doc, rows_zkp, rows_part, rows_inv, rows_dpp = [], [], [], [], [], [], []
    rows_customs, rows_audit, rows_event = [], [], []
    doc_files = {}  # (sku, doc_type) -> (fname, meta)
    rep_ctx = {}  # sku -> 대표 ctx (문서 본문용)

    stats = {"fields": 0}
    for d in dpps:
        o = ob[d["org"]]
        m = d["model"]
        rnd = random.Random(d["uuid"])
        partners = model_partner[m["sku"]]
        ctx = V.Ctx(d, o, ob, partners, rnd)
        ctx.abbr = SHORT[o["key"]]
        ctx.cbam_inst = f"KR-{2024 + int(V.hx(o['key'])[:2], 16) % 2}-INS-{int(V.hx(o['key'], 'inst')[:5], 16) % 90000 + 10000:05d}"
        d["snap_tx"] = tx(d["uuid"], "snapshot")
        # 수명 단계 / 사용 여부
        if d["domain"] == "BATTERY":
            d["in_use"] = d["status"] == "ACTIVE" and d["issued"] > 25 * DAY and rnd.random() < 0.6
        if d["domain"] == "STEEL":
            V.steel(ctx)
            ctx.passport = True
        elif d["domain"] == "BATTERY":
            V.battery(ctx)
        else:
            V.textile(ctx)
        issued = d["status"] != "DRAFT"
        if issued:
            V.system_values(ctx, o["contact"])
            if d["domain"] == "BATTERY":
                V.battery_system(ctx, o["contact"])
                if d["status"] == "EOL":
                    V.battery_eol(ctx)
            if d["domain"] == "TEXTILE":
                ctx.put("SERIAL_NUMBER", d["serial"], "A")
        # 적용 대상 아닌 필드 제거(배터리 비여권)
        fields = {c: v for c, v in ctx.fields.items() if applicable(c, d["domain"], ctx.passport)}
        # 커버리지 확인: 적용 필드 중 FIELD_VALUE인데 안 채운 것(자동 제외)
        if issued:
            missing = [c for c, f in FIELDS.items() if f["storage_target"] == "FIELD_VALUE" and applicable(c, d["domain"], ctx.passport)
                       and c not in fields and not (f["lifecycle_stage"] and int(f["lifecycle_stage"]) > 8)
                       and not (f["is_auto"] == "t" and f["section"] == "BMS")
                       and not (d["domain"] == "TEXTILE" and (c.startswith("SHELL_MATERIAL_") or c.startswith("LINING_MATERIAL_") or c.startswith("PADDING_")))]
            if missing:
                raise SystemExit(f"{d['domain']} {m['line']} missing {missing}")

        # 참여 협력사 상태
        created, iss = d["created"], d["issued"]
        span = (created - (iss if iss else 30)) if created > (iss or 30) else DAY
        part_state = {}
        ctx.part_comp = {}
        w = max(created - (iss or 0), DAY)
        for role in ("S", "T", "R"):
            p = partners[role]
            if issued:
                inv = created - int(rnd.uniform(0.02, 0.1) * w)
                acc_ = inv - int(rnd.uniform(0.05, 0.2) * w)
                comp = iss + int(rnd.uniform(0.05, 0.3) * w)
                st = "COMPLETED"
            else:
                prog = d["progress"]
                roll = rnd.random()
                if prog > 0.8 and roll < 0.75:
                    st = "SUBMITTED" if roll < 0.35 else "COMPLETED"
                elif prog > 0.45 and roll < 0.7:
                    st = "IN_PROGRESS"
                elif roll < 0.85:
                    st = "IN_PROGRESS" if roll < 0.5 else "INVITED"
                else:
                    st = "INVITED"
                inv = created - rnd.randint(30, 600)
                inv = max(inv, 20)
                acc_ = None if st == "INVITED" else max(20, inv - rnd.randint(60, max(61, (inv - 20) // 2)))
                comp = max(10, acc_ - rnd.randint(10, max(11, (acc_ - 10) // 2))) if st in ("SUBMITTED", "COMPLETED") else None
            part_state[role] = st
            ctx.part_comp[role] = comp
            rows_part.append((d["uuid"], ROLE_CODE[role], p["key"], st, inv, acc_, comp))
            rows_inv.append((d["uuid"], ROLE_CODE[role], p["key"], "SENT" if acc_ is None else "ACCEPTED", inv, acc_))

        # DRAFT: 일부만 채움
        if not issued:
            keep = {}
            prog = d["progress"]
            for c, (v, role) in fields.items():
                if role == "A":
                    continue
                if role in ("S", "T", "R"):
                    st = part_state[role]
                    if st == "INVITED":
                        continue
                    if st == "IN_PROGRESS" and rnd.random() > 0.55:
                        continue
                    keep[c] = (v, role)
                else:
                    if c in ("MODEL_NAME", "INTERNAL_SKU", "BATTERY_CATEGORY", "RATED_CAPACITY_KWH", "GTIN", "OPERATOR_MANUFACTURER") or rnd.random() < prog + 0.05:
                        keep[c] = (v, role)
            fields = keep
        # 값 행
        for c, (v, role) in fields.items():
            if role in ("S", "T", "R"):
                age = ctx.part_comp.get(role) or max(30, created - rnd.randint(DAY, 3 * DAY))
            elif role == "A":
                age = iss if iss else 60
            else:
                lo = iss if iss else 30
                age = rnd.randint(min(lo + 30, created - 1), created - 1) if created - 1 > lo + 30 else max(lo, 30)
            rows_val.append((d["uuid"], c, v, role, age))
        stats["fields"] += len(fields)
        # 자재구성 - 발급건 전부, 작성중은 진행률 따라
        if issued or rnd.random() < d.get("progress", 1):
            for mt in ctx.mats:
                rows_mat.append((d["uuid"],) + mt)
        # 문서
        docs = [(t, r) for t, r in ctx.docs if d["domain"] != "BATTERY" or t not in ("BATTERY_CARBON_REPORT", "DUE_DILIGENCE_REPORT") or ctx.passport]
        for t, role in docs:
            status = "APPROVED"
            if not issued:
                if role in ("S", "T", "R") and part_state[role] in ("INVITED",):
                    continue
                if role in ("S", "T", "R") and part_state[role] == "IN_PROGRESS" and rnd.random() < 0.5:
                    continue
                if role == "M" and rnd.random() > d["progress"]:
                    continue
                if rnd.random() < 0.12:
                    status = "PENDING"
            key = (m["sku"], t)
            if key not in doc_files:
                doc_files[key] = None
                rep_ctx.setdefault(m["sku"], ctx)
            if role in ("S", "T", "R"):
                up = ctx.part_comp.get(role) or max(30, created - DAY)
                up = up + rnd.randint(30, 600)
            else:
                lo = iss if iss else 30
                up = rnd.randint(lo + 60, created - 60) if created - 60 > lo + 60 else lo + 30
            submitter = partners[role]["key"] if role in ("S", "T", "R") else o["key"]
            rows_doc.append([d["uuid"], t, role, key, submitter, up, status, tx(d["uuid"], t, "doc")])
        for (t, claim, circuit, sig) in ctx.zkp:
            if any(rd[0] == d["uuid"] and rd[1] == t and rd[6] == "APPROVED" for rd in rows_doc[-15:]):
                up = [rd for rd in rows_doc[-15:] if rd[0] == d["uuid"] and rd[1] == t][0][5]
                rows_zkp.append((d["uuid"], t, claim, circuit, V.hx(d["uuid"], t, "proof"), json.dumps(sig), max(up - rnd.randint(1, 4), 5), tx(d["uuid"], t, "zkp")))
        # DPP 행
        stage = {"DRAFT": rnd.choice([2, 3, 4]), "ACTIVE": 8, "SUSPENDED": 8, "EOL": 12}[d["status"]]
        if d["status"] == "ACTIVE":
            if d["domain"] == "BATTERY":
                stage = 9 if d.get("in_use") else rnd.choice([6, 7, 8])
            else:
                stage = rnd.choice([5, 6, 7, 8, 8, 8])
        upd = min(created, (iss if iss else created) - rnd.randint(0, 3 * DAY)) if iss else rnd.randint(30, min(created, 3 * DAY))
        upd = max(upd, 20)
        rows_dpp.append((d["uuid"], o["key"], m["sku"], d["serial"], d["display"], d["domain"], stage, d["status"], created, iss, upd,
                         PHOTO_URI.format(d["uuid"])))
        d["ctx"] = ctx
        # 통관(발급 & FR 수입자 & 일부)
        if issued and ctx.importer[1].startswith("FR") and rnd.random() < 0.55:
            dec = "APPROVE" if rnd.random() < 0.93 else "HOLD"
            if iss < 2 * DAY:
                dec = "PENDING"
            c_at = max(iss - rnd.randint(DAY, 6 * DAY), 90)
            dcd = max(c_at - rnd.randint(120, 2 * DAY), 30) if dec != "PENDING" else None
            reason = {"APPROVE": rnd.choice(["DPP 무결성 확인(스냅샷 해시 일치), HS 코드 일치 - 통관 승인", "서류 및 여권 데이터 정합성 확인 - 승인",
                                             "ZKP 검증 결과 확인, 원산지 KR 확인 - 승인"]),
                      "HOLD": rnd.choice(["수입자 EORI 재확인 요청 - 보류", "CBAM 신고 수량 보완 요청 - 보류"]), "PENDING": None}[dec]
            hs = m["hs"]
            rows_customs.append((d["uuid"], dec, reason, c_at, dcd, ctx.importer[0], ctx.importer[1], ctx.importer[2], hs))
        # 감사 로그(발급)
        if issued:
            rows_audit.append((o["key"], "CREATE", "DPP", d["uuid"], f"{d['display']} ({d['serial']})", "발급 완료", d["snap_tx"], iss))

    # ── 문서 PDF 생성 ──────────────────────────────────────────────
    import docgen
    os.makedirs(DOC_DIR, exist_ok=True)
    meta = docgen.build_all(doc_files, rep_ctx, ob, model_partner, DOC_DIR)
    # meta: key -> (fname, sha256, size, issuer, doc_no)

    # ── SQL ────────────────────────────────────────────────────────
    import sqlgen
    sqlgen.write(os.path.join(OUT, "seed-demo-bulk.sql"), orgs, models, rows_dpp, rows_part, rows_inv, rows_val, rows_mat, rows_doc, rows_zkp,
                 rows_customs, rows_audit, meta, ob, PASSWORD_HASH, model_partner)
    print("orgs", len(orgs), "models", len(models), "dpps", len(rows_dpp), "vals", len(rows_val), "mats", len(rows_mat), "docs", len(rows_doc),
          "pdf", len(meta), "zkp", len(rows_zkp), "customs", len(rows_customs))


if __name__ == "__main__":
    main()


def write_cleanup():
    # orgs.py 의 난수기는 모듈 전역이라 같은 프로세스에서 두 번 부르면 다른 회사가 나온다 - 새로 로드
    import importlib
    import orgs as orgs_mod
    importlib.reload(orgs_mod)
    orgs = orgs_mod.build_orgs()
    emails = ", ".join("'" + o["email"] + "'" for o in orgs)
    t = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "cleanup_template.sql"), encoding="utf-8").read()
    open(os.path.join(OUT, "cleanup-demo-bulk.sql"), "w", encoding="utf-8", newline="\n").write(t.replace("__EMAILS__", emails))


if __name__ == "__main__":
    write_cleanup()
