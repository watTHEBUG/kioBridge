package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.modules.voice.repository.PhoneticConfusionAnchorRepository;
import com.kiobridge.kiobridge.modules.voice.entity.PhoneticConfusionAnchor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * 확인된 발음-혼동 쌍을 심는다. 지금은 이 세션에서 실제 개발자 도구로 재현해
 * 확인한 "안녕"→NO 하나뿐이다.
 *
 * SpicyLevelAnchorSeeder 와 달리 @Profile("vector") 를 안 붙인다 — 이 표는
 * pgvector 확장이 필요 없는 평범한 표라, vector 프로필이 꺼진 로컬/운영 환경
 * (H2 등)에서도 그대로 동작해야 한다.
 */
@Component
public class PhoneticConfusionAnchorSeeder implements ApplicationRunner {

    private final PhoneticConfusionAnchorRepository repository;

    public PhoneticConfusionAnchorSeeder(PhoneticConfusionAnchorRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed("안녕", "NO");
    }

    /*
     * 조회(findByMisheardText)와 저장(save) 사이가 원자적이지 않다 — 인스턴스가
     * 둘 이상 동시에 뜨면(배포 롤링 업데이트 등) 둘 다 "아직 없다" 를 보고 둘 다
     * save() 를 시도할 수 있다. misheard_text 에 unique 제약이 있으므로 뒤에
     * 도착한 save() 는 DataIntegrityViolationException 으로 실패한다 —
     * 이미 다른 인스턴스가 심었다는 뜻이니 그냥 넘어간다. 여기서 안 잡으면
     * ApplicationRunner 실행 자체가 멈춰 애플리케이션 시작이 실패한다.
     */
    private void seed(String misheardText, String correctedTo) {
        if (repository.findByMisheardText(misheardText).isPresent()) {
            return;
        }
        try {
            repository.save(new PhoneticConfusionAnchor(misheardText, correctedTo));
        } catch (DataIntegrityViolationException e) {
            // 동시에 뜬 다른 인스턴스가 먼저 심었다 — 결과는 같으니 실패로 보지 않는다.
        }
    }
}
