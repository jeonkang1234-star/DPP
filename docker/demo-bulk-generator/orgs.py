# -*- coding: utf-8 -*-
"""보여주기용 회원(조직) 정의 - 도메인별 30곳(제조사 10 + 협력사 20).

전부 가공의 회사다. 실존 대기업/유명 브랜드 이름은 피했다.
사업자등록번호는 국세청 검증식(체크섬)을 맞춘 형식상 유효한 번호를 생성한다.
"""
import random

R = random.Random(9230)

SURNAMES = list("김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모남궁탁국어은편용예경봉사부황보")
SURNAMES = [s for s in "김김김김이이이이박박박최최정정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명"]
GIVEN = ["민준", "서준", "도윤", "예준", "시우", "하준", "지호", "주원", "지후", "준우", "준서", "건우", "현우", "우진", "선우",
         "서연", "서윤", "지우", "서현", "민서", "하은", "하윤", "윤서", "지민", "채원", "수아", "지아", "지윤", "은서", "다은",
         "성민", "재현", "동현", "영호", "상훈", "정우", "태윤", "승현", "경민", "혜진", "수빈", "은지", "미경", "지영", "현정",
         "종혁", "병철", "광수", "재석", "희정", "유진", "소영", "나연", "태희", "용준", "명수", "창민", "보람", "슬기", "한별"]
DEPTS_MFR = ["품질보증팀", "ESG추진팀", "생산관리팀", "해외영업팀", "품질경영팀", "지속가능경영팀", "기술연구소"]
DEPTS_PART = {"RAW_SUPPLIER": ["영업팀", "품질관리팀", "구매물류팀", "원료사업부"],
              "TEST_LAB": ["시험평가팀", "인증사업팀", "분석센터", "고객지원팀"],
              "RECYCLER": ["자원순환팀", "영업관리팀", "재활용사업부", "환경안전팀"]}

ROMAN = {"김": "kim", "이": "lee", "박": "park", "최": "choi", "정": "jung", "강": "kang", "조": "cho", "윤": "yoon",
         "장": "jang", "임": "lim", "한": "han", "오": "oh", "서": "seo", "신": "shin", "권": "kwon", "황": "hwang",
         "안": "ahn", "송": "song", "류": "ryu", "전": "jeon", "홍": "hong", "고": "ko", "문": "moon", "양": "yang",
         "손": "son", "배": "bae", "백": "baek", "허": "heo", "유": "yu", "남": "nam", "심": "shim", "노": "noh",
         "하": "ha", "곽": "kwak", "성": "sung", "차": "cha", "주": "joo", "우": "woo", "구": "koo", "민": "min",
         "진": "jin", "나": "na", "지": "ji", "엄": "um", "채": "chae", "원": "won", "천": "chun", "방": "bang",
         "공": "kong", "현": "hyun", "함": "ham", "변": "byun", "염": "yeom", "여": "yeo", "추": "choo", "도": "do",
         "소": "so", "석": "seok", "선": "sun", "설": "seol", "마": "ma", "길": "gil", "연": "yeon", "위": "wi",
         "표": "pyo", "명": "myung"}
# 이름 첫 글자 -> 이메일 이니셜
INIT = {"민": "m", "서": "s", "도": "d", "예": "y", "시": "s", "하": "h", "지": "j", "주": "j", "준": "j", "건": "g",
        "현": "h", "우": "w", "선": "s", "윤": "y", "채": "c", "수": "s", "은": "e", "다": "d", "성": "s", "재": "j",
        "동": "d", "영": "y", "상": "s", "정": "j", "태": "t", "승": "s", "경": "k", "혜": "h", "미": "m", "종": "j",
        "병": "b", "광": "k", "희": "h", "유": "y", "소": "s", "나": "n", "용": "y", "명": "m", "창": "c", "보": "b",
        "슬": "s", "한": "h"}


def kr_name():
    s = R.choice(SURNAMES)
    g = R.choice(GIVEN)
    return s + g


CHO = "gknddrmbbssojjcktph"
JUNG_O = ["a", "a", "y", "y", "e", "e", "y", "y", "o", "w", "w", "o", "y", "u", "w", "w", "w", "y", "e", "u", "i"]


def _init(ch):
    i = ord(ch) - 0xAC00
    c, j = i // 588, (i % 588) // 28
    return JUNG_O[j] if CHO[c] == "o" else CHO[c]


def email_local(name):
    s, g = name[0], name[1:]
    return _init(g[0]) + _init(g[1]) + "." + ROMAN.get(s, "kim")


def biz_reg_no(used):
    """국세청 사업자등록번호 체크섬을 만족하는 번호(법인: 가운데 81/86/87/88)."""
    w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    while True:
        head = R.choice(["1", "2", "3", "4", "5", "6"]) + "%02d" % R.randint(1, 99)
        mid = R.choice(["81", "86", "87", "88"])
        tail = "%04d" % R.randint(1, 9999)
        d = [int(c) for c in head + mid + tail]
        s = sum(a * b for a, b in zip(d, w)) + (d[8] * 5) // 10
        chk = (10 - s % 10) % 10
        no = f"{head}-{mid}-{tail}{chk}"
        if no not in used:
            used.add(no)
            return no


# 지역: (도시표기, 우편번호 앞자리, 지역번호, 주소 템플릿들, 위도, 경도)
REGIONS = {
    "포항": ("포항시", "37", "054", ["경상북도 포항시 남구 동해안로 {n}", "경상북도 포항시 남구 괴동로 {n}", "경상북도 포항시 북구 흥해읍 영일만산단로 {n}"], 36.00, 129.38),
    "광양": ("광양시", "57", "061", ["전라남도 광양시 태인동 산업로 {n}", "전라남도 광양시 금호로 {n}"], 34.93, 127.73),
    "당진": ("당진시", "31", "041", ["충청남도 당진시 송악읍 북부산업로 {n}", "충청남도 당진시 석문면 산단로 {n}"], 36.95, 126.68),
    "인천": ("인천광역시", "22", "032", ["인천광역시 서구 봉수대로 {n}", "인천광역시 동구 인중로 {n}", "인천광역시 남동구 남동서로 {n}"], 37.48, 126.64),
    "창원": ("창원시", "51", "055", ["경상남도 창원시 성산구 공단로 {n}", "경상남도 창원시 마산회원구 자유무역6길 {n}"], 35.22, 128.67),
    "울산": ("울산광역시", "44", "052", ["울산광역시 남구 산업로 {n}", "울산광역시 울주군 온산읍 산암로 {n}"], 35.50, 129.35),
    "군산": ("군산시", "54", "063", ["전라북도 군산시 외항로 {n}", "전라북도 군산시 오식도동 산단로 {n}"], 35.97, 126.62),
    "부산": ("부산광역시", "46", "051", ["부산광역시 강서구 녹산산업중로 {n}", "부산광역시 사하구 다대로 {n}"], 35.09, 128.92),
    "시흥": ("시흥시", "15", "031", ["경기도 시흥시 공단1대로 {n}", "경기도 시흥시 정왕동 시화벤처로 {n}"], 37.34, 126.73),
    "평택": ("평택시", "17", "031", ["경기도 평택시 포승읍 포승공단로 {n}", "경기도 평택시 청북읍 청북남로 {n}"], 36.99, 126.85),
    "오창": ("청주시", "28", "043", ["충청북도 청주시 청원구 오창읍 과학산업2로 {n}", "충청북도 청주시 흥덕구 옥산면 과학산업로 {n}"], 36.71, 127.43),
    "천안": ("천안시", "31", "041", ["충청남도 천안시 서북구 직산읍 4산단로 {n}", "충청남도 천안시 동남구 풍세로 {n}"], 36.84, 127.14),
    "구미": ("구미시", "39", "054", ["경상북도 구미시 3공단3로 {n}", "경상북도 구미시 산동읍 첨단기업1로 {n}"], 36.10, 128.39),
    "새만금": ("군산시", "54", "063", ["전라북도 군산시 새만금북로 {n}"], 35.93, 126.57),
    "세종": ("세종특별자치시", "30", "044", ["세종특별자치시 연서면 월하리 산업단지로 {n}"], 36.58, 127.26),
    "화성": ("화성시", "18", "031", ["경기도 화성시 향남읍 제약공단2길 {n}", "경기도 화성시 팔탄면 서해로 {n}"], 37.13, 126.91),
    "대구": ("대구광역시", "42", "053", ["대구광역시 서구 염색공단로 {n}", "대구광역시 달서구 성서공단로 {n}", "대구광역시 북구 3공단로 {n}"], 35.86, 128.52),
    "구로": ("서울특별시", "08", "02", ["서울특별시 구로구 디지털로 {n}", "서울특별시 금천구 가산디지털1로 {n}"], 37.48, 126.89),
    "성수": ("서울특별시", "04", "02", ["서울특별시 성동구 성수이로 {n}", "서울특별시 성동구 아차산로 {n}"], 37.54, 127.05),
    "양주": ("양주시", "11", "031", ["경기도 양주시 은현면 화합로 {n}", "경기도 양주시 광적면 부흥로 {n}"], 37.79, 127.05),
    "경산": ("경산시", "38", "053", ["경상북도 경산시 진량읍 공단8로 {n}"], 35.87, 128.80),
    "익산": ("익산시", "54", "063", ["전라북도 익산시 석암로 {n}"], 35.95, 126.96),
    "안산": ("안산시", "15", "031", ["경기도 안산시 단원구 산단로 {n}", "경기도 안산시 단원구 해봉로 {n}"], 37.31, 126.80),
    "대전": ("대전광역시", "34", "042", ["대전광역시 유성구 테크노2로 {n}", "대전광역시 대덕구 대덕대로 {n}"], 36.38, 127.40),
    "진천": ("진천군", "27", "043", ["충청북도 진천군 이월면 밤디길 {n}"], 36.88, 127.43),
}


def kr_address(region):
    city, pz, tel, tpls, lat, lon = REGIONS[region]
    addr = R.choice(tpls).format(n=R.randint(12, 380))
    postal = pz + "%03d" % R.randint(0, 999)
    phone = f"{tel}-{R.randint(200, 899)}-{R.randint(1000, 9999)}"
    return city, postal, addr, phone, lat + R.uniform(-0.03, 0.03), lon + R.uniform(-0.03, 0.03)


# ─────────────────────────────────────────────────────────────────────────────
# 제조사 (도메인별 10)
#   key, 국문명, 영문명, 이메일 도메인, 지역, 제품군(모델 생성기가 참조), 생산경로 등
# ─────────────────────────────────────────────────────────────────────────────
STEEL_MFR = [
    ("hangyeol", "한결제강 주식회사", "Hangyeol Steel Co., Ltd.", "hangyeolsteel.co.kr", "당진", ["SECTION"], "BF_BOF"),
    ("seohae", "서해특수강 주식회사", "Seohae Special Steel Co., Ltd.", "seohaess.co.kr", "군산", ["BAR", "WIRE_ROD"], "EAF"),
    ("donglim", "동림스틸 주식회사", "Donglim Steel Corp.", "donglimsteel.co.kr", "광양", ["HR_COIL"], "BF_BOF"),
    ("taeyoung", "태영후판 주식회사", "Taeyoung Heavy Plate Co., Ltd.", "typlate.co.kr", "포항", ["PLATE"], "BF_BOF"),
    ("geumsan", "금산강판 주식회사", "Geumsan Coated Steel Co., Ltd.", "geumsancs.co.kr", "인천", ["CR_COIL", "HDG_COIL"], "BF_BOF"),
    ("mirae", "미래제철 주식회사", "Mirae Iron & Steel Co., Ltd.", "miraeis.co.kr", "창원", ["REBAR"], "EAF"),
    ("cheongsol", "청솔스틸 주식회사", "Cheongsol Steel Co., Ltd.", "cheongsolsteel.co.kr", "부산", ["SECTION", "PLATE"], "EAF"),
    ("daewon", "대원선재 주식회사", "Daewon Wire Rod Co., Ltd.", "daewonwr.co.kr", "울산", ["WIRE_ROD"], "BF_BOF"),
    ("wooseong", "우성강재 주식회사", "Wooseong Steel Materials Co., Ltd.", "wooseongsm.co.kr", "울산", ["PLATE", "HR_COIL"], "BF_BOF"),
    ("hanvit", "한빛메탈 주식회사", "Hanvit Metal Industries Co., Ltd.", "hanvitmetal.co.kr", "시흥", ["HDG_COIL", "CR_COIL"], "EAF"),
]
BATTERY_MFR = [
    ("voltline", "볼트라인에너지 주식회사", "Voltline Energy Co., Ltd.", "voltline.co.kr", "오창", ["EV_PACK", "EV_MODULE"], "NMC"),
    ("cellcore", "셀코어 주식회사", "CellCore Inc.", "cellcore.co.kr", "천안", ["PRISMATIC", "EV_MODULE"], "NCA"),
    ("haion", "하이온배터리 주식회사", "Haion Battery Co., Ltd.", "haionbattery.co.kr", "구미", ["ESS_RACK", "ESS_MODULE"], "LFP"),
    ("apexcell", "에이펙스셀 주식회사", "ApexCell Co., Ltd.", "apexcell.co.kr", "새만금", ["POUCH", "EV_PACK"], "NMC"),
    ("nuri", "누리모빌리티에너지 주식회사", "Nuri Mobility Energy Co., Ltd.", "nuri-me.co.kr", "진천", ["LMT_EBIKE", "LMT_SCOOTER"], "NMC"),
    ("powergrid", "파워그리드이에스에스 주식회사", "PowerGrid ESS Co., Ltd.", "powergridess.co.kr", "세종", ["ESS_RACK", "ESS_HOME"], "LFP"),
    ("daejin", "대진축전지 주식회사", "Daejin Storage Battery Co., Ltd.", "daejinbattery.co.kr", "경산", ["SLI_AGM", "SLI_LFP"], "LEAD_ACID"),
    ("mobicell", "모비셀 주식회사", "MobiCell Co., Ltd.", "mobicell.co.kr", "화성", ["CYLINDRICAL", "PORTABLE"], "NMC"),
    ("greenvolt", "그린볼트모빌리티 주식회사", "GreenVolt Mobility Co., Ltd.", "greenvolt.co.kr", "대전", ["LMT_SCOOTER", "EV_MODULE"], "LFP"),
    ("corepower", "코어파워텍 주식회사", "CorePower Tech Co., Ltd.", "corepowertech.co.kr", "안산", ["INDUSTRIAL_FORKLIFT", "ESS_MODULE"], "LFP"),
]
TEXTILE_MFR = [
    ("saebom", "새봄텍스타일 주식회사", "Saebom Textile Co., Ltd.", "saebomtex.co.kr", "성수", ["TSHIRT", "SWEATSHIRT"], None),
    ("raon", "라온패브릭 주식회사", "Raon Fabric Co., Ltd.", "raonfabric.co.kr", "대구", ["FABRIC_ROLL_WOVEN"], None),
    ("hanol", "한올니트 주식회사", "Hanol Knit Co., Ltd.", "hanolknit.co.kr", "양주", ["SWEATER", "FABRIC_ROLL_KNIT"], None),
    ("bluejean", "블루진어패럴 주식회사", "Bluejean Apparel Co., Ltd.", "bluejeanapparel.co.kr", "구로", ["DENIM"], None),
    ("sodam", "소담방적 주식회사", "Sodam Spinning Co., Ltd.", "sodamspin.co.kr", "경산", ["YARN"], None),
    ("nuriout", "누리아웃도어 주식회사", "Nuri Outdoor Co., Ltd.", "nurioutdoor.co.kr", "성수", ["JACKET", "FLEECE"], None),
    ("moa", "모아린넨 주식회사", "Moa Linen Co., Ltd.", "moalinen.co.kr", "대구", ["FABRIC_ROLL_LINEN", "SHIRT"], None),
    ("haneul", "하늘섬유 주식회사", "Haneul Fiber Co., Ltd.", "haneulfiber.co.kr", "구미", ["FABRIC_ROLL_POLY", "YARN"], None),
    ("garam", "가람패션 주식회사", "Garam Fashion Co., Ltd.", "garamfashion.co.kr", "구로", ["TSHIRT", "SHIRT"], None),
    ("dain", "다인섬유 주식회사", "Dain Textile Co., Ltd.", "daintextile.co.kr", "익산", ["TOWEL", "FABRIC_ROLL_WOVEN"], None),
]

# ─────────────────────────────────────────────────────────────────────────────
# 협력사 (도메인별 20) - (key, 국문명, 영문명, 역할, 국가, 이메일 도메인, 지역 or 해외주소, 설명)
# ─────────────────────────────────────────────────────────────────────────────
STEEL_PART = [
    ("gyeongin", "경인자원 주식회사", "Gyeongin Resources Co., Ltd.", "RAW_SUPPLIER", "KR", "gyeonginres.co.kr", "인천", "철스크랩"),
    ("nambu", "남부스크랩 주식회사", "Nambu Scrap Co., Ltd.", "RAW_SUPPLIER", "KR", "nambuscrap.co.kr", "부산", "철스크랩"),
    ("yeongnam", "영남철원 주식회사", "Yeongnam Iron Source Co., Ltd.", "RAW_SUPPLIER", "KR", "yniron.co.kr", "포항", "철스크랩"),
    ("daegwang", "대광합금철 주식회사", "Daegwang Ferro Alloy Co., Ltd.", "RAW_SUPPLIER", "KR", "dgferro.co.kr", "당진", "합금철"),
    ("samjung", "삼정석회 주식회사", "Samjung Lime Co., Ltd.", "RAW_SUPPLIER", "KR", "samjunglime.co.kr", "울산", "생석회"),
    ("hanwoori", "한우리코크스 주식회사", "Hanwoori Coke Co., Ltd.", "RAW_SUPPLIER", "KR", "hanwooricoke.co.kr", "광양", "코크스"),
    ("pilbara", "Pilgrim Ore Trading Pty Ltd", "Pilgrim Ore Trading Pty Ltd", "RAW_SUPPLIER", "AU", "pilgrimore.com.au",
     ("Level 9, 140 St Georges Terrace, Perth WA 6000", "Perth", "6000", "+61 8 6143 2270"), "철광석"),
    ("minas", "Minas Serrana Mineração Ltda", "Minas Serrana Mineração Ltda", "RAW_SUPPLIER", "BR", "minasserrana.com.br",
     ("Av. do Contorno 6594, Belo Horizonte MG 30110-044", "Belo Horizonte", "30110-044", "+55 31 3517 4410"), "철광석"),
    ("kitakami", "Kitakami Alloy Co., Ltd.", "Kitakami Alloy Co., Ltd.", "RAW_SUPPLIER", "JP", "kitakami-alloy.co.jp",
     ("2-8-1 Minatomachi, Kitakami, Iwate 024-0051", "Kitakami", "024-0051", "+81 197 61 3380"), "니켈·몰리브덴 합금"),
    ("ksmr", "한국소재시험연구원", "Korea Steel Materials Research Institute", "TEST_LAB", "KR", "ksmr.re.kr", "포항", "소재 시험"),
    ("daehan", "대한금속분석센터 주식회사", "Daehan Metal Analysis Center Co., Ltd.", "TEST_LAB", "KR", "dmac.co.kr", "창원", "화학분석"),
    ("greencarbon", "그린카본검증원 주식회사", "Green Carbon Verification Co., Ltd.", "TEST_LAB", "KR", "greencarbonv.co.kr", "구로", "CBAM 검증"),
    ("nordpruef", "Nordprüf Materialtechnik GmbH", "Nordprüf Materialtechnik GmbH", "TEST_LAB", "DE", "nordpruef.de",
     ("Industriestraße 41, 47119 Duisburg", "Duisburg", "47119", "+49 203 7289 410"), "EN 10204 3.2 입회검사"),
    ("carbonis", "Carbonis Verification B.V.", "Carbonis Verification B.V.", "TEST_LAB", "NL", "carbonis.nl",
     ("Wilhelminakade 91, 3072 AP Rotterdam", "Rotterdam", "3072 AP", "+31 10 750 3310"), "CBAM 제3자 검증"),
    ("hanbitcert", "한빛인증원 주식회사", "Hanbit Certification Co., Ltd.", "TEST_LAB", "KR", "hanbitcert.co.kr", "대전", "EPD 인증"),
    ("remetal", "리메탈 주식회사", "ReMetal Co., Ltd.", "RECYCLER", "KR", "remetal.co.kr", "시흥", "고철 재활용"),
    ("ecosteel", "에코스틸리사이클 주식회사", "EcoSteel Recycle Co., Ltd.", "RECYCLER", "KR", "ecosteelrc.co.kr", "평택", "건설강재 해체·재활용"),
    ("hangang", "한강자원순환 주식회사", "Hangang Resource Circulation Co., Ltd.", "RECYCLER", "KR", "hangangrc.co.kr", "안산", "철스크랩 가공"),
    ("rmr", "Rijnmond Metal Recovery B.V.", "Rijnmond Metal Recovery B.V.", "RECYCLER", "NL", "rijnmondmetal.nl",
     ("Moezelweg 180, 3198 LS Europoort Rotterdam", "Rotterdam", "3198 LS", "+31 181 290 330"), "EU 역내 해체·재활용"),
    ("jeil", "제일해체산업 주식회사", "Jeil Demolition Industry Co., Ltd.", "RECYCLER", "KR", "jeildemo.co.kr", "울산", "플랜트 해체"),
]
BATTERY_PART = [
    ("andino", "Salar Andino Litio SpA", "Salar Andino Litio SpA", "RAW_SUPPLIER", "CL", "andinolitio.cl",
     ("Av. Apoquindo 3721, Piso 12, Las Condes, Santiago", "Santiago", "7550000", "+56 2 2940 1180"), "탄산리튬"),
    ("sulawesi", "PT Sulawesi Nikel Prima", "PT Sulawesi Nikel Prima", "RAW_SUPPLIER", "ID", "sulawesinikel.co.id",
     ("Jl. Jend. Sudirman Kav. 52-53, Jakarta 12190", "Jakarta", "12190", "+62 21 5150 3320"), "황산니켈(MHP)"),
    ("nordcobalt", "Nordic Cobalt Refinery Oy", "Nordic Cobalt Refinery Oy", "RAW_SUPPLIER", "FI", "nordiccobalt.fi",
     ("Satamatie 14, 67900 Kokkola", "Kokkola", "67900", "+358 6 820 4410"), "황산코발트"),
    ("kcathode", "한국양극재 주식회사", "Korea Cathode Materials Co., Ltd.", "RAW_SUPPLIER", "KR", "kcathode.co.kr", "포항", "양극재"),
    ("saehan", "새한음극소재 주식회사", "Saehan Anode Materials Co., Ltd.", "RAW_SUPPLIER", "KR", "saehananode.co.kr", "세종", "음극재(흑연)"),
    ("hlelec", "에이치엘전해액 주식회사", "HL Electrolyte Co., Ltd.", "RAW_SUPPLIER", "KR", "hlelectrolyte.co.kr", "울산", "전해액"),
    ("dongbang", "동방분리막 주식회사", "Dongbang Separator Co., Ltd.", "RAW_SUPPLIER", "KR", "dbseparator.co.kr", "오창", "분리막"),
    ("jinwoo", "진우동박 주식회사", "Jinwoo Copper Foil Co., Ltd.", "RAW_SUPPLIER", "KR", "jinwoofoil.co.kr", "익산", "동박"),
    ("qinghai", "Qinghai Salt Lake Graphite Co., Ltd.", "Qinghai Salt Lake Graphite Co., Ltd.", "RAW_SUPPLIER", "CN", "qhgraphite.cn",
     ("No. 18 Jianguo Road, Xining, Qinghai 810000", "Xining", "810000", "+86 971 821 6630"), "천연흑연"),
    ("kbsi", "한국배터리안전연구원", "Korea Battery Safety Institute", "TEST_LAB", "KR", "kbsi.re.kr", "오창", "UN38.3·안전성"),
    ("celltest", "셀테스트코리아 주식회사", "CellTest Korea Co., Ltd.", "TEST_LAB", "KR", "celltest.co.kr", "천안", "성능·수명 시험"),
    ("bpz", "Batterieprüfzentrum Süd GmbH", "Batterieprüfzentrum Süd GmbH", "TEST_LAB", "DE", "bpz-sued.de",
     ("Robert-Bosch-Straße 12, 89081 Ulm", "Ulm", "89081", "+49 731 1754 220"), "EU 배터리규정 적합성"),
    ("carbonlab", "카본랩 주식회사", "CarbonLab Co., Ltd.", "TEST_LAB", "KR", "carbonlab.co.kr", "대전", "탄소발자국 산정"),
    ("rmd", "공급망실사센터 주식회사", "Responsible Minerals Diligence Co., Ltd.", "TEST_LAB", "KR", "rmdcenter.co.kr", "구로", "공급망 실사 감사"),
    ("recycle-e", "리사이클에너지 주식회사", "Recycle Energy Co., Ltd.", "RECYCLER", "KR", "recycle-e.co.kr", "군산", "습식제련"),
    ("secondlife", "세컨드라이프이에스에스 주식회사", "SecondLife ESS Co., Ltd.", "RECYCLER", "KR", "secondlifeess.co.kr", "화성", "재사용·재목적화"),
    ("hydromet", "Hydromet Recovery GmbH", "Hydromet Recovery GmbH", "RECYCLER", "DE", "hydromet-recovery.de",
     ("Chemiepark 7, 06749 Bitterfeld-Wolfen", "Bitterfeld-Wolfen", "06749", "+49 3494 638 710"), "EU 역내 재활용"),
    ("sunhwan", "순환배터리 주식회사", "Sunhwan Battery Recycling Co., Ltd.", "RECYCLER", "KR", "sunhwanbattery.co.kr", "경산", "폐배터리 전처리"),
    ("blackmass", "블랙매스테크 주식회사", "BlackMass Tech Co., Ltd.", "RECYCLER", "KR", "blackmasstech.co.kr", "울산", "블랙매스 회수"),
    ("leadcycle", "리드사이클 주식회사", "LeadCycle Co., Ltd.", "RECYCLER", "KR", "leadcycle.co.kr", "진천", "납축전지 재생"),
]
TEXTILE_PART = [
    ("aegean", "Aegean Organic Cotton A.Ş.", "Aegean Organic Cotton A.Ş.", "RAW_SUPPLIER", "TR", "aegeancotton.com.tr",
     ("Atatürk Organize Sanayi Bölgesi 10007 Sk. No:14, Çiğli, İzmir", "İzmir", "35620", "+90 232 376 5120"), "유기농 면"),
    ("gujarat", "Gujarat Fibre Mills Pvt. Ltd.", "Gujarat Fibre Mills Pvt. Ltd.", "RAW_SUPPLIER", "IN", "gujaratfibre.in",
     ("Plot 214, GIDC Estate, Ankleshwar, Gujarat 393002", "Ankleshwar", "393002", "+91 2646 221 470"), "면사·린넨"),
    ("saigon", "Saigon Yarn Joint Stock Company", "Saigon Yarn JSC", "RAW_SUPPLIER", "VN", "saigonyarn.vn",
     ("Lot C4, Tan Tao Industrial Park, Binh Tan, Ho Chi Minh City", "Ho Chi Minh City", "700000", "+84 28 3754 1190"), "폴리에스터사"),
    ("hyowon", "효원화섬 주식회사", "Hyowon Synthetic Fiber Co., Ltd.", "RAW_SUPPLIER", "KR", "hyowonfiber.co.kr", "구미", "재생 폴리에스터 칩"),
    ("jinju", "진주실크 주식회사", "Jinju Silk Co., Ltd.", "RAW_SUPPLIER", "KR", "jinjusilk.co.kr", "창원", "실크"),
    ("daegudye", "대구염색가공 주식회사", "Daegu Dyeing & Finishing Co., Ltd.", "RAW_SUPPLIER", "KR", "dgdyeing.co.kr", "대구", "염색가공"),
    ("merino", "Southern Merino Wool Co-op", "Southern Merino Wool Co-operative Ltd", "RAW_SUPPLIER", "AU", "southernmerino.com.au",
     ("88 Ferrars Street, South Melbourne VIC 3205", "Melbourne", "3205", "+61 3 9690 4471"), "메리노 울"),
    ("hanaro", "하나로부자재 주식회사", "Hanaro Trims Co., Ltd.", "RAW_SUPPLIER", "KR", "hanarotrims.co.kr", "양주", "지퍼·단추·라벨"),
    ("downpia", "다운피아 주식회사", "Downpia Co., Ltd.", "RAW_SUPPLIER", "KR", "downpia.co.kr", "익산", "RDS 인증 다운"),
    ("cotex", "코텍스시험인증원 주식회사", "Cotex Testing & Certification Co., Ltd.", "TEST_LAB", "KR", "cotextest.co.kr", "구로", "섬유 유해물질 시험"),
    ("hohenberg", "Hohenberg Textilinstitut GmbH", "Hohenberg Textilinstitut GmbH", "TEST_LAB", "DE", "hohenberg-textil.de",
     ("Schlossstraße 18, 74357 Bönnigheim", "Bönnigheim", "74357", "+49 7143 271 330"), "OEKO-TEX 시험"),
    ("fsc", "섬유안전검사센터 주식회사", "Fiber Safety Inspection Center Co., Ltd.", "TEST_LAB", "KR", "fsic.co.kr", "대구", "혼용률·견뢰도"),
    ("ecolabel", "에코라벨인증원 주식회사", "EcoLabel Certification Co., Ltd.", "TEST_LAB", "KR", "ecolabelcert.co.kr", "대전", "GRS·탄소발자국"),
    ("tcl", "Textile Compliance Lab Ltd.", "Textile Compliance Lab Ltd.", "TEST_LAB", "GB", "textilecompliancelab.co.uk",
     ("Unit 5, Trafford Park Road, Manchester M17 1HG", "Manchester", "M17 1HG", "+44 161 872 5540"), "REACH SVHC 분석"),
    ("refabric", "리패브릭 주식회사", "ReFabric Co., Ltd.", "RECYCLER", "KR", "refabric.co.kr", "양주", "의류 재활용"),
    ("clothcycle", "의류자원순환센터 주식회사", "Clothing Resource Circulation Center Co., Ltd.", "RECYCLER", "KR", "clothcycle.co.kr", "안산", "헌옷 선별"),
    ("loopfibre", "Loop Fibre Recovery Ltd.", "Loop Fibre Recovery Ltd.", "RECYCLER", "GB", "loopfibre.co.uk",
     ("22 Canal Street, Leicester LE1 5QB", "Leicester", "LE1 5QB", "+44 116 251 7730"), "섬유-섬유 재활용"),
    ("pet2fiber", "펫투파이버 주식회사", "PET2Fiber Co., Ltd.", "RECYCLER", "KR", "pet2fiber.co.kr", "경산", "폐페트 재생섬유"),
    ("oncycle", "온사이클 주식회사", "OnCycle Co., Ltd.", "RECYCLER", "KR", "oncycle.co.kr", "화성", "업사이클링"),
    ("greenloom", "그린룸리사이클 주식회사", "GreenLoom Recycle Co., Ltd.", "RECYCLER", "KR", "greenloom.co.kr", "대구", "폐원단 재생"),
]

FOREIGN_NAMES = {
    "AU": [("Liam", "Walker"), ("Chloe", "Bennett")], "BR": [("Rafael", "Souza"), ("Beatriz", "Almeida")],
    "JP": [("Haruto", "Sato"), ("Yui", "Tanaka")], "DE": [("Jonas", "Becker"), ("Lena", "Hoffmann"), ("Felix", "Wagner")],
    "NL": [("Daan", "de Vries"), ("Sanne", "Bakker")], "CL": [("Matías", "Rojas")], "ID": [("Budi", "Santoso")],
    "FI": [("Mikko", "Virtanen")], "CN": [("Wei", "Zhang")], "TR": [("Emre", "Yılmaz")], "IN": [("Arjun", "Patel")],
    "VN": [("Minh", "Nguyen")], "GB": [("Oliver", "Hughes"), ("Amelia", "Clarke")],
}
FOREIGN_REG = {"AU": lambda: f"ABN {R.randint(10,99)} {R.randint(100,999)} {R.randint(100,999)} {R.randint(100,999)}",
               "BR": lambda: f"{R.randint(10,99)}.{R.randint(100,999)}.{R.randint(100,999)}/0001-{R.randint(10,99)}",
               "JP": lambda: f"{R.randint(1000,9999)}-01-{R.randint(100000,999999)}",
               "DE": lambda: f"HRB {R.randint(10000, 49999)}",
               "NL": lambda: f"KvK {R.randint(20000000, 89999999)}",
               "CL": lambda: f"{R.randint(76,77)}.{R.randint(100,999)}.{R.randint(100,999)}-{R.randint(0,9)}",
               "ID": lambda: f"NIB {R.randint(10**12, 10**13-1)}",
               "FI": lambda: f"{R.randint(1000000, 3299999)}-{R.randint(0,9)}",
               "CN": lambda: "91630100" + "".join(R.choice("0123456789ABCDEFGHJKLMNPQRTUWXY") for _ in range(10)),
               "TR": lambda: f"MERSIS {R.randint(10**15, 10**16-1)}",
               "IN": lambda: f"CIN U17{R.randint(100,999)}GJ20{R.randint(10,24)}PTC{R.randint(100000,999999)}",
               "VN": lambda: f"{R.randint(300000000, 399999999)}",
               "GB": lambda: f"CRN {R.randint(10000000, 14999999)}"}


def build_orgs():
    used_biz = set()
    orgs = []
    # 가입일(일 전) - 제조사가 먼저 가입하고 협력사가 뒤따른다. 운영자 승인은 1~3일 뒤.
    def mk(domain, rec, org_type, part=False):
        if part:
            key, name, name_en, role, cc, edom, loc, desc = rec
        else:
            key, name, name_en, edom, loc, lines, route = rec
            role, cc, desc = "MANUFACTURER", "KR", None
        o = dict(key=f"{domain.lower()}-{key}", name=name, name_en=name_en, org_type=role, domain=domain,
                 country=cc, email_domain=edom, desc=desc)
        if not part:
            o["lines"] = lines
            o["route"] = route
        if cc == "KR":
            city, postal, addr, phone, lat, lon = kr_address(loc)
            o.update(city=city, postal=postal, addr1=addr, phone=phone, region=loc, lat=round(lat, 4), lon=round(lon, 4))
            o["addr2"] = R.choice(["본관", "본사동 3층", "관리동 2층", "", "", "사무동"])
            o["biz"] = biz_reg_no(used_biz)
            o["eori"] = "KR" + o["biz"].replace("-", "")[:10] + "0001"[:0]
            cname = kr_name()
            o["contact"] = cname
            o["email"] = email_local(cname) + "@" + edom
            o["mobile"] = f"010-{R.randint(2000, 9999)}-{R.randint(1000, 9999)}"
        else:
            addr, city, postal, phone = loc
            o.update(city=city, postal=postal, addr1=addr, addr2="", phone=phone, region=None, lat=None, lon=None)
            o["biz"] = FOREIGN_REG[cc]()
            o["eori"] = (cc + str(R.randint(10**9, 10**10 - 1))) if cc in ("DE", "NL", "FI") else None
            pool = FOREIGN_NAMES[cc]
            fn, ln = pool.pop(0) if len(pool) > 1 else pool[0]
            o["contact"] = f"{fn} {ln}"
            o["email"] = (fn[0] + "." + ln.replace(" ", "").replace("ı", "i")).lower() + "@" + edom
            o["mobile"] = phone
        o["dept"] = R.choice(DEPTS_MFR) if not part else R.choice(DEPTS_PART[role])
        o["website"] = "https://www." + edom
        o["tier"] = 3 if not part else R.choice([1, 2, 2, 3])
        return o

    for domain, mfrs, parts in (("STEEL", STEEL_MFR, STEEL_PART), ("BATTERY", BATTERY_MFR, BATTERY_PART),
                                ("TEXTILE", TEXTILE_MFR, TEXTILE_PART)):
        for rec in mfrs:
            o = mk(domain, rec, "MANUFACTURER")
            o["joined_days"] = R.randint(150, 205)
            orgs.append(o)
        for rec in parts:
            o = mk(domain, rec, rec[3], part=True)
            o["joined_days"] = R.randint(60, 185)
            orgs.append(o)
    return orgs


if __name__ == "__main__":
    for o in build_orgs():
        print(o["domain"], o["org_type"], o["name"], o["biz"], o["contact"], o["email"], o["phone"], o["addr1"])
