# HTTPS 적용 (DuckDNS 무료 도메인 + Let's Encrypt)

EC2를 IP(`http://100.55.103.102`)로 열면 브라우저 주소창에 **"주의 요함"**이 뜬다.
무료 도메인을 붙이고 Let's Encrypt 인증서를 받으면 `https://<이름>.duckdns.org`에 자물쇠가 표시된다.

코드 쪽 준비는 끝나 있다.
- `FE/nginx/dpp-locations.conf`: 인증 토큰 경로(`/.well-known/acme-challenge/`) 포함
- `docker/docker-compose.https.yml`, `docker/nginx/https.conf.template`: 443 서버
- `.github/workflows/cd.yml`: 인증서가 있으면 HTTPS 오버레이를 자동으로 얹음

**아래 1~5단계는 처음 한 번만** 하면 된다.

---

## 1. DuckDNS 도메인 만들기 (5분)

1. https://www.duckdns.org 에 GitHub나 Google 계정으로 로그인한다.
2. **sub domain**에 원하는 이름(예: `ieum-dpp`)을 넣고 **add domain**을 누른다.
3. 만들어진 줄의 **current ip**에 EC2 퍼블릭 IP(`100.55.103.102`)를 넣고 **update ip**를 누른다.
4. 확인: 로컬 터미널에서 `nslookup ieum-dpp.duckdns.org`를 실행해 EC2 IP가 나오면 된다.

> EC2를 재시작해 퍼블릭 IP가 바뀌면 3번만 다시 하면 된다. 탄력적 IP를 쓰면 바뀌지 않는다.

## 2. EC2 보안그룹에서 443 열기

AWS 콘솔 → EC2 → 인스턴스의 보안그룹 → **인바운드 규칙 편집**에서 다음 규칙을 추가한다.
- HTTPS / TCP 443 / 0.0.0.0/0

80은 이미 열려 있어야 한다. 인증서를 발급할 때 80으로 들어오는 확인 요청을 받아야 하기 때문이다.

## 3. 이 PR이 배포된 뒤 EC2에서 인증서 발급

```bash
ssh ubuntu@100.55.103.102

# certbot 설치 (한 번만)
sudo apt-get update && sudo apt-get install -y certbot

# 토큰 폴더 (frontend 컨테이너가 /var/www/certbot 으로 내준다)
mkdir -p /opt/app/docker/certbot-www

# 발급 - 도메인과 이메일만 바꿔서 실행
sudo certbot certonly --webroot -w /opt/app/docker/certbot-www \
  -d ieum-dpp.duckdns.org \
  --email 본인메일@example.com --agree-tos -n
```

`Successfully received certificate`가 나오면 성공이다.
인증서는 `/etc/letsencrypt/live/ieum-dpp.duckdns.org/`에 저장된다.

## 4. `.env`에 도메인 등록 후 재기동

```bash
cd /opt/app/docker
# 다음 줄을 .env에 추가 (도메인만 바꿔서)
#   DPP_DOMAIN=ieum-dpp.duckdns.org
#   OAUTH_REDIRECT_BASE_URL=https://ieum-dpp.duckdns.org
#   OAUTH_ALLOWED_REDIRECT_HOSTS=ieum-dpp.duckdns.org
nano .env

# 바로 적용 (다음 PR 병합부터는 CD가 자동으로 오버레이를 얹는다)
FILES="-f docker-compose.yml"
[ -f /opt/app/fabric-identity/admin-cert.pem ] && FILES="$FILES -f docker-compose.blockchain.yml"
docker compose $FILES -f docker-compose.https.yml up -d --build frontend backend
```

확인: 브라우저에서 `https://ieum-dpp.duckdns.org`를 열어 자물쇠를 본다.
`http://100.55.103.102`로 열면 HTTPS 도메인 주소로 자동으로 넘어간다.

## 5. SNS 로그인 Redirect URI 추가

카카오·구글·네이버 개발자 콘솔에 아래 주소를 **추가**로 등록한다. 기존 주소는 지우지 않아도 된다.

```
https://ieum-dpp.duckdns.org/auth/sns/kakao/callback
https://ieum-dpp.duckdns.org/auth/sns/google/callback
https://ieum-dpp.duckdns.org/auth/sns/naver/callback
```

구글은 IP 주소를 Redirect URI로 받아 주지 않는다. 그래서 도메인이 생기면 구글 로그인도 EC2에서 쓸 수 있게 된다.

## 6. 자동 갱신 (90일 인증서)

certbot 패키지가 갱신 타이머를 이미 설치한다. 갱신된 인증서를 nginx가 다시 읽도록 훅만 걸어 둔다.

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'EOS'
#!/bin/sh
docker exec dpp-frontend nginx -s reload
EOS
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run    # 'Congratulations, all simulated renewals succeeded' 면 OK
```

---

### 문제 해결

| 증상 | 원인·조치 |
|---|---|
| certbot `Timeout during connect` | 보안그룹 80이 닫혀 있거나 DuckDNS IP가 EC2 IP와 다름 |
| certbot `404` / `unauthorized` | 이 PR이 아직 배포되지 않아 `/.well-known/acme-challenge/`가 없음 → 배포 후 재시도 |
| `https://`가 안 열림 | 보안그룹 443 미개방, 또는 `.env`에 `DPP_DOMAIN` 없음 → `docker compose ... ps`로 443 포트 확인 |
| frontend 컨테이너가 재시작을 반복 | 인증서 경로 오타 → `docker logs dpp-frontend` 확인. `DPP_DOMAIN` 값과 `/etc/letsencrypt/live/` 폴더 이름이 같아야 함 |
| QR이 http 주소로 찍힘 | 예전에 발급한 QR. http로 들어와도 https로 넘어가므로 그대로 동작함 |
