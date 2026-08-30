package com.kiobridge.kiobridge.modules.voice.service;

import com.kiobridge.kiobridge.modules.voice.repository.PhoneticConfusionAnchorRepository;
import com.kiobridge.kiobridge.modules.voice.entity.PhoneticConfusionAnchor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
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

    private void seed(String misheardText, String correctedTo) {
        if (repository.findByMisheardText(misheardText).isPresent()) {
            return;
        }
        repository.save(new PhoneticConfusionAnchor(misheardText, correctedTo));
    }
}
