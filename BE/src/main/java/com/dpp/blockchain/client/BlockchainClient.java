package com.dpp.blockchain.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hyperledger.fabric.client.Contract;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * dpp-ledger-chaincode(com.dpp.chaincode.DppLedgerContract, 별도 chaincode/ 프로젝트) 호출 클라이언트.
 * submitTransaction 한 번으로 엔도스먼트 수집→주문→커밋까지 Gateway가 대신 처리한다(동기 호출).
 *
 * 이 빈은 blockchain.enabled=true일 때만 존재한다(FabricGatewayConfig 조건과 동일 조건).
 * 호출하는 쪽(DocumentIngestService)은 항상 Optional&lt;BlockchainClient&gt;로 주입받아서,
 * 비활성화 상태에서도 앱이 죽지 않고 앵커링만 건너뛰도록 설계했다.
 */
@Component
@ConditionalOnProperty(prefix = "blockchain", name = "enabled", havingValue = "true")
public class BlockchainClient {

    /** 체인코드 함수가 리턴한 원문 JSON과, 그 안에서 뽑아낸 txId를 함께 담는다. */
    public record ChainResult(String txId, String rawJson) {
    }

    private final Contract contract;
    private final ObjectMapper objectMapper;

    public BlockchainClient(Contract contract, ObjectMapper objectMapper) {
        this.contract = contract;
        this.objectMapper = objectMapper;
    }

    // Contract.submitTransaction이 던지는 구체 예외 타입(EndorseException/SubmitException/
    // CommitStatusException 등)을 정확히 나열하는 대신 Exception으로 넓게 잡는다 - 호출부
    // (DocumentIngestService)가 어차피 모든 실패를 동일하게(FAILED 상태 기록 + 계속 진행)
    // 처리하므로 타입을 세분화할 실익이 없고, 정확한 클래스명을 잘못 적어 컴파일이
    // 깨지는 위험을 피하는 게 더 중요하다.
    public ChainResult recordDocumentHash(String docId, String docType, String docHash,
                                           String submitter, String timestamp) throws Exception {
        byte[] result = contract.submitTransaction("recordDocumentHash", docId, docType, docHash, submitter, timestamp);
        return toChainResult(result);
    }

    public ChainResult recordZkpVerification(String docId, String proofId, String publicInputsJson,
                                              boolean verified, String verifier, String timestamp) throws Exception {
        byte[] result = contract.submitTransaction("recordZkpVerification",
                docId, proofId, publicInputsJson, String.valueOf(verified), verifier, timestamp);
        return toChainResult(result);
    }

    private ChainResult toChainResult(byte[] result) {
        String json = new String(result, StandardCharsets.UTF_8);
        String txId = null;
        try {
            JsonNode node = objectMapper.readTree(json);
            txId = node.path("txId").asText(null);
        } catch (Exception ignored) {
            // txId 파싱 실패해도 원문 json은 그대로 리턴 - 호출부에서 로그로 남기면 됨.
        }
        return new ChainResult(txId, json);
    }
}
