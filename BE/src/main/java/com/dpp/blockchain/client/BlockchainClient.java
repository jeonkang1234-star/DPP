package com.dpp.blockchain.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hyperledger.fabric.client.Contract;
import org.hyperledger.fabric.client.Proposal;
import org.hyperledger.fabric.client.Status;
import org.hyperledger.fabric.client.SubmittedTransaction;
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

    /**
     * 체인코드 함수가 리턴한 원문 JSON과, 그 안에서 뽑아낸 txId, 그리고 이 트랜잭션이
     * 커밋된 블록 번호를 함께 담는다.
     *
     * blockNumber는 2026-08-22에 추가했다(강 리포트 "블록 높이가 안 뜸"). 그전까지
     * blockchain_anchor.block_no를 채우는 코드가 어디에도 없어서 관리자 대시보드의
     * '블록 높이'는 구조상 영원히 '—'였다. Gateway의 submitTransaction()은 결과 바이트만
     * 돌려주고 커밋 정보를 버리기 때문에, 아래에서 proposal→endorse→submitAsync→getStatus
     * 로 풀어서 Status.getBlockNumber()를 받아온다(동기 대기 시점은 예전과 동일하다).
     */
    public record ChainResult(String txId, String rawJson, Long blockNumber) {
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
        return submit("recordDocumentHash", docId, docType, docHash, submitter, timestamp);
    }

    /**
     * proofHash = zkp_proof.proof_data의 SHA-256(2026-08-20 추가, 강 지적 "문서 해시만
     * 하는 것 같은데 영지식증명 쪽도 해야 하지 않냐"). 실측 수치는 여전히 넘기지 않는다 -
     * 수치는 경우의 수가 좁아 해시만으로도 전수 대입이 되기 때문이고, 증명 산출물은
     * blinding 난수를 포함해 그 문제가 없다. 자세한 사정은 체인코드의
     * ZkpVerificationRecord 주석 참고.
     */
    public ChainResult recordZkpVerification(String docId, String proofId, String publicInputsJson,
                                              boolean verified, String verifier, String timestamp,
                                              String proofHash) throws Exception {
        return submit("recordZkpVerification",
                docId, proofId, publicInputsJson, String.valueOf(verified), verifier, timestamp, proofHash);
    }

    /**
     * submitTransaction()과 동작·대기 시점은 같지만, 커밋 상태(Status)를 버리지 않고
     * 블록 번호까지 꺼낸다. 커밋이 실패(INVALID)하면 예외를 던져서 호출부가 지금처럼
     * blockchain_anchor에 FAILED로 남기게 한다 - 예전 submitTransaction()도 같은 경우
     * 예외를 던졌으므로 호출부 입장에서 달라지는 건 없다.
     */
    private ChainResult submit(String function, String... args) throws Exception {
        Proposal proposal = contract.newProposal(function).addArguments(args).build();
        SubmittedTransaction submitted = proposal.endorse().submitAsync();
        byte[] result = submitted.getResult();
        Status status = submitted.getStatus();
        if (!status.isSuccessful()) {
            throw new IllegalStateException(
                    "체인코드 " + function + " 커밋 실패: " + status.getCode());
        }
        return toChainResult(result, submitted.getTransactionId(), status.getBlockNumber());
    }

    private ChainResult toChainResult(byte[] result, String fallbackTxId, Long blockNumber) {
        String json = new String(result, StandardCharsets.UTF_8);
        String txId = null;
        try {
            JsonNode node = objectMapper.readTree(json);
            txId = node.path("txId").asText(null);
        } catch (Exception ignored) {
            // txId 파싱 실패해도 원문 json은 그대로 리턴 - 호출부에서 로그로 남기면 됨.
        }
        if (txId == null || txId.isBlank()) {
            txId = fallbackTxId;
        }
        return new ChainResult(txId, json, blockNumber);
    }
}
