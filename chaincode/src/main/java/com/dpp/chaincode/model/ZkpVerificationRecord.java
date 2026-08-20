package com.dpp.chaincode.model;

import org.hyperledger.fabric.contract.annotation.DataType;
import org.hyperledger.fabric.contract.annotation.Property;

/**
 * 오프체인에서 수행한 ZKP 검증 결과를 원장에 기록하기 위한 모델.
 *
 * 실측 수치(예: 재활용함량 34.2%)는 여기 절대 안 들어간다 - 애초에 백엔드도 그 값을
 * 저장하지 않는다(DocumentIngestService 주석 "실측값(private input)은 어디에도 저장하지
 * 않는다"). 원장에 남는 건 (a) 공개입력 = 기준값과 통과여부, (b) 증명 산출물의 해시다.
 *
 * proofHash를 넣은 이유(2026-08-20 강 지적 - "블록체인이 문서 해시만 하는 것 같은데
 * 영지식증명 쪽 수치도 해싱해야 하는 것 아니냐"): 예전엔 원장에 기준값과 참/거짓만
 * 남아서, 오프체인 DB의 zkp_proof.proof_data가 나중에 다른 증명으로 바뀌어도 원장만
 * 봐서는 알 수 없었다. 증명 산출물 자체를 해싱해 두면 "이 판정이 어떤 증명에서 나왔는가"
 * 까지 원장에 묶인다. 실측값을 그냥 해싱하지 않는 이유는, 수치는 경우의 수가 좁아서
 * (예: 0.0~100.0%) 해시만 있으면 전수 대입으로 원값이 드러나기 때문이다 - 증명 산출물은
 * 난수(blinding)를 포함해 그 문제가 없다.
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
    private String proofHash;          // 증명 산출물(proof_data)의 SHA-256. 오프체인 DB의 증명이 나중에 바뀌면 이 값과 어긋난다
    @Property()
    private String txId;               // 이 레코드를 기록한 트랜잭션 ID

    public ZkpVerificationRecord() {
    }

    public ZkpVerificationRecord(String docId, String proofId, String publicInputsJson,
                                 boolean verified, String verifier, String timestamp,
                                 String proofHash, String txId) {
        this.docId = docId;
        this.proofId = proofId;
        this.publicInputsJson = publicInputsJson;
        this.verified = verified;
        this.verifier = verifier;
        this.timestamp = timestamp;
        this.proofHash = proofHash;
        this.txId = txId;
    }

    public String getProofHash() {
        return proofHash;
    }

    public void setProofHash(String proofHash) {
        this.proofHash = proofHash;
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