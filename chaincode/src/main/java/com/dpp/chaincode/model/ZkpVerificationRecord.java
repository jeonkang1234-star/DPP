package com.dpp.chaincode.model;

import org.hyperledger.fabric.contract.annotation.DataType;
import org.hyperledger.fabric.contract.annotation.Property;

/**
 * 오프체인에서 수행한 ZKP 검증 결과를 원장에 기록하기 위한 모델.
 * 실제 수치(예: 재활용함량 %)는 여기 안 들어가고, "공개입력 + 통과여부"만 들어간다.
 */
@DataType()
public class ZkpVerificationRecord {

    @Property()
    private String docId;              // 검증 대상 문서의 docId (DocumentHashRecord와 연결)
    @Property()
    private String proofId;            // 증명 고유 ID (재검증/추적용)
    @Property()
    private String publicInputsJson;   // ZKP 공개입력 (예: {"threshold": 30}) - 원본 수치는 아님
    @Property()
    private boolean verified;          // 오프체인 검증 결과 (true/false)
    @Property()
    private String verifier;           // 검증을 수행한 주체 (백엔드 서비스 계정 등)
    @Property()
    private String timestamp;          // 검증 시각 (ISO-8601)
    @Property()
    private String txId;               // 이 레코드를 기록한 트랜잭션 ID

    public ZkpVerificationRecord() {
    }

    public ZkpVerificationRecord(String docId, String proofId, String publicInputsJson,
                                 boolean verified, String verifier, String timestamp, String txId) {
        this.docId = docId;
        this.proofId = proofId;
        this.publicInputsJson = publicInputsJson;
        this.verified = verified;
        this.verifier = verifier;
        this.timestamp = timestamp;
        this.txId = txId;
    }

    public String getDocId() {
        return docId;
    }

    public void setDocId(String docId) {
        this.docId = docId;
    }

    public String getProofId() {
        return proofId;
    }

    public void setProofId(String proofId) {
        this.proofId = proofId;
    }

    public String getPublicInputsJson() {
        return publicInputsJson;
    }

    public void setPublicInputsJson(String publicInputsJson) {
        this.publicInputsJson = publicInputsJson;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public String getVerifier() {
        return verifier;
    }

    public void setVerifier(String verifier) {
        this.verifier = verifier;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getTxId() {
        return txId;
    }

    public void setTxId(String txId) {
        this.txId = txId;
    }
}