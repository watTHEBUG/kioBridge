CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE spicy_level_anchors
    ADD COLUMN embedding vector(1536) NOT NULL,
    ADD CONSTRAINT ck_spicy_level_anchors_spicy_level CHECK (spicy_level IN ('HOT', 'MEDIUM', 'MILD', 'NO_PREFERENCE'));

CREATE INDEX idx_spicy_level_anchors_embedding
    ON spicy_level_anchors USING hnsw (embedding vector_cosine_ops);