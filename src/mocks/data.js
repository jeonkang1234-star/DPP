// ─────────────────────────────────────────────────────────────
// 목데이터 (Mock Data)
// 실제 API가 붙으면 이 파일은 삭제하거나 테스트 픽스처로만 남긴다.
// 모든 화면은 이 구조와 동일한 JSON을 서버에서 받는다고 가정한다.
// ─────────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 'usr_10482',
  name: '정민수',
  email: 'minsu.jung@kakao.com',
  memberType: 'INDIVIDUAL',
  joinedAt: '2026-03-11T09:00:00+09:00',
  avatarUrl: null,
  linkedAccounts: [
    { id: 'lnk_1', provider: 'kakao', providerLabel: '카카오', email: 'minsu.jung@kakao.com', connected: true }
  ],
  settings: { notifyOnUpdate: true }
};

export const MOCK_PASSPORTS = [
  {
    id: 'DPP-KR-ST-2607-0142',
    name: '열연코일 HR-SPHC 3.2t',
    brand: '대성제강',
    imageUrl: null,
    spec: {
      model: 'HRC-SPHC-32',
      gtin: '8801234567890',
      batch: 'H26-0817',
      origin: '대한민국 광양 제2공장',
      manufacturedAt: '2026년 7월 생산'
    },
    verification: { status: 'VERIFIED', anchorHash: '0x8f2a…c41d', verifiedAt: '2026-07-24T11:02:00+09:00' },
    sustainability: {
      carbon: { value: '1,842', unit: 'kgCO₂e / t' },
      water: { value: '1.4', unit: 'm³ / t' },
      recycledRate: 32
    },
    repair: {
      score: 8.5,
      manualLabel: '강재 취급·보관 가이드 (PDF)',
      manualUrl: 'https://example.com/manual/hrc-sphc-32.pdf',
      videoUrl: 'https://example.com/video/hrc-sphc-32',
      parts: [
        { id: 'prt_1', title: '방청 코팅제 재도포 서비스', detail: '대성제강 가공 지원센터', url: 'https://example.com/parts/1' },
        { id: 'prt_2', title: '절단·교정 재가공', detail: '전국 5개 코일센터', url: 'https://example.com/parts/2' }
      ],
      care: [
        { id: 'car_1', title: '재가공 시 유의', detail: '절단 후 절단면 방청 처리를 권장합니다.' },
        { id: 'car_2', title: '보관 조건', detail: '습도 60% 이하 실내 보관 시 표면 산화를 늦출 수 있습니다.' }
      ]
    },
    hazard: { hasConcern: false, note: 'REACH 고위험 우려물질(SVHC) 0.1% 초과 함유 없음' },
    disposal: {
      items: [
        { id: 'dsp_1', title: '본체 (강재)', detail: '고철 재활용 · 전기로 재용해 가능' },
        { id: 'dsp_2', title: '포장재 (밴딩)', detail: '금속 밴드는 고철, 방청지는 일반 종이 분리배출' }
      ],
      takeback: { label: '대성제강 스크랩 회수 프로그램', url: 'https://example.com/takeback/daesung' }
    }
  },
  {
    id: 'DPP-KR-BT-2607-0311',
    name: 'EV 배터리 모듈 M3-72',
    brand: '루멘셀',
    imageUrl: null,
    spec: {
      model: 'LC-M3-72',
      gtin: '8802345678901',
      batch: 'B26-1104',
      origin: '대한민국 청주 1공장',
      manufacturedAt: '2026년 7월 생산'
    },
    verification: { status: 'VERIFIED', anchorHash: '0x3b71…9ae0', verifiedAt: '2026-07-22T08:40:00+09:00' },
    sustainability: {
      carbon: { value: '4,320', unit: 'kgCO₂e / 팩' },
      water: { value: '12.8', unit: 'm³ / 팩' },
      recycledRate: 18.6
    },
    repair: {
      score: 6.2,
      manualLabel: '모듈 교체 및 진단 매뉴얼 (PDF)',
      manualUrl: 'https://example.com/manual/lc-m3-72.pdf',
      videoUrl: 'https://example.com/video/lc-m3-72',
      parts: [
        { id: 'prt_3', title: '모듈 단위 교체 셀', detail: '루멘셀 공식 서비스센터 · 전국 32곳', url: 'https://example.com/parts/3' },
        { id: 'prt_4', title: 'BMS 제어보드', detail: '지정 정비소 주문 가능', url: 'https://example.com/parts/4' }
      ],
      care: [
        { id: 'car_3', title: '충전 습관', detail: '상시 20~80% 구간 충전 시 수명을 최대 30% 연장할 수 있습니다.' },
        { id: 'car_4', title: '보관 온도', detail: '-10℃ ~ 45℃ 범위를 벗어난 환경에서 장기 방치하지 마세요.' }
      ]
    },
    hazard: { hasConcern: true, note: '리튬염 전해질 함유 · 파손 시 내부 물질에 직접 접촉하지 마세요' },
    disposal: {
      items: [
        { id: 'dsp_3', title: '배터리 모듈', detail: '지정 회수처 배출 · 일반쓰레기 배출 금지' },
        { id: 'dsp_4', title: '외장 케이스', detail: '알루미늄 분리 후 금속 재활용' }
      ],
      takeback: { label: '루멘셀 사용후 배터리 회수 프로그램', url: 'https://example.com/takeback/lumencell' }
    }
  },
  {
    id: 'DPP-KR-TX-2607-0521',
    name: '오가닉 코튼 저지 180g',
    brand: '아라텍스',
    imageUrl: null,
    spec: {
      model: 'OC-JSY-180',
      gtin: '8803456789012',
      batch: 'T26-0519',
      origin: '대한민국 대구 염색공장',
      manufacturedAt: '2026년 7월 생산'
    },
    verification: { status: 'UPDATED', anchorHash: '0xd014…7f22', verifiedAt: '2026-07-31T16:20:00+09:00' },
    sustainability: {
      carbon: { value: '4.2', unit: 'kgCO₂e / kg' },
      water: { value: '2.6', unit: 'm³ / kg' },
      recycledRate: 0
    },
    repair: {
      score: 9.1,
      manualLabel: '케어 라벨 해설 및 수선 가이드 (PDF)',
      manualUrl: 'https://example.com/manual/oc-jsy-180.pdf',
      videoUrl: 'https://example.com/video/oc-jsy-180',
      parts: [
        { id: 'prt_5', title: '수선용 여분 원단', detail: '아라텍스 온라인 스토어', url: 'https://example.com/parts/5' },
        { id: 'prt_6', title: '봉제 수선 서비스', detail: '제휴 리페어숍 12곳', url: 'https://example.com/parts/6' }
      ],
      care: [
        { id: 'car_5', title: '세탁', detail: '30℃ 이하 약한 손세탁 · 표백제 사용 금지' },
        { id: 'car_6', title: '건조', detail: '자연 그늘 건조 권장 · 기계 건조 시 수축 우려' }
      ]
    },
    hazard: { hasConcern: false, note: 'OEKO-TEX Standard 100 인증 · 유해 화학물질 기준 이내' },
    disposal: {
      items: [
        { id: 'dsp_5', title: '원단 본체', detail: '의류 수거함 배출 · 섬유 재활용 가능' },
        { id: 'dsp_6', title: '라벨·부자재', detail: '플라스틱 라벨 분리 후 배출' }
      ],
      takeback: { label: '아라텍스 헌 옷 회수 캠페인', url: 'https://example.com/takeback/aratex' }
    }
  },
  {
    id: 'DPP-FR-TX-2607-0204',
    name: 'Recycled poly woven',
    brand: 'Fibrelune SAS',
    imageUrl: null,
    spec: {
      model: 'FL-WVN-120',
      gtin: '3401234567893',
      batch: 'F26-0330',
      origin: '프랑스 리옹 공장',
      manufacturedAt: '2026년 6월 생산'
    },
    verification: { status: 'VERIFIED', anchorHash: '0x51cc…b83e', verifiedAt: '2026-06-30T10:05:00+09:00' },
    sustainability: {
      carbon: { value: '3.1', unit: 'kgCO₂e / kg' },
      water: { value: '0.9', unit: 'm³ / kg' },
      recycledRate: 82
    },
    repair: {
      score: 8.8,
      manualLabel: 'Care & repair guide (PDF)',
      manualUrl: 'https://example.com/manual/fl-wvn-120.pdf',
      videoUrl: 'https://example.com/video/fl-wvn-120',
      parts: [
        { id: 'prt_7', title: '수선용 여분 원단', detail: 'Fibrelune 리페어 스토어', url: 'https://example.com/parts/7' },
        { id: 'prt_8', title: '지퍼·부자재 키트', detail: '유럽 내 배송 지원', url: 'https://example.com/parts/8' }
      ],
      care: [
        { id: 'car_7', title: '세탁', detail: '40℃ 이하 세탁 · 섬유유연제 사용 자제' },
        { id: 'car_8', title: '다림질', detail: '중온(110℃) 이하 · 스팀 사용 금지' }
      ]
    },
    hazard: { hasConcern: false, note: 'GRS 인증 · 우려 물질 무첨가' },
    disposal: {
      items: [
        { id: 'dsp_7', title: '원단 본체', detail: '섬유 재활용 수거함 배출' },
        { id: 'dsp_8', title: '포장재', detail: '재생 종이 · 종이류 분리배출' }
      ],
      takeback: { label: 'Fibrelune take-back program', url: 'https://example.com/takeback/fibrelune' }
    }
  },
  {
    id: 'DPP-KR-TX-2506-0388',
    name: '리사이클 나일론 셔츠',
    brand: '아라텍스',
    imageUrl: null,
    spec: {
      model: 'AR-NYL-SHT',
      gtin: '8803456780015',
      batch: 'T25-1128',
      origin: '대한민국 대구 봉제공장',
      manufacturedAt: '2025년 11월 생산'
    },
    verification: { status: 'FAILED', anchorHash: '0x9e40…1d07', verifiedAt: '2026-05-28T13:12:00+09:00' },
    sustainability: {
      carbon: { value: '6.8', unit: 'kgCO₂e / 벌' },
      water: { value: '1.8', unit: 'm³ / 벌' },
      recycledRate: 64
    },
    repair: {
      score: 8.2,
      manualLabel: '수선 가이드 (PDF)',
      manualUrl: 'https://example.com/manual/ar-nyl-sht.pdf',
      videoUrl: 'https://example.com/video/ar-nyl-sht',
      parts: [
        { id: 'prt_9', title: '단추·지퍼 수선 키트', detail: '아라텍스 온라인 스토어', url: 'https://example.com/parts/9' },
        { id: 'prt_10', title: '봉제 수선 서비스', detail: '제휴 리페어숍 12곳', url: 'https://example.com/parts/10' }
      ],
      care: [
        { id: 'car_9', title: '세탁', detail: '30℃ 이하 세탁 · 망 사용 권장' },
        { id: 'car_10', title: '건조', detail: '자연 건조 · 직사광선 피하기' }
      ]
    },
    hazard: { hasConcern: false, note: 'OEKO-TEX Standard 100 인증 · 유해 화학물질 기준 이내' },
    disposal: {
      items: [
        { id: 'dsp_9', title: '원단 본체', detail: '의류 수거함 배출 · 섬유 재활용 가능' },
        { id: 'dsp_10', title: '부자재', detail: '금속 단추 분리 후 배출' }
      ],
      takeback: { label: '아라텍스 헌 옷 회수 캠페인', url: 'https://example.com/takeback/aratex' }
    }
  }
];

// 내 조회(스캔) 기록 — 여권 상세와 분리된 별도 리소스
export const MOCK_SCANS = [
  { id: 'scn_9001', passportId: 'DPP-KR-ST-2607-0142', name: '열연코일 HR-SPHC 3.2t', brand: '대성제강', thumbnailUrl: null, status: 'VERIFIED', scannedAt: '2026-07-28T14:02:00+09:00', passportUpdatedAt: '2026-07-24T11:02:00+09:00' },
  { id: 'scn_9002', passportId: 'DPP-KR-BT-2607-0311', name: 'EV 배터리 모듈 M3-72', brand: '루멘셀', thumbnailUrl: null, status: 'VERIFIED', scannedAt: '2026-07-21T09:35:00+09:00', passportUpdatedAt: '2026-07-22T08:40:00+09:00' },
  { id: 'scn_9003', passportId: 'DPP-KR-TX-2607-0521', name: '오가닉 코튼 저지 180g', brand: '아라텍스', thumbnailUrl: null, status: 'UPDATED', scannedAt: '2026-07-14T18:47:00+09:00', passportUpdatedAt: '2026-07-31T16:20:00+09:00' },
  { id: 'scn_9004', passportId: 'DPP-FR-TX-2607-0204', name: 'Recycled poly woven', brand: 'Fibrelune SAS', thumbnailUrl: null, status: 'VERIFIED', scannedAt: '2026-07-02T11:20:00+09:00', passportUpdatedAt: '2026-06-30T10:05:00+09:00' },
  { id: 'scn_9005', passportId: 'DPP-KR-TX-2506-0388', name: '리사이클 나일론 셔츠', brand: '아라텍스', thumbnailUrl: null, status: 'FAILED', scannedAt: '2026-06-11T20:14:00+09:00', passportUpdatedAt: '2026-05-28T13:12:00+09:00' }
];

// QR 스캐너가 읽은 코드 → 여권 ID 매핑 (실서비스에서는 서버가 해석)
export const MOCK_QR_LOOKUP = {
  'IEUM://dpp/DPP-KR-BT-2607-0311': 'DPP-KR-BT-2607-0311',
  DEFAULT: 'DPP-KR-BT-2607-0311'
};