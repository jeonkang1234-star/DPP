import { fetchRegistryExport } from './api/meApi.js';
import { publicPassportUrl } from './publicUrl.js';

/**
 * EU DPP 레지스트리 등록 데이터를 JSON 파일로 내려받는다(2026-10-08).
 * 데이터 캐리어(QR)가 가리키는 공개 주소는 브라우저가 아는 값이라 여기서 채운다.
 */
export async function downloadRegistryExport(publicUuid, say) {
  if (!publicUuid) return;
  try {
    const data = await fetchRegistryExport(publicUuid);
    const url = publicPassportUrl(publicUuid);
    const out = {
      ...data,
      product: { ...(data.product || {}), dataCarrier: { type: 'QR', url: url || null } }
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'eu-dpp-registry-' + String(publicUuid).slice(0, 8) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    const missing = (data.missingRequired || []).length;
    say && say(missing
      ? 'EU 레지스트리 등록 데이터를 내려받았습니다 · 비어 있는 필수 식별자 ' + missing + '개'
      : 'EU 레지스트리 등록 데이터를 내려받았습니다 · 레지스트리 계정 발급 후 그대로 제출합니다.');
  } catch (e) {
    say && say((e && e.message) || 'EU 레지스트리 데이터를 만들지 못했습니다.');
  }
}
