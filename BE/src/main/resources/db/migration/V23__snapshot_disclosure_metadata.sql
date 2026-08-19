-- =====================================================================
-- 앵커링 스냅샷에 공개범위·등급·출처 메타데이터 추가
--
-- 문제: 지금까지 스냅샷의 fields 배열은 field_code + 값만 담았다. 그래서 "발급 시점에
-- 이 값이 공개 항목이었는가, 영업비밀이었는가"는 스냅샷 어디에도 남지 않는다. 나중에
-- disclosure_scope를 바꾸면(규정 해석이 바뀌거나 위임법이 채택되면 실제로 바뀐다) 과거에
-- 발급한 여권이 무엇을 공개했었는지 되짚을 근거가 사라진다. 해시는 그대로인데 그 해시가
-- 무엇을 뜻했는지가 흐려지는 셈이다.
--
-- 그래서 값과 함께 그 시점의 tier / disclosure_scope / data_source / legal_basis를 같이
-- 굳힌다. 세관·시장감시당국이 "이 항목을 왜 공개 안 했나"를 물었을 때, 발급 시점에 어떤
-- 근거로 그렇게 판단했는지를 원장에 박힌 해시로 답할 수 있게 된다.
--
-- ■ 기존 스냅샷 해시는 그대로다
-- 이 함수는 앞으로 만들어질 스냅샷에만 적용된다. 이미 만들어진 dpp_snapshot.payload는
-- 손대지 않으므로 과거 해시는 그대로 검증된다(fn_verify_snapshot은 저장된 payload를
-- 다시 해싱하는 방식이라, 함수가 바뀌어도 옛 스냅샷 검증은 깨지지 않는다).
--
-- ■ 값 자체는 여전히 스냅샷에 들어간다
-- 영업비밀 항목이라고 스냅샷에서 값을 빼지는 않는다. 스냅샷은 공개 문서가 아니라 내부
-- 무결성 증거이고, 값이 빠지면 나중에 "그때 그 값이 맞았다"를 증명할 수 없다. 공개 여부를
-- 가르는 건 조회 시점(PublicPassportService)이지 저장 시점이 아니다.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_create_dpp_snapshot(
    p_dpp_id  BIGINT,
    p_reason  VARCHAR,
    p_user_id BIGINT DEFAULT NULL,
    p_mock    BOOLEAN DEFAULT TRUE
) RETURNS BIGINT AS $$
DECLARE
    v_version   INT;
    v_payload   JSONB;
    v_hash      CHAR(64);
    v_snapshot  BIGINT;
    v_anchor    BIGINT;
BEGIN
    PERFORM fn_recalc_completeness(p_dpp_id);
    PERFORM fn_refresh_dpp_attributes(p_dpp_id);

    SELECT COALESCE(max(version_no), 0) + 1
      INTO v_version
      FROM dpp_snapshot WHERE dpp_id = p_dpp_id;

    SELECT jsonb_build_object(
             'dpp', to_jsonb(d) - 'attributes',
             'attributes', d.attributes,
             'fields', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                           'field_code', v.field_code,
                           'value_text', v.value_text,
                           'value_num',  v.value_num,
                           'submitted_by_org', v.submitted_by_org,
                           'source_document_id', v.source_document_id,
                           'signature',  v.signature,
                           'submitted_at', v.submitted_at,
                           -- 발급 시점의 규제 판단을 같이 굳힌다. rf가 없을 수도 있으므로
                           -- LEFT JOIN - field_code에 FK가 걸려 있어 실제로는 항상 있지만,
                           -- 스냅샷 생성이 참조 무결성 때문에 죽는 일은 없어야 한다.
                           'tier', rf.tier,
                           'disclosure_scope', rf.disclosure_scope,
                           'data_source', rf.data_source,
                           'legal_basis', rf.legal_basis)), '[]'::jsonb)
                  FROM dpp_field_value v
                  LEFT JOIN requirement_field rf ON rf.field_code = v.field_code
                 WHERE v.dpp_id = d.dpp_id),
             'documents', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                           'doc_type', doc.doc_type_code,
                           'content_hash', doc.content_hash,
                           'issued_at', doc.issued_at,
                           'expires_at', doc.expires_at,
                           'review_status', doc.review_status)), '[]'::jsonb)
                  FROM document_link dl
                  JOIN document doc ON doc.document_id = dl.document_id
                 WHERE dl.dpp_id = d.dpp_id AND doc.deleted_at IS NULL),
             'materials', (
                SELECT COALESCE(jsonb_agg(jsonb_build_object(
                           'entry_kind', m.entry_kind,
                           'material_name', m.material_name,
                           'cas_number', m.cas_number,
                           'content_rate', m.content_rate)), '[]'::jsonb)
                  FROM material_composition m WHERE m.dpp_id = d.dpp_id),
             -- 이 스냅샷이 어떤 공개 정책 아래 만들어졌는지 요약. 항목 하나하나를 다시
             -- 세지 않아도 "발급 시점에 공개 12 / 제한 5 / 영업비밀 3이었다"를 알 수 있다.
             'disclosure_summary', (
                SELECT jsonb_build_object(
                         'public', count(*) FILTER (WHERE rf.disclosure_scope = 'PUBLIC'),
                         'restricted', count(*) FILTER (WHERE rf.disclosure_scope = 'RESTRICTED'),
                         'trade_secret', count(*) FILTER (WHERE rf.disclosure_scope = 'TRADE_SECRET'))
                  FROM dpp_field_value v
                  JOIN requirement_field rf ON rf.field_code = v.field_code
                 WHERE v.dpp_id = d.dpp_id
                   AND v.value_text IS NOT NULL AND v.value_text <> ''),
             'snapshot_at', now()
           )
      INTO v_payload
      FROM dpp d WHERE d.dpp_id = p_dpp_id;

    IF v_payload IS NULL THEN
        RAISE EXCEPTION 'DPP % 를 찾을 수 없습니다', p_dpp_id;
    END IF;

    v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');

    INSERT INTO dpp_snapshot (dpp_id, version_no, payload, content_hash,
                              trigger_reason, created_by)
    VALUES (p_dpp_id, v_version, v_payload, v_hash, p_reason, p_user_id)
    RETURNING snapshot_id INTO v_snapshot;

    INSERT INTO blockchain_anchor (target_type, target_id, content_hash,
                                   channel_name, chaincode, status,
                                   tx_id, anchored_at)
    VALUES ('DPP_SNAPSHOT', v_snapshot, v_hash,
            'dpp-channel', 'dppcc',
            CASE WHEN p_mock THEN 'MOCK' ELSE 'PENDING' END,
            CASE WHEN p_mock THEN 'mock-' || v_hash ELSE NULL END,
            CASE WHEN p_mock THEN now() ELSE NULL END)
    RETURNING anchor_id INTO v_anchor;

    UPDATE dpp_snapshot SET anchor_id = v_anchor WHERE snapshot_id = v_snapshot;

    RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql;
