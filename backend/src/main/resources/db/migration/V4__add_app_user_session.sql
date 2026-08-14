ALTER TABLE app_users
    ADD COLUMN session_token_hash VARCHAR(64);

ALTER TABLE app_users
    ADD COLUMN session_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE app_users
    ADD CONSTRAINT uk_app_users_session_token_hash
        UNIQUE (session_token_hash);