FROM eclipse-temurin:11-jre-jammy

WORKDIR /chaincode

COPY build/install/dpp-ledger-chaincode /chaincode

ENTRYPOINT ["/chaincode/bin/dpp-ledger-chaincode"]