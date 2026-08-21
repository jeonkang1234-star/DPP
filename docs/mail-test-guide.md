# 메일·전화 인증 테스트 가이드

먼저 세 가지 질문에 답한 뒤, 그걸 전제로 절차를 적는다.

---

## Q1. `from` 과 `username` 은 각각 뭔가

두 값은 역할이 다르다.

| 설정 | 뜻 | 여기 들어갈 값 |
|---|---|---|
| `spring.mail.username` / `password` | **SMTP 서버에 로그인하는 계정.** 실제로 메일을 밖으로 내보내는 주체 | 서비스용 발신 계정 |
| `app.mail.from` | 메일의 **From: 헤더**. 받는 사람 화면에 "보낸사람"으로 뜨는 주소 | 위와 같은 주소여야 안전 |

**`from` 에 학교 주소를 쓰고 `username` 에 Gmail을 쓰면 안 된다.** Gmail SMTP는
인증한 계정이 아닌 From을 그대로 보내주지 않는다 — 자기 주소로 바꿔치기하거나
`553 Relaying denied` 로 거절한다. (Gmail 설정에서 "다른 주소에서 메일 보내기"로
학교 주소를 등록·인증하면 예외지만, 그건 별도 절차다.)

**본인 학교 주소(`@tukorea.ac.kr`)는 설정 파일에 들어가는 값이 아니다.**
그건 *받는 쪽*이다 — 가입 화면의 이메일 칸이나 협력사 초대 이메일 칸에 입력하는 값.

그래서 선택지는 둘이다.

**A. Gmail 계정 하나를 발신 전용으로 만들어 쓴다 (권장 · 5분)**

```yaml
app:
  mail:
    enabled: true
    from: "ieum.dpp.test@gmail.com"      # ← username 과 같은 주소
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: "ieum.dpp.test@gmail.com"  # ← 발신 전용으로 새로 판 계정
    password: "앱비밀번호16자리"           # ← 일반 로그인 비번 아님
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

앱 비밀번호는 Google 계정 → 보안 → 2단계 인증을 켠 뒤 → "앱 비밀번호"에서 발급한다.
2단계 인증을 안 켜면 메뉴 자체가 안 나온다.

**B. 학교 SMTP 서버를 직접 쓴다**

학교가 외부 SMTP 릴레이를 열어 준다면 `host`/`port`/`username`을 학교 값으로 바꾸고
`from`을 본인 학교 주소로 두면 된다. 대부분의 대학은 막아두거나 신청이 필요하니
전산실에 확인이 필요하다. 확인이 안 되면 A로 가는 게 빠르다.

---

## Q2. `application-local.yml` 은 CD로 올라가나 — 퍼블릭 IP에서도 잡히나

**CD로는 안 올라간다. EC2에 사람이 한 번 직접 넣어야 한다.**

이유:

- 이 파일은 `.gitignore`에 있어서 저장소에 없다. CD가 하는 일은
  `git fetch` + `git reset --hard` 뿐이고, **reset은 추적되지 않는 파일을 지우지 않는다.**
  → 한 번 넣어두면 이후 배포에서도 계속 살아 있다.
- `BE/Dockerfile`이 `COPY src src` 로 `src` 전체를 이미지에 굽는다. 즉
  `/opt/app/BE/src/main/resources/application-local.yml` 이 **빌드 시점에 존재하면**
  이미지 안으로 들어간다.
- `docker/docker-compose.yml` 이 `SPRING_PROFILES_ACTIVE: local` 을 주므로 그 파일이 읽힌다.

**EC2에 한 번만 넣으면 끝** (deploy 계정 소유로):

```bash
sudo -u deploy tee /opt/app/BE/src/main/resources/application-local.yml > /dev/null <<'YML'
app:
  mail:
    enabled: true
    from: "ieum.dpp.test@gmail.com"
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: "ieum.dpp.test@gmail.com"
    password: "앱비밀번호16자리"
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
YML
sudo chmod 600 /opt/app/BE/src/main/resources/application-local.yml
sudo chown deploy:deploy /opt/app/BE/src/main/resources/application-local.yml
```

넣은 뒤 backend 이미지를 **다시 빌드**해야 반영된다(파일이 이미지에 구워지므로
재기동만으로는 안 바뀐다):

```bash
cd /opt/app/docker
sudo docker compose -f docker-compose.yml up -d --build backend
sudo docker logs dpp-backend --tail 50 | grep -i mail
```

> ⚠️ 이 파일에는 JWT 시크릿과 OAuth 클라이언트 시크릿도 들어간다.
> **절대 커밋하지 말 것.** 이미 EC2에 있다면 위 명령이 덮어쓰므로,
> 먼저 `sudo cat` 으로 기존 내용을 확인하고 필요한 항목을 합쳐서 쓸 것.

---

## Q3. 전화번호 인증 — 왜 폰으로 안 오나

**진짜 문자를 보내려면 SMS 사업자 계약이 필요하다.** 코드 문제가 아니다.

한국에서 문자를 발송하려면 **발신번호 사전등록**이 법으로 의무다(전기통신사업법).
사업자등록증·통신서비스 가입증명원을 올려 심사를 통과해야 그 번호로 발송이 열린다.
개인 명의로는 통과가 어렵고, 심사에 보통 1~3영업일이 걸린다.

그래서 지금 코드는 두 갈래로 되어 있다.

| `app.sms.enabled` | 동작 |
|---|---|
| `false` (기본) | 문자를 안 보내고, 발급된 코드를 **응답에 담아 화면 입력칸에 자동으로 채운다** |
| `true` | 네이버클라우드 SENS API로 **실제 문자 발송** |

`false`일 때 화면에 코드를 채워 주는 건 "인증을 건너뛰는" 게 아니다. 서버는 코드를
DB에 해시로 저장하고, 5분 만료·5회 시도 제한·60초 재발송 쿨다운을 그대로 검사한다.
전달 경로(문자)만 없는 것이고, 검증 로직은 실제와 동일하다.

### 진짜로 폰에 오게 하려면 (네이버클라우드 SENS)

발송기 코드(`SensSignupSmsSender`)는 이미 있다. 계정과 번호만 있으면 된다.

1. console.ncloud.com 가입 → 결제수단 등록 (SMS는 건당 과금, 테스트 수준이면 몇백 원)
2. **Simple & Easy Notification Service(SENS)** → 프로젝트 생성 → `service-id` 확보
3. 마이페이지 → 인증키 관리 → `access-key` / `secret-key` 발급
4. SENS → 발신번호 등록 → 서류 올리고 **심사 승인 대기** ← 여기가 제일 오래 걸린다
5. 승인된 번호를 `sender-phone`에 넣는다 (하이픈 없이, 예: `0212345678`)

```yaml
app:
  sms:
    enabled: true
ncp:
  sens:
    service-id: "ncp:sms:kr:1234567890:ieum"
    access-key: "..."
    secret-key: "..."
    sender-phone: "0212345678"
```

같은 `application-local.yml`에 넣고 backend를 다시 빌드하면 그때부터 실제 문자가 간다.
그 순간부터 응답의 `devCode`는 사라지고 화면 자동 채움도 없어진다.

**심사가 데모 일정보다 늦으면 `enabled: false` 그대로 두고 진행해도 된다** —
심사 승인만 나면 설정 두 줄로 실제 발송으로 전환된다.

---

# 실제 테스트 절차

아래는 전부 로컬 도커 기준이다. EC2에서는 `docker` 앞에 `sudo`를 붙인다.

```bash
PG="docker exec -i dpp-postgres psql -U dpp -d dpp"
MYMAIL="본인아이디@tukorea.ac.kr"     # 받는 주소 (테스트용)
```

## 1단계. SMTP 없이 문구만 확인

메일 문구를 고치는 단계에서는 SMTP를 켤 필요가 없다.
`app.mail.enabled: false`(기본값)면 **보낼 본문 전체가 서버 로그에 그대로 찍힌다.**

```bash
docker logs dpp-backend --tail 300 | grep -A 20 "개발용 콘솔 발송"
```

## 2단계. 실제로 받아보기

Q1의 A 설정을 `BE/src/main/resources/application-local.yml`에 넣고:

```bash
docker compose -f docker/docker-compose.yml up -d --build backend
```

제조사 계정으로 로그인 → 협력사 관리 → DPP 선택 → **초대 이메일에 `$MYMAIL` 입력** → 발송.
같은 주소로 몇 번이든 보낼 수 있고, 이미 보낸 초대는 "재발송" 버튼으로 다시 온다.

기대하는 메일:

```
제목: [IEUM] 대성제강(테스트)에서 3월 유럽향 열연코일 1차 자료 제출을 요청했습니다

  대상 DPP   : 3월 유럽향 열연코일 1차
  요청 자료  : 시험·인증 자료 (시험성적서, LCA/EPD, 탄소보고서)
  초대 코드  : 8f3a1c...
  유효 기간  : 발송일로부터 7일
```

발송 기록 확인:

```bash
$PG -c "SELECT invitation_id, invitee_email, dpp_id, role_code, status, created_at
          FROM invitation ORDER BY invitation_id DESC LIMIT 10;"
```

메일이 안 오면 스팸함부터 보고, 그다음 로그:

```bash
docker logs dpp-backend --tail 100 | grep -iE "mail|smtp|authenticat"
```

`535 Username and Password not accepted` → 앱 비밀번호가 아니라 일반 비밀번호를 넣은 것.
`553 Relaying denied` → `from`과 `username`이 다른 것(Q1 참고).

## 3단계. 회원가입 전체 흐름

1. 이메일 칸에 `$MYMAIL` → "인증번호 발송" → 메일함에서 코드 확인 → 입력
2. 전화번호 칸에 본인 번호 → "인증번호 발송"
   - `app.sms.enabled: false`면 **코드가 입력칸에 자동으로 채워진다** → "확인"만 누르면 됨
   - `true`면 실제 문자가 온다
3. 자동입력 방지 문자 입력 (안 맞으면 새 문자가 나온다)
4. 나머지 정보 + 사업자등록증 첨부 → 가입

같은 메일로 다시 가입하려면 아래 4단계로 지운다.

## 4단계. 같은 메일로 다시 가입하기

가입 직후(DPP를 아직 안 만든 계정)라면 이걸로 충분하다:

```bash
$PG <<SQL
BEGIN;
CREATE TEMP TABLE t AS SELECT user_id, org_id FROM user_account WHERE email = '$MYMAIL';

DELETE FROM notification   WHERE recipient_user_id IN (SELECT user_id FROM t);
DELETE FROM user_role      WHERE user_id IN (SELECT user_id FROM t);
DELETE FROM user_sns_link  WHERE user_id IN (SELECT user_id FROM t);
DELETE FROM user_agreement WHERE user_id IN (SELECT user_id FROM t);
DELETE FROM login_history  WHERE user_id IN (SELECT user_id FROM t);
DELETE FROM user_session   WHERE user_id IN (SELECT user_id FROM t);
DELETE FROM auth_token     WHERE user_id IN (SELECT user_id FROM t);
DELETE FROM user_account   WHERE user_id IN (SELECT user_id FROM t);

DELETE FROM attachment
 WHERE owner_type = 'ORGANIZATION'
   AND owner_id IN (SELECT org_id FROM t WHERE org_id IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM user_account u WHERE u.org_id = attachment.owner_id);
DELETE FROM organization o
 WHERE o.org_id IN (SELECT org_id FROM t WHERE org_id IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM user_account u WHERE u.org_id = o.org_id);

-- 인증 이력도 비워야 같은 주소로 다시 인증코드를 받을 수 있다
DELETE FROM email_verification WHERE email = '$MYMAIL';
DELETE FROM phone_verification WHERE phone IS NOT NULL;   -- 60초 쿨다운도 같이 풀린다
COMMIT;
SQL

$PG -c "SELECT email FROM user_account WHERE email = '$MYMAIL';"   -- 0 rows 여야 정상
```

**그 계정으로 이미 DPP를 만들었다면** 위 DELETE가 외래키에 걸린다.
연쇄가 깊어서 하나씩 지우는 것보다 DB 초기화가 빠르다 (아래 5단계).

## 5단계. DB 통째로 초기화 — 로컬에서만

```bash
docker compose -f docker/docker-compose.yml down
# Windows: 탐색기에서 docker\pgdata 폴더 삭제
rm -rf docker/pgdata
docker compose -f docker/docker-compose.yml up -d --build

# Flyway가 V1~V27을 다시 적용한 뒤 시드:
for f in docker/seed-test-*.sql docker/seed-demo-customs-queue.sql; do
  docker cp "$f" dpp-postgres:/tmp/s.sql
  docker exec dpp-postgres psql -U dpp -d dpp -f /tmp/s.sql
done
```

> **EC2에서는 절대 하지 말 것.** 시연 데이터가 전부 날아간다.

## 6단계. 알림이 들어갔는지 확인

```bash
$PG -c "SELECT n.notification_id, u.email, n.category, n.sub_type, n.title, n.created_at
          FROM notification n JOIN user_account u ON u.user_id = n.recipient_user_id
         ORDER BY n.notification_id DESC LIMIT 10;"
```

초대를 보냈는데 행이 안 생겼다면, 초대받은 이메일이 **아직 가입 전**이라 연결할 계정이
없는 경우다. 그때는 메일만 나가고, 그 사람이 가입하는 순간
`BusinessSignupService.linkPendingCollaborations`가 알림을 만든다.
