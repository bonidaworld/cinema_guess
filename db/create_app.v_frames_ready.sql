-- View: app.v_frames_ready

-- DROP VIEW app.v_frames_ready;

CREATE OR REPLACE VIEW app.v_frames_ready
 AS
 SELECT f.id AS frame_id,
    f.source_frame_id,
    f.frame_public_key,
	f.imdb_tconst,
    f.imdb_display_title AS title,
    f.imdb_year AS year,
    f.runtime_seconds,
    f.frame_timestamp_seconds,
    a.storage_path AS frame_image,
    a.width AS image_width,
    a.height AS image_height,
    a.mime_type AS image_mime_type,
    a.file_size_bytes AS image_file_size_bytes,
    f.imdb_average_rating,
    f.imdb_num_votes
   FROM core.frames f
     JOIN core.frame_assets a ON a.source_frame_id = f.source_frame_id AND a.asset_type = 'webp'::text AND a.file_exists = true
  WHERE f.imdb_display_title IS NOT NULL AND f.imdb_year IS NOT NULL AND f.runtime_seconds IS NOT NULL AND f.frame_timestamp_seconds IS NOT NULL AND f.frame_timestamp_seconds >= 0 AND f.frame_timestamp_seconds <= f.runtime_seconds;

ALTER TABLE app.v_frames_ready
    OWNER TO postgres;

