INSERT INTO core.frame_assets (
    source_frame_id,
    asset_type,
    storage_path,
    file_exists,
    image_sha256
)
SELECT
    f.source_frame_id AS source_frame_id,
    'original' AS asset_type,
    raw.local_image_path AS storage_path,
    false AS file_exists,
    raw.image_sha256
FROM core.frames f
JOIN ingest.frames_shotdeck_raw raw
    ON raw.source = f.source
   AND raw.source_frame_id = f.source_frame_id
WHERE raw.local_image_path IS NOT NULL
ON CONFLICT (source_frame_id, asset_type) DO UPDATE
SET
    storage_path = EXCLUDED.storage_path,
    file_exists = EXCLUDED.file_exists,
    image_sha256 = EXCLUDED.image_sha256;