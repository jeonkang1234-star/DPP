package com.dpp.document.client;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * parser(FastAPI, parser/api.py) 서비스의 POST /parse 호출 클라이언트.
 */
@Component
public class ParserClient {

    private final RestClient parserRestClient;

    public ParserClient(RestClient parserRestClient) {
        this.parserRestClient = parserRestClient;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> parse(MultipartFile file, String registryCode) throws IOException {
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
