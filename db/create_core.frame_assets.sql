CREATE TABLE IF NOT EXISTS core.frame_assets
(
    id bigserial PRIMARY KEY,

    source_frame_id text NOT NULL,

    asset_type text NOT NULL
        CHECK (asset_type IN ('original', 'web', 'thumb')),

    storage_path text NOT NULL,

    file_exists boolean NOT NULL DEFAULT false,

    image_sha256 text,
    width integer,
    height integer,
    file_size_bytes bigint,
    mime_type text,

    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_frame_assets_frame_type
        UNIQUE (source_frame_id, asset_type),

    CONSTRAINT fk_frame_assets_frame_id
        FOREIGN KEY (source_frame_id)
        REFERENCES core.frames(source_frame_id)
        ON DELETE CASCADE
);