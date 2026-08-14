package com.kiobridge.kiobridge.modules.member.service;

import com.kiobridge.kiobridge.modules.member.entity.AppUser;
import com.kiobridge.kiobridge.modules.member.repository.AppUserRepository;
import com.kiobridge.kiobridge.modules.member.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAccountServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Test
    void 계정과_소속_주문표를_함께_삭제한다() {
        AppUser user = new AppUser("hyunwoo", "encoded-password");
        when(appUserRepository.findById(1L)).thenReturn(Optional.of(user));

        UserAccountService service =
                new UserAccountService(appUserRepository, userProfileRepository);

        service.delete(1L);

        verify(userProfileRepository).deleteAllByUser_Id(1L);
        verify(appUserRepository).delete(user);
    }

    @Test
    void 이미_없는_계정은_멱등적으로_종료한다() {
        when(appUserRepository.findById(1L)).thenReturn(Optional.empty());

        UserAccountService service =
                new UserAccountService(appUserRepository, userProfileRepository);

        service.delete(1L);

        verify(userProfileRepository, never()).deleteAllByUser_Id(1L);
        verify(appUserRepository, never()).deleteById(1L);
    }
}
