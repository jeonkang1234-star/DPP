package com.dpp.document.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * application.yml의 document.* 값 (docker-compose의 DOCUMENT_PARSER_URL/DOCUMENT_ZKP_URL/
 * DOCUMENT_UPLOAD_DIR 환경변수로 덮어씀).
 */
@Component
@ConfigurationProperties(prefix = "document")
public class DocumentIntegrationProperties {

    /** 파서(FastAPI, parser/api.py) 서비스 베이스 URL. */
    private String parserUrl = "http://localhost:8000";

    /** zkp-o1js HTTP 서버 베이스 URL. */
    private String zkpUrl = "http://localhost:4001";

    /** 업로드된 원본 파일을 저장할 디렉터리 (컨테이너 내부 경로, docker-compose가 볼륨 마운트). */
    private String uploadDir = "/data/document-uploads";

    public String getParserUrl() {
        return parserUrl;
    }

    public void setParserUrl(String parserUrl) {
        this.parserUrl = parserUrl;
    }

    public String getZkpUrl() {
        return zkpUrl;
    }

    public void setZkpUrl(String zkpUrl) {
        this.zkpUrl = zkpUrl;
    }

    public String getUploadDir() {
        return uploadDir;
    }

    public void setUploadDir(String uploadDir) {
        this.uploadDir = uploadDir;
    }
}
