-- ============================================================
--  가입 자동검증이 왜 수동 심사로 빠졌는지 확인한다.
--
--  실행:
--    docker cp docker/diagnose-auto-approval.sql dpp-postgres:/tmp/diag.sql
--    docker exec -it dpp-postgres psql -U dpp -d dpp -f /tmp/diag.sql
--
--  verify_reasons가 "사업자등록증 검증 서비스를 호출하지 못했습니다"로 시작하면
--  parser 컨테이너가 낡은 이미지라 /verify-biz-cert가 없다는 뜻이다:
--    docker compose -f docker/docker-compose.yml build parser
--    docker compose -f docker/docker-compose.yml up -d parser backend
-- ============================================================
\pset format wrapped
\pset columns 140

SELECT org_id,
       org_name,
       org_type,
       country_code,
       biz_reg_no,
       approval_status,
       verify_auto_approvable      AS auto_ok,
       verify_checked_at,
       biz_reg_cert_name,
       verify_reasons
  FROM organization
 WHERE deleted_at IS NULL
 ORDER BY created_at DESC
 LIMIT 15;
