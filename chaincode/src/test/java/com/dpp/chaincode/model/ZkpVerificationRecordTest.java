package com.dpp.chaincode.model;

import com.google.gson.Gson;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ZkpVerificationRecord POJO 검증. verified가 boolean(primitive)이라
 * false 값이 Gson 직렬화에서 누락되지 않는지가 특히 중요한 케이스.
 */
class ZkpVerificationRecordTest {

    private final Gson gson = new Gson();

    @Test
    void 생성자로_만든_값이_getter로_그대로_읽힌다() {
        ZkpVerificationRecord record = new ZkpVerificationRecord(
                "doc-1", "proof-1", "{\"threshold\":30}", true, "verifier-a", "now", "tx-0001");

        assertThat(record.getDocId()).isEqualTo("doc-1");
        assertThat(record.getProofId()).isEqualTo("proof-1");
        assertThat(record.getPublicInputsJson()).isEqualTo("{\"threshold\":30}");
        assertThat(record.isVerified()).isTrue();
        assertThat(record.getVerifier()).isEqualTo("verifier-a");
        assertThat(record.getTxId()).isEqualTo("tx-0001");
    }

    @Test
    void gson_왕복해도_verified_true가_보존된다() {
        ZkpVerificationRecord original = new ZkpVerificationRecord(
                "doc-1", "proof-1", "{\"threshold\":30}", true, "verifier-a", "now", "tx-0001");

        ZkpVerificationRecord restored = gson.fromJson(gson.toJson(original), ZkpVerificationRecord.class);

        assertThat(restored.isVerified()).isTrue();
    }

    @Test
    void gson_왕복해도_verified_false가_보존된다() {
        // boolean 필드는 Gson이 기본값(false)과 "명시적으로 false로 설정된 값"을 혼동하기 쉬운
        // 대표적인 케이스라 별도로 검증한다.
        ZkpVerificationRecord original = new ZkpVerificationRecord(
                "doc-1", "proof-1", "{\"threshold\":30}", false, "verifier-a", "now", "tx-0001");

        String json = gson.toJson(original);
        ZkpVerificationRecord restored = gson.fromJson(json, ZkpVerificationRecord.class);

        assertThat(restored.isVerified()).isFalse();
        assertThat(json).contains("\"verified\":false");
    }
}
