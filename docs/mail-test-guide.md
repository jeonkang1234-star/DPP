# 메일·SMS 테스트 가이드 (tukorea.ac.kr 계정 하나로)

메일 주소가 하나뿐이면 "가입 → 확인 → 지우고 다시 가입"을 반복해야 한다.
아래 명령들은 그 반복을 위한 것이다. **전부 로컬 도커 기준**이고, EC2에서는
`docker` 앞에 `sudo`를 붙이면 된다.

편의상 이렇게 두고 시작한다:

```bash
PG="docker exec -i dpp-postgres psql -U dpp -d dpp"
MYMAIL="본인아이디@tukorea.ac.kr"
```

---

## 1. SMTP 켜기

`BE/src/main/resources/application-local.yml` (git 미포함) 에 아래를 넣는다.
Gmail을 릴레이로 쓸 거면 **앱 비밀번호**가 필요하다(일반 로그인 비밀번호로는 안 된다).

```yaml
app:
  mail:
    enabled: true
    from: "본인아이디@tukorea.ac.kr"

spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: "보내는계정@gmail.com"
    password: "앱비밀번호16자리"
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

학교 SMTP를 직접 쓸 수 있으면 host/port만 바꾸면 된다.

```bash
docker compose -f docker/docker-compose.yml up -d --build backend
docker logs -f dpp-backend | grep -i mail
```

> `app.mail.enabled: false`(기본값)일 때는 메일이 안 나가는 대신 **본문 전체가
> 서버 로그에 그대로 찍힌다.** 문구만 확인할 거면 SMTP를 켤 필요가 없다:
> ```bash
> docker logs dpp-backend --tail 200 | grep -A 20 "개발용 콘솔 발송"
> ```

## 2. 전화번호 인증 (SMS는 계속 꺼둔다)

`app.sms.enabled`는 `false` 그대로 두면 된다. 그 상태에서는 서버가 발급된
인증코드를 응답에 같이 내려주고, **가입 화면이 그 코드를 입력칸에 자동으로 채운다.**
문자를 받을 필요가 없다.

재발송은 60초 쿨다운이 있다. 그 안에 다시 누르면
"인증코드를 너무 자주 요청했습니다"가 뜬다 - 정상이다. 기다리기 싫으면:

```bash
$PG -c "DELETE FROM phone_verification WHERE phone LIKE '%';"
```

## 3. 내 메일로 가입했다가 지우고 다시 하기

가입이 끝난 계정을 통째로 지운다. **참조 순서 때문에 지우는 순서가 중요하다.**

```bash
$PG <<SQL
BEGIN;
-- 이 메일로 만들어진 조직 id 확보
CREATE TEMP TABLE t AS
  SELECT u.user_id, u.org_id FROM user_account u WHERE u.email = '$MYMAIL';

DELETE FROM notification      WHERE recipient_user_id IN (SELECT user_id FROM t);
DELETE FROM user_role         WHERE user_id          IN (SELECT user_id FROM t);
DELETE FROM user_sns_link     WHERE user_id          IN (SELECT user_id FROM t);
DELETE FROM user_agreement    WHERE user_id          IN (SELECT user_id FROM t);
DELETE FROM login_history     WHERE user_id          IN (SELECT user_id FROM t);
DELETE FROM user_session      WHERE user_id          IN (SELECT user_id FROM t);
DELETE FROM auth_token        WHERE user_id          IN (SELECT user_id FROM t);
DELETE FROM user_account      WHERE user_id          IN (SELECT user_id FROM t);

-- 그 조직에 남은 사람이 없으면 조직도 지운다
DELETE FROM attachment
 WHERE owner_type = 'ORGANIZATION'
   AND owner_id IN (SELECT org_id FROM t WHERE org_id IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM user_account u2 WHERE u2.org_id = attachment.owner_id);
DELETE FROM organization o
 WHERE o.org_id IN (SELECT org_id FROM t WHERE org_id IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM user_account u2 WHERE u2.org_id = o.org_id);

-- 인증 이력도 비워야 같은 메일로 다시 인증받을 수 있다
DELETE FROM email_verification WHERE email = '$MYMAIL';
COMMIT;
SQL
```

지워졌는지 확인:

```bash
$PG -c "SELECT email FROM user_account WHERE email = '$MYMAIL';"
```

> 이미 DPP를 만든 계정이면 위 DELETE가 외래키에 걸린다. 그럴 땐 그 조직의
> DPP부터 지워야 하는데 연쇄가 깊다 - **차라리 DB를 통째로 초기화하는 쪽이 빠르다**(아래 5번).

## 4. 초대 메일만 빨리 여러 번 받아보기

가입을 반복하지 않고 초대 메일 문구만 확인하려면, 제조사 계정으로 로그인해
협력사 관리에서 **초대 이메일에 본인 주소를 넣고** 보내면 된다. 같은 주소로 여러 번
보내도 되고, 이미 보낸 초대는 "재발송" 버튼으로 다시 보낼 수 있다.

보낸 기록 확인:

```bash
$PG -c "SELECT invitation_id, invitee_email, dpp_id, role_code, status, created_at
          FROM invitation ORDER BY invitation_id DESC LIMIT 10;"
```

같은 주소로 계속 테스트하려면 초대 기록만 지우면 된다:

```bash
$PG -c "DELETE FROM dpp_participant WHERE guest_email = '$MYMAIL';"
$PG -c "DELETE FROM invitation WHERE invitee_email = '$MYMAIL';"
```

## 5. DB 통째로 초기화 (가장 확실)

가입 테스트를 여러 번 돌릴 거면 이 방법이 제일 깔끔하다.
**로컬에서만** 하고, EC2에서는 절대 하지 말 것.

```bash
docker compose -f docker/docker-compose.yml down
sudo rm -rf docker/pgdata          # Windows면 탐색기에서 docker\pgdata 폴더 삭제
docker compose -f docker/docker-compose.yml up -d --build

# 백엔드가 뜨면서 Flyway가 V1~V27을 다시 적용한다. 그다음 시드:
docker cp docker/seed-test-admin.sql dpp-postgres:/tmp/s.sql
docker exec dpp-postgres psql -U dpp -d dpp -f /tmp/s.sql
# (나머지 seed-test-*.sql 도 같은 식으로)
```

## 6. 알림이 들어갔는지 확인

```bash
$PG -c "SELECT n.notification_id, u.email, n.category, n.sub_type, n.title, n.created_at
          FROM notification n JOIN user_account u ON u.user_id = n.recipient_user_id
         ORDER BY n.notification_id DESC LIMIT 10;"
```

초대를 보냈는데 여기 행이 안 생긴다면, 초대받은 이메일이 **아직 가입 전**이라
연결할 계정이 없는 경우다. 그때는 메일만 나가고, 그 사람이 가입하는 순간
`BusinessSignupService.linkPendingCollaborations`가 알림을 만든다.
