ALTER TABLE spicy_level_anchors
    DROP CONSTRAINT ck_spicy_level_anchors_spicy_level,
    ADD CONSTRAINT ck_spicy_level_anchors_spicy_level CHECK (spicy_level IN ('HOT', 'MEDIUM', 'MILD', 'NO_PREFERENCE'));