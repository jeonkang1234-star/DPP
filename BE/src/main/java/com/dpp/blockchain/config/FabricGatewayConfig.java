package com.dpp.blockchain.config;

import io.grpc.ChannelCredentials;
import io.grpc.Grpc;
import io.grpc.ManagedChannel;
import io.grpc.TlsChannelCredentials;
import org.hyperledger.fabric.client.Contract;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.Network;
import org.hyperledger.fabric.client.identity.Identities;
import org.hyperledger.fabric.client.identity.Identity;
import org.hyperledger.fabric.client.identity.Signer;
import org.hyperledger.fabric.client.identity.Signers;
import org.hyperledger.fabric.client.identity.X509Identity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

/**
 * blockchain.enabled=true(EC2에서만 켬)일 때만 Fabric Gateway 연결을 만든다.
 * 로컬 개발 환경엔 Fabric 네트워크/인증서 파일이 없으므로, false일 땐 이 설정 클래스의
 * 빈들이 아예 생성되지 않는다 - 없는 인증서 파일을 읽으려다 앱 기동 자체가 죽는 걸 방지.
 */
@Configuration
@ConditionalOnProperty(prefix = "blockchain", name = "enabled", havingValue = "true")
public class FabricGatewayConfig {

    @Bean(destroyMethod = "shutdown")
    public ManagedChannel fabricChannel(BlockchainIntegrationProperties props) {
        ChannelCredentials credentials = TlsChannelCredentials.newBuilder()
                .trustManager(new File(props.getTlsCertPath()))
                .build();
        return Grpc.newChannelBuilder(props.getPeerEndpoint(), credentials)
                .overrideAuthority(props.getPeerHostnameOverride())
                .build();
    }

    @Bean(destroyMethod = "close")
    public Gateway fabricGateway(ManagedChannel fabricChannel, BlockchainIntegrationProperties props) throws Exception {
        return Gateway.newInstance()
                .identity(loadIdentity(props))
                .signer(loadSigner(props))
                .connection(fabricChannel)
                .connect();
    }

    @Bean
    public Contract dppLedgerContract(Gateway fabricGateway, BlockchainIntegrationProperties props) {
        Network network = fabricGateway.getNetwork(props.getChannelName());
        return network.getContract(props.getChaincodeName());
    }

    private Identity loadIdentity(BlockchainIntegrationProperties props) throws Exception {
        try (Reader reader = Files.newBufferedReader(Path.of(props.getCertPath()))) {
            X509Certificate certificate = Identities.readX509Certificate(reader);
            return new X509Identity(props.getMspId(), certificate);
        }
    }

    private Signer loadSigner(BlockchainIntegrationProperties props) throws Exception {
        try (Reader reader = Files.newBufferedReader(Path.of(props.getKeyPath()))) {
            PrivateKey privateKey = Identities.readPrivateKey(reader);
            return Signers.newPrivateKeySigner(privateKey);
        }
    }
}
