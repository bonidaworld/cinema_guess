WITH directory AS (
    SELECT
        :'frames_original_dir' AS source_path,
        lower(rtrim(replace(:'frames_original_dir', chr(92), '/'), '/'))
            AS normalized_path
),
existing_files AS (
    SELECT
        directory.normalized_path || '/' || lower(files.file_name)
            AS storage_path
    FROM directory
    CROSS JOIN LATERAL pg_ls_dir(directory.source_path) AS files(file_name)
    WHERE lower(files.file_name) ~ '[.](jpg|jpeg|png|webp|avif)$'
)
UPDATE core.frame_assets AS asset
SET file_exists = EXISTS (
    SELECT 1
    FROM existing_files
    WHERE existing_files.storage_path =
        lower(replace(asset.storage_path, chr(92), '/'))
)
WHERE asset.asset_type = 'original';
