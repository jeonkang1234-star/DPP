package com.dpp.document.controller;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.document.config.DocumentIntegrationProperties;
import com.dpp.document.repository.DppRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 제품 사진 등록/조회/삭제. DPP 데이터 입력 화면의 "DPP 이름" 입력칸 오른쪽 버튼이 쓴다.
 * 사진은 이 조직 소유 DPP에만 붙일 수 있고, 조회도 같은 조직만 가능하다(인증 필요).
 */
@RestController
public class ProductPhotoController {

    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> EXT_BY_TYPE = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");

    private final UserAccountRepository userAccountRepository;
    private final DppRepository dppRepository;
    private final DocumentIntegrationProperties properties;
    private final JdbcTemplate jdbc;

    public ProductPhotoController(UserAccountRepository userAccountRepository, DppRepository dppRepository,
                                  DocumentIntegrationProperties properties, JdbcTemplate jdbc) {
        this.userAccountRepository = userAccountRepository;
        this.dppRepository = dppRepository;
        this.properties = properties;
        this.jdbc = jdbc;
    }

    @PostMapping(value = "/me/dpp/{dppId}/photo", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, Object>> upload(@PathVariable Long dppId,
                                                      @RequestParam("file") MultipartFile file,
                                                      Authentication authentication) throws IOException {
        requireOwned(dppId, authentication);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드된 사진이 없습니다.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "사진은 5MB 이하만 등록할 수 있습니다.");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String ext = EXT_BY_TYPE.get(type);
        if (ext == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "JPG, PNG, WEBP 사진만 등록할 수 있습니다.");
        }
        Path dir = Path.of(properties.getUploadDir(), "dpp-photos");
        Files.createDirectories(dir);
        deleteStored(dppId);
        Path target = dir.resolve(dppId + "-" + System.currentTimeMillis() + "." + ext);
        Files.write(target, file.getBytes());
        jdbc.update("UPDATE dpp SET product_photo_uri = ?, product_photo_content_type = ? WHERE dpp_id = ?",
                target.toString(), type, dppId);
        return ResponseEntity.ok(Map.of("dppId", dppId, "hasPhoto", true));
    }

    @GetMapping("/me/dpp/{dppId}/photo")
    public ResponseEntity<byte[]> get(@PathVariable Long dppId, Authentication authentication) throws IOException {
        requireOwned(dppId, authentication);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT product_photo_uri, product_photo_content_type FROM dpp WHERE dpp_id = ?", dppId);
        Object uri = rows.isEmpty() ? null : rows.get(0).get("product_photo_uri");
        if (uri == null || !Files.exists(Path.of(uri.toString()))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        String type = String.valueOf(rows.get(0).get("product_photo_content_type"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(type))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=60")
                .body(Files.readAllBytes(Path.of(uri.toString())));
    }

    /**
     * QR/링크 공개 조회 화면(PublicPassport.jsx) 최상단 제품 사진(2026-09-23 강 요청).
     * 로그인 없이 열리므로 /public/** 아래에 둔다(SecurityConfig permitAll, nginx /public/ 블록).
     * 공개 여권 본문과 같은 기준 - 삭제되지 않았고 발급된 DPP만 내려주고, 그 외엔 404.
     * 사진이 없으면 404이고 FE는 그 자리를 빈 칸으로 둔다.
     */
    @GetMapping("/public/dpp/{publicUuid}/photo")
    public ResponseEntity<byte[]> getPublic(@PathVariable UUID publicUuid) throws IOException {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT product_photo_uri, product_photo_content_type FROM dpp "
                        + "WHERE public_uuid = ? AND deleted_at IS NULL AND issued_at IS NOT NULL", publicUuid);
        Object uri = rows.isEmpty() ? null : rows.get(0).get("product_photo_uri");
        if (uri == null || !Files.exists(Path.of(uri.toString()))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        String type = String.valueOf(rows.get(0).get("product_photo_content_type"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(type))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
                .body(Files.readAllBytes(Path.of(uri.toString())));
    }

    @DeleteMapping("/me/dpp/{dppId}/photo")
    public ResponseEntity<Void> delete(@PathVariable Long dppId, Authentication authentication) {
        requireOwned(dppId, authentication);
        deleteStored(dppId);
        jdbc.update("UPDATE dpp SET product_photo_uri = NULL, product_photo_content_type = NULL WHERE dpp_id = ?", dppId);
        return ResponseEntity.noContent().build();
    }

    private void deleteStored(Long dppId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT product_photo_uri FROM dpp WHERE dpp_id = ?", dppId);
        if (rows.isEmpty() || rows.get(0).get("product_photo_uri") == null) return;
        try {
            Files.deleteIfExists(Path.of(rows.get(0).get("product_photo_uri").toString()));
        } catch (IOException ignored) {
            // 파일이 이미 없거나 지울 수 없어도 DB 참조만 정리하면 된다.
        }
    }

    private void requireOwned(Long dppId, Authentication authentication) {
        Long userId;
        try {
            userId = Long.valueOf(authentication.getName());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 정보입니다.");
        }
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null || dppRepository.findByDppIdAndOwnerOrgId(dppId, user.getOrgId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "DPP를 찾을 수 없거나 이 조직 소유가 아닙니다.");
        }
    }
}
