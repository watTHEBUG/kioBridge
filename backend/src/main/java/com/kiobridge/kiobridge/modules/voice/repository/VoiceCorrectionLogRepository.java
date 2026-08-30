package com.kiobridge.kiobridge.modules.voice.repository;

import com.kiobridge.kiobridge.modules.voice.entity.VoiceCorrectionLog;
import org.springframework.data.jpa.repository.JpaRepository;

/** 조회 화면은 아직 없다. 지금은 쌓아 두고, 사람이 DB를 직접 열어 본다. */
public interface VoiceCorrectionLogRepository extends JpaRepository<VoiceCorrectionLog, Long> {
}
