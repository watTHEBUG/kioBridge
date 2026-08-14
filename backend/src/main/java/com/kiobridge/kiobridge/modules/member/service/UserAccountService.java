package com.kiobridge.kiobridge.modules.member.service;

import com.kiobridge.kiobridge.modules.member.entity.AppUser;
import com.kiobridge.kiobridge.modules.member.repository.AppUserRepository;
import com.kiobridge.kiobridge.modules.member.repository.UserProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** 계정과 계정에 속한 주문표를 함께 삭제한다. */
@Service
@Transactional(readOnly = true)
public class UserAccountService {

    private final AppUserRepository appUserRepository;
    private final UserProfileRepository userProfileRepository;

    public UserAccountService(
            AppUserRepository appUserRepository,
            UserProfileRepository userProfileRepository
    ) {
        this.appUserRepository = appUserRepository;
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * 계정을 삭제한다.
     *
     * 이미 없는 계정이면 지울 대상이 없으므로 조용히 끝낸다. 실제 HTTP 요청은
     * 컨트롤러에서 먼저 Bearer 소유자 검증을 거치므로, 이 멱등 처리는 삭제 중
     * 발생한 재시도나 동시 요청을 안전하게 처리하기 위한 것이다.
     */
    @Transactional
    public void delete(Long userId) {
        Optional<AppUser> user = appUserRepository.findById(userId);
        if (user.isEmpty()) {
            return;
        }

        // DB cascade에만 의존하지 않고 주문표를 먼저 명시적으로 삭제한다.
        userProfileRepository.deleteAllByUser_Id(userId);
        appUserRepository.delete(user.get());
    }
}
