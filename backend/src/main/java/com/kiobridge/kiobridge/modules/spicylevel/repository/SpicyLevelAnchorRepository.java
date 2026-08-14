package com.kiobridge.kiobridge.modules.spicylevel.repository;

import com.kiobridge.kiobridge.modules.spicylevel.entity.SpicyLevelAnchor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface SpicyLevelAnchorRepository extends JpaRepository<SpicyLevelAnchor, Long> {

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO spicy_level_anchors (expression, spicy_level, embedding)
        VALUES (:expression, :spicyLevel, CAST(:embedding AS vector))
        ON CONFLICT (expression) DO NOTHING
        """, nativeQuery = true)
    void insertWithEmbedding(
        @Param("expression") String expression,
        @Param("spicyLevel") String spicyLevel,
        @Param("embedding") String embedding
    );

    /** 코사인 유사도로 가장 가까운 spicy_level 하나를 찾는다 (레거시, 필요시 유지) */
    @Query(value = """
        SELECT spicy_level FROM spicy_level_anchors
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT 1
        """, nativeQuery = true)
    String findNearestSpicyLevel(@Param("embedding") String embedding);

    /** 가장 가까운 K개 anchor의 spicy_level 목록을 가까운 순서로 반환한다 (다수결용) */
    @Query(value = """
        SELECT spicy_level FROM spicy_level_anchors
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT :k
        """, nativeQuery = true)
    List<String> findNearestSpicyLevels(@Param("embedding") String embedding, @Param("k") int k);
}