package com.dpp.blockchain.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * application.yml의 blockchain.* 값 (docker-compose의 BLOCKCHAIN_* 환경변수로 덮어씀).
 *
 * enabled 기본값은 false다 - 로컬 Windows 개발 환경엔 실행 중인 Fabric 네트워크가 없으므로,
 * 이 값이 false면 FabricGatewayConfig의 빈들 자체가 생성되지 않는다(@ConditionalOnProperty).
 * EC2에서만 docker-compose 오버레이로 true + 실제 값들을 채워 넣는다.
 */
@Component
@ConfigurationProperties(prefix = "blockchain")
public class BlockchainIntegrationProperties {

    private boolean enabled = false;

    /** peer0.org1 gRPC 엔드포인트, 예: peer0.org1.example.com:7051 */
    private String peerEndpoint = "localhost:7051";

    /** TLS 인증서의 SAN과 다른 이름으로 접속할 때(예: 컨테이너 네트워크 DNS 이름) 필요한 authority override. */
    private String peerHostnameOverride = "peer0.org1.example.com";

    private String mspId = "Org1MSP";

    private String channelName = "dppchannel";

    private String chaincodeName = "dpp-ledger-chaincode";

    /** peer TLS root CA 인증서(PEM) 경로. */
    private String tlsCertPath = "/fabric-identity/peer-tls-ca.pem";

    /** 클라이언트(Admin) X.509 인증서(PEM) 경로. */
    private String certPath = "/fabric-identity/admin-cert.pem";

    /** 클라이언트(Admin) 개인키(PEM) 경로. */
    private String keyPath = "/fabric-identity/admin-key.pem";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getPeerEndpoint() {
        return peerEndpoint;
    }

    public void setPeerEndpoint(String peerEndpoint) {
        this.peerEndpoint = peerEndpoint;
    }

    public String getPeerHostnameOverride() {
        return peerHostnameOverride;
    }

    public void setPeerHostnameOverride(String peerHostnameOverride) {
        this.peerHostnameOverride = peerHostnameOverride;
    }

    public String getMspId() {
        return mspId;
    }

    public void setMspId(String mspId) {
        this.mspId = mspId;
    }

    public String getChannelName() {
        return channelName;
    }

    public void setChannelName(String channelName) {
        this.channelName = channelName;
    }

    public String getChaincodeName() {
        return chaincodeName;
    }

    public void setChaincodeName(String chaincodeName) {
        this.chaincodeName = chaincodeName;
    }

    public String getTlsCertPath() {
        return tlsCertPath;
    }

    public void setTlsCertPath(String tlsCertPath) {
        this.tlsCertPath = tlsCertPath;
    }

    public String getCertPath() {
        return certPath;
    }

    public void setCertPath(String certPath) {
        this.certPath = certPath;
    }

    public String getKeyPath() {
        return keyPath;
    }

    public void setKeyPath(String keyPath) {
        this.keyPath = keyPath;
    }
}
