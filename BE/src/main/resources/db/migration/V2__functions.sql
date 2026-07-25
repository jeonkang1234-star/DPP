-- =====================================================================
-- DPP 플랫폼 함수 / 뷰 (Phase 1)
-- 실행 전제: 01_schema.sql 완료
-- =====================================================================


-- ---------------------------------------------------------------------
-- 뷰: 특정 DPP에 요구되는 필드 목록과 충족 여부
--     완성도 계산, 미충족 필드 표시, 독촉 알림이 모두 이 뷰를 씀
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dpp_requirement_status AS
SELECT
    d.dpp_id,
    rf.field_code,
    rf.section,
    rf.label_ko,
    rf.field_kind,
    rf.storage_target,
    rf.is_required,
    rf.responsible_role,
    rf.linked_doc_type,
    rf.sort_order,
    CASE
        WHEN rf.storage_target = 'FIELD_VALUE' THEN EXISTS (
            SELECT 1 FROM dpp_field_value v
             WHERE v.dpp_id = d.dpp_id
               AND v.field_code = rf.field_code
               AND (v.value_text IS NOT NULL OR v.value_num  IS NOT NULL
                 OR v.value_bool IS NOT NULL OR v.value_date IS NOT NULL
                 OR v.value_json IS NOT NULL)
        )
        WHEN rf.storage_target = 'MATERIAL_COMPOSITION' THEN EXISTS (
            SELECT 1 FROM material_composition m
             WHERE m.dpp_id = d.dpp_id
               AND m.entry_kind = COALESCE(rf.material_entry_kind, 'MATERIAL')
        )
        WHEN rf.storage_target = 'DOCUMENT' THEN EXISTS (
            SELECT 1
              FROM document_link dl
              JOIN document doc ON doc.document_id = dl.document_id
             WHERE dl.dpp_id = d.dpp_id
               AND doc.doc_type_code = rf.linked_doc_type
               AND doc.review_status = 'APPROVED'
               AND doc.deleted_at IS NULL
        )
        ELSE FALSE
    END AS is_filled
FROM dpp d
JOIN requirement_field rf
     ON rf.domain IN ('COMMON', d.domain)
    AND rf.is_active
    AND NOT rf.is_auto
WHERE d.deleted_at IS NULL;

COMMENT ON VIEW v_dpp_requirement_status IS 'DPP별 규정 필드 충족 현황. 화면·완성도·독촉의 단일 출처';


-- ---------------------------------------------------------------------
-- 뷰: 미충족 필드와 책임 주체 (대시보드 "미충족 필드 및 책임 주체")
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dpp_missing_field AS
SELECT
    s.dpp_id,
    s.field_code,
    s.section,
    s.label_ko,
    s.field_kind,
    s.linked_doc_type,
    s.responsible_role,
    r.role_name_ko AS responsible_role_name,
    p.org_id       AS responsible_org_id,
    p.guest_email  AS responsible_email,
    s.sort_order
FROM v_dpp_requirement_status s
LEFT JOIN role r
       ON r.role_code = s.responsible_role
LEFT JOIN dpp_participant p
       ON p.dpp_id = s.dpp_id
      AND p.role_code = s.responsible_role
WHERE s.is_required
  AND NOT s.is_filled;


-- ---------------------------------------------------------------------
-- 함수: 완성도 재계산 후 dpp 테이블에 반영
--       호출 시점 = 필드값 저장 / 문서 승인 / 문서 만료 / 소재 등록
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_recalc_completeness(p_dpp_id BIGINT)
RETURNS NUMERIC AS $$
DECLARE
    v_required INT;
    v_filled   INT;
    v_rate     NUMERIC(5,2);
BEGIN
    SELECT count(*) FILTER (WHERE is_required),
           count(*) FILTER (WHERE is_required AND is_filled)
      INTO v_required, v_filled
      FROM v_dpp_requirement_status
     WHERE dpp_id = p_dpp_id;

    IF v_required IS NULL OR v_required = 0 THEN
        v_rate := 0;
    ELSE
        v_rate := ROUND(v_filled::NUMERIC * 100 / v_required, 2);
    END IF;

    UPDATE dpp
       SET filled_count   = COALESCE(v_filled, 0),
           required_count = COALESCE(v_required, 0),
           completeness   = v_rate
     WHERE dpp_id = p_dpp_id;

    RETURN v_rate;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 함수: attributes 캐시 재생성 (dpp_field_value가 원천)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_dpp_attributes(p_dpp_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_attr JSONB;
BEGIN
    SELECT COALESCE(jsonb_object_agg(field_code, val), '{}'::jsonb)
      INTO v_attr
      FROM (
        SELECT v.field_code,
               COALESCE(
                   v.value_json,
                   to_jsonb(v.value_text),
                   to_jsonb(v.value_num),
                   to_jsonb(v.value_bool),
                   to_jsonb(v.value_date)
               ) AS val
          FROM dpp_field_value v
         WHERE v.dpp_id = p_dpp_id
      ) t;

    UPDATE dpp SET attributes = v_attr WHERE dpp_id = p_dpp_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 함수: DPP 스냅샷 생성 + 블록체인 앵커 등록
--       1차에서는 앵커 status='MOCK'. 실제 Fabric 연동 시 PENDING으로 변경
-- ---------------------------------------------------------------------
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
                           'signature',  v.signature,
                           'submitted_at', v.submitted_at)), '[]'::jsonb)
                  FROM dpp_field_value v WHERE v.dpp_id = d.dpp_id),
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

COMMENT ON FUNCTION fn_create_dpp_snapshot IS
    '앵커 시점의 DPP 전체를 동결하고 해시를 기록. 이후 DPP를 수정해도 검증이 깨지지 않음';


-- ---------------------------------------------------------------------
-- 함수: 스냅샷 무결성 검증 (세관 통관 심사에서 호출)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verify_snapshot(p_snapshot_id BIGINT)
RETURNS VARCHAR AS $$
DECLARE
    v_stored   CHAR(64);
    v_recalc   CHAR(64);
    v_anchored CHAR(64);
BEGIN
    SELECT s.content_hash,
           encode(digest(s.payload::text, 'sha256'), 'hex'),
           a.content_hash
      INTO v_stored, v_recalc, v_anchored
      FROM dpp_snapshot s
      LEFT JOIN blockchain_anchor a ON a.anchor_id = s.anchor_id
     WHERE s.snapshot_id = p_snapshot_id;

    IF v_stored IS NULL THEN
        RETURN 'NOT_FOUND';
    ELSIF v_anchored IS NULL THEN
        RETURN 'NOT_ANCHORED';
    ELSIF v_stored = v_recalc AND v_stored = v_anchored THEN
        RETURN 'MATCH';
    ELSE
        RETURN 'MISMATCH';
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 함수: 배치 문서를 해당 배치의 모든 DPP에 상속 연결
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_link_batch_document(p_document_id BIGINT)
RETURNS INT AS $$
DECLARE
    v_owner_type VARCHAR(20);
    v_owner_id   BIGINT;
    v_count      INT;
BEGIN
    SELECT owner_type, owner_id INTO v_owner_type, v_owner_id
      FROM document WHERE document_id = p_document_id;

    IF v_owner_type = 'BATCH' THEN
        INSERT INTO document_link (document_id, dpp_id, link_type)
        SELECT p_document_id, d.dpp_id, 'INHERITED'
          FROM dpp d
         WHERE d.batch_id = v_owner_id AND d.deleted_at IS NULL
        ON CONFLICT (document_id, dpp_id) DO NOTHING;

    ELSIF v_owner_type = 'MODEL' THEN
        INSERT INTO document_link (document_id, dpp_id, link_type)
        SELECT p_document_id, d.dpp_id, 'INHERITED'
          FROM dpp d
         WHERE d.model_id = v_owner_id AND d.deleted_at IS NULL
        ON CONFLICT (document_id, dpp_id) DO NOTHING;

    ELSIF v_owner_type = 'DPP' THEN
        INSERT INTO document_link (document_id, dpp_id, link_type)
        VALUES (p_document_id, v_owner_id, 'DIRECT')
        ON CONFLICT (document_id, dpp_id) DO NOTHING;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 함수: 만료 문서 상태 전환 (일 1회 배치 실행)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_expire_documents()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    WITH expired AS (
        UPDATE document
           SET review_status = 'EXPIRED'
         WHERE deleted_at IS NULL
           AND expires_at IS NOT NULL
           AND expires_at < now()
           AND review_status = 'APPROVED'
        RETURNING document_id
    )
    SELECT count(*) INTO v_count FROM expired;

    PERFORM fn_recalc_completeness(dl.dpp_id)
       FROM document_link dl
       JOIN document doc ON doc.document_id = dl.document_id
      WHERE doc.review_status = 'EXPIRED';

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- 뷰: Tier별 공개 가능한 DPP 필드 (QR 조회 응답 구성용)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_dpp_public_field AS
SELECT
    v.dpp_id,
    fv.tier_level,
    v.field_code,
    rf.label_ko,
    fv.visibility,
    CASE fv.visibility
        WHEN 'FULL'   THEN v.value_text
        WHEN 'MASKED' THEN left(COALESCE(v.value_text, ''), 2) || '***'
        ELSE NULL
    END AS display_value
FROM dpp_field_value v
JOIN requirement_field rf ON rf.field_code = v.field_code
JOIN field_visibility  fv ON fv.field_code = v.field_code
WHERE fv.visibility <> 'HIDDEN';
