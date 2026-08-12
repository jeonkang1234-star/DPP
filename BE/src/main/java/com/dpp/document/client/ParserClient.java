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
}
