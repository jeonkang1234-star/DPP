package com.dpp.chaincode.model;

/**
 * 문서 파싱 단계에서 계산된 해시를 원장에 기록하기 위한 모델.
 * 원문/추출값은 절대 여기 안 들어가고, 해시와 메타데이터만 들어간다.
 */
public class DocumentHashRecord {

    private String docId;        // 문서 인스턴스 고유 ID (파싱 결과의 document_id 또는 mock_id)
    private String docType;      // registry_code (예: Q1_02) 또는 doc_type_slug
    private String docHash;      // 파싱 단계에서 계산한 text_sha256
    private String submitter;    // 제출 조직/계정
    private String timestamp;    // 제출 시각 (ISO-8601)
    private String txId;         // 이 레코드를 기록한 트랜잭션 ID (체인코드가 채움)

    public DocumentHashRecord() {
    }

    public DocumentHashRecord(String docId, String docType, String docHash,
                               String submitter, String timestamp, String txId) {
        this.docId = docId;
        this.docType = docType;
        this.docHash = docHash;
        this.submitter = submitter;
        this.timestamp = timestamp;
        this.txId = txId;
    }

    public String getDocId() {
        return docId;
    }

    public void setDocId(String docId) {
        this.docId = docId;
    }

    public String getDocType() {
        return docType;
    }

    public void setDocType(String docType) {
        this.docType = docType;
    }

    public String getDocHash() {
        return docHash;
    }

    public void setDocHash(String docHash) {
        this.docHash = docHash;
    }

    public String getSubmitter() {
        return submitter;
    }

    public void setSubmitter(String submitter) {
        this.submitter = submitter;
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
