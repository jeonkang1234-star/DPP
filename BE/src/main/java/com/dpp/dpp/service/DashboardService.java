package com.dpp.dpp.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.dpp.dto.DashboardResponse;
import com.dpp.dpp.dto.DppSummaryDto;
import com.dpp.dpp.dto.MissingFieldDto;
import com.dpp.dpp.entity.Dpp;
import com.dpp.dpp.entity.ProductModel;
import com.dpp.dpp.repository.DppQueryRepository;
import com.dpp.dpp.repository.ProductModelRepository;
import com.dpp.document.repository.ZkpProofRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * GET /me/dashboard - FE 목데이터(makerKpi/makerQueues/products)를 대체하는 실데이터.
 * DPP가 없는 조직(제품 등록 전)은 전부 0/빈 배열 - 목데이터처럼 가짜 숫자를 채우지 않는다.
 *
 * completeness는 V2__functions.sql의 fn_recalc_completeness(dpp_id)를 매 조회마다 호출해서
 * 계산한다 - 이 함수를 호출하는 코드가 이전까지 어디에도 없었다(트리거도 없음: 필드값
 * 저장/문서승인 시점에 자동 재계산되지 않고 계속 오래된 값이었음). 지금은 DPP 개수가
 * 적어서 조회마다 재계산해도 비용이 무시할 만하다 - 개수가 늘면 저장 시점 트리거로
 * 옮기는 걸 고려할 것.
 *
 * "완성/진행중/미입력" 3단계 구분은 하지 않는다 - v_dpp_requirement_status는 is_filled
 * 이진값만 준다(문서 심사대기 같은 중간 상태 개념이 뷰에 없음). FE에는 완성/미입력
 * 2단계로만 내려준다.
 */
@Service
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);
    private static final int MISSING_FIELD_LIMIT = 10;

    private final UserAccountRepository userAccountRepository;
    private final DppQueryRepository dppRepository;
    private final ProductModelRepository productModelRepository;
    private final ZkpProofRepository zkpProofRepository;

    public DashboardService(UserAccountRepository userAccountRepository,
                             DppQueryRepository dppRepository,
                             ProductModelRepository productModelRepository,
                             ZkpProofRepository zkpProofRepository) {
        this.userAccountRepository = userAccountRepository;
        this.dppRepository = dppRepository;
        this.productModelRepository = productModelRepository;
        this.zkpProofRepository = zkpProofRepository;
    }

    // recalcCompleteness가 dpp 테이블을 직접 UPDATE하는 실제 쓰기 작업이라 readOnly로
    // 두지 않는다(의미상 맞지 않음 - Spring의 readOnly=true는 강제 차단이 아니라 힌트일
    // 뿐이라 동작은 하겠지만 오해의 소지가 있다).
    @Transactional
    public DashboardResponse getDashboard(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        Long orgId = user.getOrgId();
        if (orgId == null) {
            return emptyDashboard();
        }

        List<Dpp> dpps = dppRepository.findByOwnerOrgIdAndDeletedAtIsNull(orgId);
        if (dpps.isEmpty()) {
            return emptyDashboard();
        }

        Map<Long, ProductModel> modelsById = productModelRepository
                .findAllById(dpps.stream().map(Dpp::getModelId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(ProductModel::getModelId, m -> m));

        List<DppSummaryDto> summaries = new ArrayList<>();
        double completenessSum = 0;
        int incompleteCount = 0;

        for (Dpp dpp : dpps) {
            double rate = recalc(dpp.getDppId());
            int[] counts = fetchCounts(dpp.getDppId());
            ProductModel model = modelsById.get(dpp.getModelId());

            summaries.add(new DppSummaryDto(
                    dpp.getDppId(),
                    dpp.getPublicUuid(),
                    model != null ? model.getInternalSku() : null,
                    model != null ? model.getModelName() : null,
                    dpp.getDomain(),
                    dpp.getStatus(),
                    dpp.getLifecycleStage(),
                    rate,
                    counts[0],
                    counts[1]
            ));
            completenessSum += rate;
            if (rate < 100.0) {
                incompleteCount++;
            }
        }

        Map<Long, String> labelByDppId = summaries.stream()
                .collect(Collectors.toMap(DppSummaryDto::dppId,
                        s -> s.modelName() != null ? s.modelName() : ("DPP #" + s.dppId())));
        List<Long> dppIds = dpps.stream().map(Dpp::getDppId).toList();

        List<MissingFieldDto> missingFields = new ArrayList<>();
        for (Object[] row : dppRepository.findMissingFields(dppIds, MISSING_FIELD_LIMIT)) {
            Long dppId = ((Number) row[0]).longValue();
            missingFields.add(new MissingFieldDto(
                    dppId,
                    labelByDppId.getOrDefault(dppId, "DPP #" + dppId),
                    (String) row[1],
                    (String) row[2],
                    (String) row[3],
                    (String) row[4]
            ));
        }

        double average = summaries.isEmpty() ? 0.0 : Math.round(completenessSum / summaries.size() * 100) / 100.0;
        long zkpPending = zkpProofRepository.countByDppIdInAndStatus(dppIds, "REQUESTED");
        long zkpRejected = zkpProofRepository.countByDppIdInAndStatus(dppIds, "REJECTED");

        return new DashboardResponse(summaries.size(), incompleteCount, average, summaries, missingFields,
                zkpPending, zkpRejected);
    }

    private double recalc(Long dppId) {
        try {
            BigDecimal recalced = dppRepository.recalcCompleteness(dppId);
            return recalced != null ? recalced.doubleValue() : 0.0;
        } catch (Exception e) {
            // fn_recalc_completeness 호출이 실패해도 대시보드 전체가 죽으면 안 된다 -
            // 이 DPP만 0%로 표시하고 나머지는 계속 보여준다.
            log.warn("fn_recalc_completeness 실패: dppId={}", dppId, e);
            return 0.0;
        }
    }

    private int[] fetchCounts(Long dppId) {
        Object[] counts = dppRepository.findCompletenessCounts(dppId);
        if (counts == null || counts.length < 2) {
            return new int[]{0, 0};
        }
        int filled = counts[0] != null ? ((Number) counts[0]).intValue() : 0;
        int required = counts[1] != null ? ((Number) counts[1]).intValue() : 0;
        return new int[]{filled, required};
    }

    private DashboardResponse emptyDashboard() {
        return new DashboardResponse(0, 0, 0.0, List.of(), List.of(), 0, 0);
    }
}
