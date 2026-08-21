package com.dpp.chaincode;

import com.dpp.chaincode.model.DocumentHashRecord;
import com.dpp.chaincode.model.ZkpVerificationRecord;
import com.google.gson.Gson;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * DppLedgerContract 단위 테스트 - Fabric 네트워크(peer/orderer) 없이,
 * Context/ChaincodeStub을 Mockito로 가짜(mock)로 만들어서 계약 함수 4개의
 * "비즈니스 로직"만 검증한다 (원장 저장은 실제로 안 일어남 - stub이 가짜라서).
 *
 * 이건 파서 쪽 pytest 스위트와 같은 성격 - 실제 배포 없이 로직만 빠르게 검증하는 단계.
 * 실제 원장에 기록되는지, 여러 peer 간 합의(endorsement)가 통과하는지는
 * 이 테스트 범위 밖이고 test-network 배포 후 별도로 확인해야 한다 (README 참고).
 */
class DppLedgerContractTest {

    private final DppLedgerContract contract = new DppLedgerContract();
    private final Gson gson = new Gson();

    private Context ctx;
    private ChaincodeStub stub;

    @BeforeEach
    void setUp() {
        ctx = mock(Context.class);
        stub = mock(ChaincodeStub.class);
        when(ctx.getStub()).thenReturn(stub);
        when(stub.getTxId()).thenReturn("tx-0001");
    }

    @Nested
    class RecordDocumentHash {

        @Test
        void 정상_등록시_필드값과_txId가_그대로_반환된다() {
            when(stub.getStringState("DOC_doc-1")).thenReturn(null);

            DocumentHashRecord result = contract.recordDocumentHash(
                    ctx, "doc-1", "Q1_02", "abc123hash", "org-a", "2026-08-01T00:00:00Z");

            assertThat(result.getDocId()).isEqualTo("doc-1");
            assertThat(result.getDocType()).isEqualTo("Q1_02");
            assertThat(result.getDocHash()).isEqualTo("abc123hash");
            assertThat(result.getSubmitter()).isEqualTo("org-a");
            assertThat(result.getTimestamp()).isEqualTo("2026-08-01T00:00:00Z");
            assertThat(result.getTxId()).isEqualTo("tx-0001");
        }

        @Test
        void 정상_등록시_DOC_접두사_키로_JSON이_저장된다() {
            when(stub.getStringState("DOC_doc-1")).thenReturn(null);

            contract.recordDocumentHash(ctx, "doc-1", "Q1_02", "abc123hash", "org-a", "2026-08-01T00:00:00Z");

            ArgumentCaptor<String> jsonCaptor = ArgumentCaptor.forClass(String.class);
            verify(stub).putStringState(eq("DOC_doc-1"), jsonCaptor.capture());

            DocumentHashRecord saved = gson.fromJson(jsonCaptor.getValue(), DocumentHashRecord.class);
            assertThat(saved.getDocHash()).isEqualTo("abc123hash");
            assertThat(saved.getDocType()).isEqualTo("Q1_02");
        }

        @Test
        void 같은_docId로_이미_기록돼있으면_DOC_ALREADY_EXISTS_예외() {
            when(stub.getStringState("DOC_doc-1")).thenReturn("{\"docId\":\"doc-1\"}");

            assertThatThrownBy(() ->
                    contract.recordDocumentHash(ctx, "doc-1", "Q1_02", "abc123hash", "org-a", "now"))
                    .isInstanceOf(ChaincodeException.class)
                    .hasMessageContaining("이미 기록되어 있습니다");

            verify(stub, never()).putStringState(eq("DOC_doc-1"), anyString());
        }

        @Test
        void docHash가_null이면_INVALID_INPUT_예외() {
            when(stub.getStringState("DOC_doc-2")).thenReturn(null);

            assertThatThrownBy(() ->
                    contract.recordDocumentHash(ctx, "doc-2", "Q1_02", null, "org-a", "now"))
                    .isInstanceOf(ChaincodeException.class);
        }

        @Test
        void docHash가_빈문자열이면_INVALID_INPUT_예외() {
            when(stub.getStringState("DOC_doc-2")).thenReturn(null);

            assertThatThrownBy(() ->
                    contract.recordDocumentHash(ctx, "doc-2", "Q1_02", "", "org-a", "now"))
                    .isInstanceOf(ChaincodeException.class);
        }
    }

    @Nested
    class GetDocumentHash {

        @Test
        void 존재하는_문서는_역직렬화되어_반환된다() {
            DocumentHashRecord original = new DocumentHashRecord(
                    "doc-1", "Q1_02", "abc123hash", "org-a", "2026-08-01T00:00:00Z", "tx-0001");
            when(stub.getStringState("DOC_doc-1")).thenReturn(gson.toJson(original));

            DocumentHashRecord result = contract.getDocumentHash(ctx, "doc-1");

            assertThat(result.getDocHash()).isEqualTo("abc123hash");
            assertThat(result.getTxId()).isEqualTo("tx-0001");
        }

        @Test
        void 없는_문서는_DOC_NOT_FOUND_예외() {
            when(stub.getStringState("DOC_ghost")).thenReturn(null);

            assertThatThrownBy(() -> contract.getDocumentHash(ctx, "ghost"))
                    .isInstanceOf(ChaincodeException.class)
                    .hasMessageContaining("찾을 수 없습니다");
        }
    }

    @Nested
    class RecordZkpVerification {

        @Test
        void 대상_문서_해시가_없으면_DOC_NOT_FOUND_예외() {
            when(stub.getStringState("DOC_doc-1")).thenReturn(null);

            assertThatThrownBy(() ->
                    contract.recordZkpVerification(
                            ctx, "doc-1", "proof-1", "{\"threshold\":30}", true, "verifier-a", "now", "a1b2c3"))
                    .isInstanceOf(ChaincodeException.class)
                    .hasMessageContaining("먼저 문서 해시를 기록");

            verify(stub, never()).putStringState(startsWith("ZKP_"), anyString());
        }

        @Test
        void 문서_해시가_있으면_ZKP_결과가_정상_기록된다() {
            when(stub.getStringState("DOC_doc-1")).thenReturn("{\"docId\":\"doc-1\"}");
            when(stub.getStringState("ZKP_doc-1_proof-1")).thenReturn(null);

            ZkpVerificationRecord result = contract.recordZkpVerification(
                    ctx, "doc-1", "proof-1", "{\"threshold\":30}", true, "verifier-a", "2026-08-01T00:00:00Z", "a1b2c3");

            assertThat(result.getDocId()).isEqualTo("doc-1");
            assertThat(result.getProofId()).isEqualTo("proof-1");
            assertThat(result.isVerified()).isTrue();
            assertThat(result.getVerifier()).isEqualTo("verifier-a");
            assertThat(result.getTxId()).isEqualTo("tx-0001");

            verify(stub).putStringState(eq("ZKP_doc-1_proof-1"), anyString());
        }

        @Test
        void 같은_docId_proofId로_이미_기록돼있으면_ZKP_ALREADY_EXISTS_예외() {
            when(stub.getStringState("DOC_doc-1")).thenReturn("{\"docId\":\"doc-1\"}");
            when(stub.getStringState("ZKP_doc-1_proof-1")).thenReturn("{\"proofId\":\"proof-1\"}");

            assertThatThrownBy(() ->
                    contract.recordZkpVerification(
                            ctx, "doc-1", "proof-1", "{\"threshold\":30}", true, "verifier-a", "now", "a1b2c3"))
                    .isInstanceOf(ChaincodeException.class)
                    .hasMessageContaining("이미 기록된 증명");
        }

        @Test
        void proofHash가_비어있으면_PROOF_HASH_REQUIRED_예외() {
            when(stub.getStringState("DOC_doc-1")).thenReturn("{\"docId\":\"doc-1\"}");

            assertThatThrownBy(() ->
                    contract.recordZkpVerification(
                            ctx, "doc-1", "proof-9", "{\"threshold\":30}", true, "verifier-a", "now", "  "))
                    .isInstanceOf(ChaincodeException.class)
                    .hasMessageContaining("증명 해시");

            verify(stub, never()).putStringState(startsWith("ZKP_"), anyString());
        }

        @Test
        void proofHash가_기록에_그대로_담긴다() {
            when(stub.getStringState("DOC_doc-1")).thenReturn("{\"docId\":\"doc-1\"}");
            when(stub.getStringState("ZKP_doc-1_proof-8")).thenReturn(null);

            ZkpVerificationRecord result = contract.recordZkpVerification(
                    ctx, "doc-1", "proof-8", "{\"threshold\":30}", true, "verifier-a", "now", "deadbeef");

            assertThat(result.getProofHash()).isEqualTo("deadbeef");
        }

        @Test
        void verified가_false인_경우도_그대로_기록된다() {
            when(stub.getStringState("DOC_doc-1")).thenReturn("{\"docId\":\"doc-1\"}");
            when(stub.getStringState("ZKP_doc-1_proof-2")).thenReturn(null);

            ZkpVerificationRecord result = contract.recordZkpVerification(
                    ctx, "doc-1", "proof-2", "{\"threshold\":30}", false, "verifier-a", "now", "a1b2c3");

            assertThat(result.isVerified()).isFalse();
        }
    }

    @Nested
    class GetZkpVerification {

        @Test
        void 존재하는_검증기록은_역직렬화되어_반환된다() {
            ZkpVerificationRecord original = new ZkpVerificationRecord(
                    "doc-1", "proof-1", "{\"threshold\":30}", true, "verifier-a", "now", "a1b2c3", "tx-0001");
            when(stub.getStringState("ZKP_doc-1_proof-1")).thenReturn(gson.toJson(original));

            ZkpVerificationRecord result = contract.getZkpVerification(ctx, "doc-1", "proof-1");

            assertThat(result.isVerified()).isTrue();
            assertThat(result.getProofId()).isEqualTo("proof-1");
        }

        @Test
        void 없는_검증기록은_ZKP_NOT_FOUND_예외() {
            when(stub.getStringState("ZKP_doc-1_ghost")).thenReturn(null);

            assertThatThrownBy(() -> contract.getZkpVerification(ctx, "doc-1", "ghost"))
                    .isInstanceOf(ChaincodeException.class)
                    .hasMessageContaining("찾을 수 없습니다");
        }
    }
}
