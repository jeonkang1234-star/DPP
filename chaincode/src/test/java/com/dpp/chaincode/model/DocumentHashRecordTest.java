package com.dpp.chaincode.model;

import com.google.gson.Gson;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DocumentHashRecord POJO 검증 - 체인코드가 stub.putStringState/getStringState로
 * 저장·조회할 때 실제로 쓰는 직렬화 방식(Gson)으로 왕복해도 필드가 깨지지 않는지 확인.
 */
class DocumentHashRecordTest {

    private final Gson gson = new Gson();

    @Test
    void 생성자로_만든_값이_getter로_그대로_읽힌다() {
        DocumentHashRecord record = new DocumentHashRecord(
                "doc-1", "Q1_02", "hash-abc", "org-a", "2026-08-01T00:00:00Z", "tx-0001");

        assertThat(record.getDocId()).isEqualTo("doc-1");
        assertThat(record.getDocType()).isEqualTo("Q1_02");
        assertThat(record.getDocHash()).isEqualTo("hash-abc");
        assertThat(record.getSubmitter()).isEqualTo("org-a");
        assertThat(record.getTimestamp()).isEqualTo("2026-08-01T00:00:00Z");
        assertThat(record.getTxId()).isEqualTo("tx-0001");
    }

    @Test
    void 기본생성자_세터로도_동일하게_동작한다() {
        DocumentHashRecord record = new DocumentHashRecord();
        record.setDocId("doc-2");
        record.setDocHash("hash-xyz");

        assertThat(record.getDocId()).isEqualTo("doc-2");
        assertThat(record.getDocHash()).isEqualTo("hash-xyz");
    }

    @Test
    void gson_직렬화_후_역직렬화해도_필드가_보존된다() {
        DocumentHashRecord original = new DocumentHashRecord(
                "doc-1", "Q1_02", "hash-abc", "org-a", "2026-08-01T00:00:00Z", "tx-0001");

        String json = gson.toJson(original);
        DocumentHashRecord restored = gson.fromJson(json, DocumentHashRecord.class);

        assertThat(restored.getDocId()).isEqualTo(original.getDocId());
        assertThat(restored.getDocType()).isEqualTo(original.getDocType());
        assertThat(restored.getDocHash()).isEqualTo(original.getDocHash());
        assertThat(restored.getSubmitter()).isEqualTo(original.getSubmitter());
        assertThat(restored.getTimestamp()).isEqualTo(original.getTimestamp());
        assertThat(restored.getTxId()).isEqualTo(original.getTxId());
    }
}
