package com.kiobridge.kiobridge.modules.spicylevel.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "spicy_level_anchors")
public class SpicyLevelAnchor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String expression;

    @Column(name = "spicy_level", nullable = false, length = 20)
    private String spicyLevel;

    // pgvector 컬럼은 Hibernate가 기본 지원 안 해서, 네이티브 쿼리로 다룰 예정
    // JPA insert에는 이 필드를 안 쓰고, 별도 JDBC/네이티브 쿼리로 embedding을 채운다

    protected SpicyLevelAnchor() {}

    public SpicyLevelAnchor(String expression, String spicyLevel) {
        this.expression = expression;
        this.spicyLevel = spicyLevel;
    }

    public Long getId() { return id; }
    public String getExpression() { return expression; }
    public String getSpicyLevel() { return spicyLevel; }
}