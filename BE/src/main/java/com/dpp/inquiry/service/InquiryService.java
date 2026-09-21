package com.dpp.inquiry.service;

import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.inquiry.dto.InquiryDto;
import com.dpp.inquiry.dto.InquiryMessageDto;
import com.dpp.inquiry.entity.Inquiry;
import com.dpp.inquiry.entity.InquiryCategory;
import com.dpp.inquiry.entity.InquiryMessage;
import com.dpp.inquiry.entity.InquirySenderType;
import com.dpp.inquiry.entity.InquiryStatus;
import com.dpp.inquiry.repository.InquiryMessageRepository;
import com.dpp.inquiry.repository.InquiryRepository;
import com.dpp.mypage.entity.Organization;
import com.dpp.mypage.repository.OrganizationRepository;
import com.dpp.notify.entity.Notification;
import com.dpp.notify.entity.NotificationCategory;
import com.dpp.notify.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

/**
 * REQ-INQUIRY: 제조사 "관리자에게 문의" 위젯 ↔ 관리자 문의함이 공유하는 서비스
 * (2026-09-17 강 요청 "양방향 소통 - 카톡처럼 주고받을 수 있게"). 실시간 전송은
 * WebSocket 대신 폴링으로 한다(강 선택) - FE가 몇 초 간격으로 이 서비스의 메시지
 * 목록 조회를 다시 호출해서 새 메시지를 반영한다.
 */
@Service
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final InquiryMessageRepository inquiryMessageRepository;
    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final NotificationRepository notificationRepository;

    public InquiryService(InquiryRepository inquiryRepository,
                           InquiryMessageRepository inquiryMessageRepository,
                           UserAccountRepository userAccountRepository,
                           OrganizationRepository organizationRepository,
                           NotificationRepository notificationRepository) {
        this.inquiryRepository = inquiryRepository;
        this.inquiryMessageRepository = inquiryMessageRepository;
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.notificationRepository = notificationRepository;
    }

    // ------------------------------------------------------------------
    // 제조사 쪽 (/me/inquiries)
    // ------------------------------------------------------------------

    /**
     * 카테고리를 고르는 순간 호출된다. 같은 조직에 그 카테고리로 아직 답변 안 된(OPEN)
     * 스레드가 이미 있으면 새로 만들지 않고 그 스레드 id를 그대로 돌려준다 - 그래야
     * "카톡처럼" 방이 계속 쌓이지 않고 대화가 한 곳에 모인다. 메시지는 여기서 만들지
     * 않는다(아래 참고).
     */
    @Transactional
    public InquiryDto createOrContinue(Long userId, String categoryCode) {
        UserAccount user = requireMaker(userId);
        InquiryCategory category = parseCategory(categoryCode);

        // 같은 조직·카테고리에 아직 답변 안 된(OPEN) 스레드가 있으면 그걸 그대로 이어
        // 쓴다 - 여기서는 메시지를 남기지 않는다(카테고리 버튼을 다시 누를 때마다 인사말이
        // 중복으로 쌓이는 걸 피하려고). 실제 대화는 sendMine()에서 시작된다.
        Inquiry inquiry = inquiryRepository
                .findFirstByOrgIdAndCategoryAndStatusOrderByCreatedAtDesc(user.getOrgId(), category, InquiryStatus.OPEN)
                .orElseGet(() -> {
                    Inquiry created = new Inquiry();
                    created.setOrgId(user.getOrgId());
                    created.setCreatedByUserId(userId);
                    created.setCategory(category);
                    return inquiryRepository.save(created);
                });

        String orgName = organizationRepository.findById(user.getOrgId()).map(Organization::getOrgName).orElse(null);
        Optional<InquiryMessage> last =
                inquiryMessageRepository.findFirstByInquiryIdOrderByCreatedAtDesc(inquiry.getInquiryId());
        return InquiryDto.from(inquiry, orgName,
                last.map(InquiryMessage::getBody).orElse(null),
                last.map(InquiryMessage::getCreatedAt).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<InquiryDto> listMine(Long userId) {
        UserAccount user = requireMaker(userId);
        return inquiryRepository.findByOrgIdOrderByUpdatedAtDesc(user.getOrgId()).stream()
                .map(this::toDtoWithoutOrgName)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InquiryMessageDto> listMyMessages(Long userId, Long inquiryId) {
        UserAccount user = requireMaker(userId);
        Inquiry inquiry = requireOwnedByOrg(inquiryId, user.getOrgId());
        return inquiryMessageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiry.getInquiryId()).stream()
                .map(InquiryMessageDto::from)
                .toList();
    }

    @Transactional
    public InquiryMessageDto sendMine(Long userId, Long inquiryId, String message) {
        UserAccount user = requireMaker(userId);
        Inquiry inquiry = requireOwnedByOrg(inquiryId, user.getOrgId());
        InquiryMessage saved = appendMessage(inquiry, InquirySenderType.MAKER, userId, message);
        notifyAdmin(inquiry, message);
        return InquiryMessageDto.from(saved);
    }

    // ------------------------------------------------------------------
    // 관리자 쪽 (/admin/inquiries)
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<InquiryDto> listForAdmin(Long adminUserId) {
        requireAdmin(adminUserId);
        return inquiryRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(i -> {
                    String orgName = organizationRepository.findById(i.getOrgId())
                            .map(Organization::getOrgName).orElse(null);
                    Optional<InquiryMessage> last =
                            inquiryMessageRepository.findFirstByInquiryIdOrderByCreatedAtDesc(i.getInquiryId());
                    return InquiryDto.from(i, orgName,
                            last.map(InquiryMessage::getBody).orElse(null),
                            last.map(InquiryMessage::getCreatedAt).orElse(null));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InquiryMessageDto> listMessagesForAdmin(Long adminUserId, Long inquiryId) {
        requireAdmin(adminUserId);
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 문의입니다."));
        return inquiryMessageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiry.getInquiryId()).stream()
                .map(InquiryMessageDto::from)
                .toList();
    }

    @Transactional
    public InquiryMessageDto replyAsAdmin(Long adminUserId, Long inquiryId, String message) {
        requireAdmin(adminUserId);
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 문의입니다."));
        InquiryMessage saved = appendMessage(inquiry, InquirySenderType.ADMIN, adminUserId, message);
        // 관리자가 한 번이라도 답하면 ANSWERED - 제조사가 다시 메시지를 보내도 도로
        // OPEN으로 되돌리지 않는다(재문의 대기열 전환은 이번 라운드 범위 밖, 위 InquiryStatus 참고).
        inquiry.setStatus(InquiryStatus.ANSWERED);
        inquiry.setUpdatedAt(OffsetDateTime.now());
        inquiryRepository.save(inquiry);
        return InquiryMessageDto.from(saved);
    }

    // ------------------------------------------------------------------
    // 공통
    // ------------------------------------------------------------------

    private InquiryMessage appendMessage(Inquiry inquiry, InquirySenderType senderType, Long senderUserId, String body) {
        if (body == null || body.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메시지 내용을 입력해 주세요.");
        }
        String trimmed = body.strip();
        if (trimmed.length() > 2000) {
            trimmed = trimmed.substring(0, 2000);
        }
        InquiryMessage m = new InquiryMessage();
        m.setInquiryId(inquiry.getInquiryId());
        m.setSenderType(senderType);
        m.setSenderUserId(senderUserId);
        m.setBody(trimmed);
        InquiryMessage saved = inquiryMessageRepository.save(m);

        // 목록을 최신 대화가 위로 오게 정렬하려면 스레드 자체도 "touch"해야 한다 - 값이
        // 실제로 바뀌어야 Hibernate가 UPDATE를 내고, 그래야 trg_inquiry_touch도 같이 돈다.
        inquiry.setUpdatedAt(OffsetDateTime.now());
        inquiryRepository.save(inquiry);
        return saved;
    }

    /**
     * 관리자 대시보드 "유형별 문의" 세로 막대 그래프(AdminStatsRepository.
     * countInquiriesByType30d)가 notification(category='INQUIRY') 테이블을 그대로
     * 읽으므로, 문의가 새로 생길 때마다 그 신호도 같이 남긴다 - 이 그래프 쪽 코드는
     * 전혀 건드리지 않아도 실제 건수가 반영된다. recipient_role_code='ADMIN'은
     * "관리자 전체에게"라는 뜻으로 쓰는 이 코드베이스의 기존 role 브로드캐스트 관례
     * (role.role_code='ADMIN', V3__seed_master.sql)를 그대로 따른 것 - 특정 관리자 한
     * 명을 지정하는 계정 단위 라우팅은 아직 없다.
     */
    private void notifyAdmin(Inquiry inquiry, String messagePreview) {
        Notification n = new Notification();
        n.setRecipientRoleCode("ADMIN");
        n.setCategory(NotificationCategory.INQUIRY);
        n.setSubType(inquiry.getCategory().name());
        n.setTitle("새 문의: " + inquiry.getCategory().label());
        String body = messagePreview == null ? "" : messagePreview.strip();
        n.setBody(body.length() > 200 ? body.substring(0, 200) : body);
        notificationRepository.save(n);
    }

    private InquiryCategory parseCategory(String raw) {
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문의 카테고리를 선택해 주세요.");
        }
        try {
            return InquiryCategory.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "알 수 없는 문의 카테고리입니다: " + raw);
        }
    }

    private UserAccount requireMaker(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getOrgId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소속된 조직이 없는 계정입니다.");
        }
        return user;
    }

    private Inquiry requireOwnedByOrg(Long inquiryId, Long orgId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 문의입니다."));
        if (!orgId.equals(inquiry.getOrgId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "다른 조직의 문의입니다.");
        }
        return inquiry;
    }

    private void requireAdmin(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));
        if (user.getAccountType() != AccountType.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
    }

    private InquiryDto toDtoWithoutOrgName(Inquiry i) {
        Optional<InquiryMessage> last =
                inquiryMessageRepository.findFirstByInquiryIdOrderByCreatedAtDesc(i.getInquiryId());
        return InquiryDto.from(i, null,
                last.map(InquiryMessage::getBody).orElse(null),
                last.map(InquiryMessage::getCreatedAt).orElse(null));
    }
}
