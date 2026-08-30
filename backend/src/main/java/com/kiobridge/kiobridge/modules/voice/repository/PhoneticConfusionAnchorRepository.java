package com.kiobridge.kiobridge.modules.voice.repository;

import com.kiobridge.kiobridge.modules.voice.entity.PhoneticConfusionAnchor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PhoneticConfusionAnchorRepository extends JpaRepository<PhoneticConfusionAnchor, Long> {
    Optional<PhoneticConfusionAnchor> findByMisheardText(String misheardText);
}
