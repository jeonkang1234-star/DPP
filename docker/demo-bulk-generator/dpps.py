# -*- coding: utf-8 -*-
"""DPP 골격 - 제조사당 50건. 상태/일정/시리얼/UUID/사진 스펙까지.

값(필드) 채우기는 values.py가 이 골격을 받아서 한다.
시간은 전부 '지금으로부터 몇 분 전'(age_min)으로 들고 있다가 SQL에서 now()-interval로
바꾼다 - 스크립트를 언제 돌려도 최근 운영 중인 서비스처럼 보이게.
"""
import random
import uuid

from models import SHORT

R = random.Random(777)
NS = uuid.UUID("6f1c2d3e-9a8b-4c7d-8e6f-5a4b3c2d1e0f")
DAY = 24 * 60


def build_dpps(orgs, models):
    by_org = {}
    for m in models:
        by_org.setdefault(m["org"], []).append(m)
    dpps = []
    used_serial = set()
    for o in orgs:
        if o["org_type"] != "MANUFACTURER":
            continue
        ms = by_org[o["key"]]
        a = SHORT[o["key"]]
        joined = o["joined_days"] * DAY
        n = 50
        # 상태 분포: 발급 38~41, 작성중 7~10, 정지 0~1, 수명종료 0~2(배터리만)
        n_draft = R.randint(7, 10)
        n_susp = R.randint(0, 1)
        n_eol = R.randint(1, 2) if o["domain"] == "BATTERY" else 0
        statuses = ["DRAFT"] * n_draft + ["SUSPENDED"] * n_susp + ["EOL"] * n_eol
        statuses += ["ACTIVE"] * (n - len(statuses))
        R.shuffle(statuses)
        # 모델 가중치 - 주력 모델이 더 많이
        weights = [R.uniform(0.6, 2.2) for _ in ms]
        for i, st in enumerate(statuses):
            m = R.choices(ms, weights)[0]
            # 생성 시점: 가입 후 7일 ~ 어제. 작성중인 건은 최근 25일 안에 몰리게.
            lo = 60 * 12
            hi = joined - 7 * DAY
            if st == "DRAFT":
                created = R.randint(lo, min(hi, 25 * DAY))
            elif st in ("EOL", "SUSPENDED"):
                created = R.randint(max(lo, int(hi * 0.6)), hi)
            else:
                created = int(lo + (hi - lo) * (R.random() ** 0.8))
            issued = None
            if st != "DRAFT":
                issued = created - R.randint(2 * DAY, 18 * DAY)
                issued = max(issued, 60 * 6)
                if issued >= created:
                    issued = created - 2 * DAY
                    created = issued + 2 * DAY
            yymm = _yymm(created)
            seq = i + 1
            if o["domain"] == "STEEL":
                heat = f"{a[0]}{yymm}{R.randint(100, 999)}"
                serial = f"{a}-{yymm}-{heat[-4:]}{chr(65 + R.randint(0, 5))}"
                disp = f"{m['grade']} {m['kind']} {m['size']} · {heat}"
            elif o["domain"] == "BATTERY":
                serial = f"{a}{m['sfx'].split()[0].replace('-', '').replace('.', '')}-{yymm}-{R.randint(10000, 99999)}"
                disp = f"{m['sfx']} {m['kind']} · {serial[-5:]}"
                heat = None
            else:
                lot = f"{yymm}-{R.randint(1, 60):03d}"
                serial = f"{a}-{m['sku'].split('-')[1]}-{lot}"
                disp = f"{m['name'].split(' ', 1)[1]} · LOT {lot}"
                heat = None
            u = str(uuid.uuid5(NS, f"{o['key']}/{seq}"))
            while serial in used_serial:
                serial = serial[:-1] + chr(ord(serial[-1]) % 10 + 48) if serial[-1].isdigit() else serial + "1"
                serial = serial[:-2] + f"{R.randint(10, 99)}"
            used_serial.add(serial)
            d = dict(uuid=u, org=o["key"], domain=o["domain"], model=m, status=st, seq=seq, serial=serial,
                     display=disp[:120], heat=heat, created=created, issued=issued)
            if st == "DRAFT":
                d["progress"] = R.choice([0.35, 0.5, 0.62, 0.75, 0.84, 0.92])
            dpps.append(d)
    return dpps


def _yymm(age_min):
    import datetime
    t = datetime.datetime(2026, 9, 23, 12, 0) - datetime.timedelta(minutes=age_min)
    return t.strftime("%y%m")
