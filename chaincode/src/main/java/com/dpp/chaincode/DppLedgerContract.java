package com.dpp.chaincode;

import com.dpp.chaincode.model.DocumentHashRecord;
import com.dpp.chaincode.model.ZkpVerificationRecord;
import com.google.gson.Gson;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contact;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.License;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;

/**
 * DPP 파이프라인의 "블록체인 기록계" 역할만 담당하는 체인코드.
 *
 * 파이프라인: 문서파싱(Python) -> [이 체인코드: 해시 기록] -> 오프체인 ZKP 검증(백엔드)
 *            -> [이 체인코드: 검증결과 기록]
 *
 * 원문/실제 수치는 이 체인코드를 절대 거치지 않는다 - 해시값과 검증 결과(참/거짓)만 기록한다.
 * ZKP 증명 자체의 수학적 검증(페어링 연산 등)은 이 체인코드 안에서 하지 않음 (오프체인에서 처리).
 */
@Contract(
        name = "DppLedgerContract",
        info = @Info(
                title = "DPP Ledger Contract",
                description = "문서 해시 앵커링 및 ZKP 검증결과 기록",
                version = "0.0.1",
                contact = @Contact(email = "jeonkang1234@tukorea.ac.kr")
        )
)
@License(name = "Apache-2.0")
@Default
public final class DppLedgerContract implements ContractInterface {

    private static final String DOC_KEY_PREFIX = "DOC_";
    private static final String ZKP_KEY_PREFIX = "ZKP_";

    private final Gson gson = new Gson();

    /**
     * 문서 해시를 원장에 기록한다. 같은 docId로 이미 기록돼 있으면 실패한다
     * (덮어쓰기를 허용하면 위변조 검증이라는 목적 자체가 무너지므로 최초 1회만 허용).
     */
    @Transaction()
    public DocumentHashRecord recordDocumentHash(final Context ctx, final String docId, final String docType,
                                                   final String docHash, final String submitter,
                                                   final String timestamp) {
        ChaincodeStub stub = ctx.getStub();
        String key = DOC_KEY_PREFIX + docId;

        String existing = stub.getStringState(key);
        if (existing != null && !existing.isEmpty()) {
            throw new ChaincodeException("문서 해시가 이미 기록되어 있습니다: " + docId, "DOC_ALREADY_EXISTS");
        }
        if (docHash == null || docHash.isEmpty()) {
            throw new ChaincodeException("docHash는 비어있을 수 없습니다.", "INVALID_INPUT");
        }

        DocumentHashRecord record = new DocumentHashRecord(
                docId, docType, docHash, submitter, timestamp, stub.getTxId());
        stub.putStringState(key, gson.toJson(record));
        return record;
    }

    /** 문서 해시 기록 조회 - 나중에 원본을 다시 해싱해서 이 값과 비교하면 위변조 여부를 확인할 수 있다. */
    @Transaction()
    public DocumentHashRecord getDocumentHash(final Context ctx, final String docId) {
        ChaincodeStub stub = ctx.getStub();
        String json = stub.getStringState(DOC_KEY_PREFIX + docId);
        if (json == null || json.isEmpty()) {
            throw new ChaincodeException("문서 해시 기록을 찾을 수 없습니다: " + docId, "DOC_NOT_FOUND");
        }
        return gson.fromJson(json, DocumentHashRecord.class);
    }

    /**
     * 오프체인에서 이미 완료된 ZKP 검증 결과를 원장에 기록한다.
     * 증명 대상 문서(docId)의 해시가 먼저 기록되어 있어야 한다 - 존재하지 않는 문서에 대한
     * 검증결과를 기록하는 걸 막기 위함.
     */
    @Transaction()
    public ZkpVerificationRecord recordZkpVerification(final Context ctx, final String docId, final String proofId,
                                                          final String publicInputsJson, final boolean verified,
                                                          final String verifier, final String timestamp) {
        ChaincodeStub stub = ctx.getStub();

        String docJson = stub.getStringState(DOC_KEY_PREFIX + docId);
        if (docJson == null || docJson.isEmpty()) {
            throw new ChaincodeException("먼저 문서 해시를 기록해야 합니다: " + docId, "DOC_NOT_FOUND");
        }

        String key = ZKP_KEY_PREFIX + docId + "_" + proofId;
        String existing = stub.getStringState(key);
        if (existing != null && !existing.isEmpty()) {
            throw new ChaincodeException("이미 기록된 증명입니다: " + proofId, "ZKP_ALREADY_EXISTS");
        }

        ZkpVerificationRecord record = new ZkpVerificationRecord(
                docId, proofId, publicInputsJson, verified, verifier, timestamp, stub.getTxId());
        stub.putStringState(key, gson.toJson(record));
        return record;
    }

    /** ZKP 검증 기록 조회. */
    @Transaction()
    public ZkpVerificationRecord getZkpVerification(final Context ctx, final String docId, final String proofId) {
        ChaincodeStub stub = ctx.getStub();
        String json = stub.getStringState(ZKP_KEY_PREFIX + docId + "_" + proofId);
        if (json == null || json.isEmpty()) {
            throw new ChaincodeException(
                    "ZKP 검증 기록을 찾을 수 없습니다: " + docId + "/" + proofId, "ZKP_NOT_FOUND");
        }
        return gson.fromJson(json, ZkpVerificationRecord.class);
    }
}
