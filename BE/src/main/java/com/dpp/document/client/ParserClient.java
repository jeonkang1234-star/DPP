package com.dpp.document.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

/**
 * parser(FastAPI, parser/api.py) 서비스의 POST /parse 호출 클라이언트.
 */
@Component
public class ParserClient {

    private static final Logger log = LoggerFactory.getLogger(ParserClient.class);

    private final RestClient parserRestClient;
    private final boolean classifyEnabled;

    public ParserClient(RestClient parserRestClient,
                        @Value("${app.document.classify-enabled:true}") boolean classifyEnabled) {
        this.parserRestClient = parserRestClient;
        this.classifyEnabled = classifyEnabled;
    }

    /**
     * 올린 문서가 그 업로드 칸(expectedDocType = document_type.doc_type_code)의 문서가 맞는지
     * 파서의 문서 분류 모델(parser/doc_classifier.py, POST /classify)로 확인한다(2026-10-07).
     *
     * 지금까지 문서 유형은 "어느 칸에 올렸는가"로만 정해졌고 내용은 아무도 보지 않았다 - 일반
     * 문서 칸에는 아무 PDF나 올려도 '제출 완료'가 됐다. 이제 모델이 다른 문서라고 확신할 때
     * (verdict=MISMATCH)만 422로 반려한다. 애매하거나(UNSURE) 모델이 모르는 칸이거나
     * (UNKNOWN_TYPE) 파서가 죽어 있으면 그대로 통과시킨다 - 분류기 때문에 맞는 문서가 막히는
     * 일은 없어야 한다. app.document.classify-enabled=false로 통째로 끌 수 있다.
     */
    @SuppressWarnings("unchecked")
    public void requireDocumentType(MultipartFile file, String expectedDocType) {
        if (!classifyEnabled || file == null || expectedDocType == null) {
            return;
        }
        Map<String, Object> result;
        try {
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.pdf";
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", resource);
            builder.part("expected_doc_type", expectedDocType);
            result = parserRestClient.post()
                    .uri("/classify")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(builder.build())
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException | IOException e) {
            log.warn("문서 분류 확인 실패 - 분류 없이 진행: expected={} 원인={}", expectedDocType, e.getMessage());
            return;
        }
        if (result == null || !"MISMATCH".equals(result.get("verdict"))) {
            return;
        }
        Object expectedLabel = result.get("expected_label");
        Object predictedLabel = result.get("predicted_label");
        Object confidence = result.get("confidence");
        String pct = confidence instanceof Number n ? " (확신도 " + Math.round(n.doubleValue() * 100) + "%)" : "";
        log.info("문서 유형 불일치로 반려: expected={} predicted={}{}", expectedDocType, result.get("predicted_doc_type"), pct);
        throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "올린 파일이 '" + expectedLabel + "'이(가) 아니라 '" + predictedLabel + "'(으)로 판별됐습니다"
                        + pct + ". 이 칸에 맞는 문서를 올려 주세요.");
    }

    public Map<String, Object> parse(MultipartFile file, String registryCode) throws IOException {
        return parse(file, registryCode, null);
    }

    /**
     * @param domain STEEL/TEXTILE/BATTERY. 파서의 spec_fields 추출이 이 도메인 + COMMON
     *               필드만 보게 한다. null이면 도메인이 갈라야 하는 라벨(섬유·배터리에
     *               같이 있는 'SVHC 1 물질명' 등)은 아예 안 채워진다 - 어느 쪽인지 모르는데
     *               찍는 것보다 비우는 게 낫다는 파서 쪽 원칙(spec_extractor.py) 그대로다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> parse(MultipartFile file, String registryCode, String domain) throws IOException {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.pdf";
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", resource);
        builder.part("registry_code", registryCode);
        if (domain != null && !domain.isBlank()) {
            builder.part("domain", domain);
        }

        return parserRestClient.post()
                .uri("/parse")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(builder.build())
                .retrieve()
                .body(Map.class);
    }

    /**
     * 사업자등록증 형식·데이터 검증(parser/api.py POST /verify-biz-cert) - 가입 자동승인용
     * (2026-08-19 강 요청, com.dpp.mypage.service.OrganizationService에서 호출). parse()와
     * 별도 엔드포인트인 이유는 이게 DPP 문서(23종 레지스트리) 흐름이 아니라 가입 심사
     * 흐름이라 registry_code 개념 자체가 안 맞기 때문이다.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> verifyBizCert(MultipartFile file, String bizRegNo, String companyName) throws IOException {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "biz_reg_cert.pdf";
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", resource);
        builder.part("biz_reg_no", bizRegNo);
        builder.part("company_name", companyName);

        return parserRestClient.post()
                .uri("/verify-biz-cert")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(builder.build())
                .retrieve()
                .body(Map.class);
    }
}
