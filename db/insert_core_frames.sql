INSERT INTO core.frames (
    source,
    source_frame_id,
    movie_key,

    imdb_tconst,
    imdb_primary_title,
    imdb_original_title,
    imdb_display_title,
    imdb_year,
    runtime_minutes,
    runtime_seconds,
    imdb_average_rating,
    imdb_num_votes,
    imdb_match_source,

    movie_title_normalized,

    frame_timestamp_raw,
    frame_timestamp_minutes,
    frame_timestamp_seconds,

    imported_at,
    updated_at
)
SELECT
    raw.source,
    raw.source_frame_id,
    raw.movie_key,

    COALESCE(imdb_by_override.tconst, imdb_by_key.tconst, imdb_by_original.tconst) AS imdb_tconst,
    COALESCE(imdb_by_override.primary_title, imdb_by_key.primary_title, imdb_by_original.primary_title) AS imdb_primary_title,
    COALESCE(imdb_by_override.original_title, imdb_by_key.original_title, imdb_by_original.original_title) AS imdb_original_title,
    COALESCE(imdb_by_override.display_title, imdb_by_key.display_title, imdb_by_original.display_title) AS imdb_display_title,
    COALESCE(imdb_by_override.start_year, imdb_by_key.start_year, imdb_by_original.start_year) AS imdb_year,
    COALESCE(imdb_by_override.runtime_minutes, imdb_by_key.runtime_minutes, imdb_by_original.runtime_minutes) AS runtime_minutes,
    COALESCE(imdb_by_override.runtime_minutes, imdb_by_key.runtime_minutes, imdb_by_original.runtime_minutes) * 60 AS runtime_seconds,
    COALESCE(imdb_by_override.average_rating, imdb_by_key.average_rating, imdb_by_original.average_rating) AS imdb_average_rating,
    COALESCE(imdb_by_override.num_votes, imdb_by_key.num_votes, imdb_by_original.num_votes) AS imdb_num_votes,

    CASE
        WHEN imdb_by_override.tconst IS NOT NULL THEN 'override'
        WHEN imdb_by_key.tconst IS NOT NULL THEN 'movie_key'
        WHEN imdb_by_original.tconst IS NOT NULL THEN 'original_movie_key'
        ELSE 'unmatched'
    END AS imdb_match_source,

    raw.movie_title_normalized,

    raw.frame_timestamp_raw,
    floor(raw.frame_timestamp_seconds / 60)::integer AS frame_timestamp_minutes,
    raw.frame_timestamp_seconds::integer AS frame_timestamp_seconds,

    raw.imported_at::timestamptz,
    raw.updated_at::timestamptz

FROM ingest.frames_shotdeck_raw raw

LEFT JOIN imdb.movie_key_overrides o
    ON o.movie_key = raw.movie_key

LEFT JOIN imdb.title_movies_uniq imdb_by_override
    ON imdb_by_override.tconst = o.tconst

LEFT JOIN imdb.title_movies_uniq imdb_by_key
    ON imdb_by_key.movie_key = raw.movie_key

LEFT JOIN LATERAL (
    SELECT *
    FROM imdb.title_movies_uniq m
    WHERE m.original_movie_key = raw.movie_key
    ORDER BY
        COALESCE(m.num_votes, 0) DESC,
        COALESCE(m.average_rating, 0) DESC,
        m.tconst
    LIMIT 1
) imdb_by_original
    ON imdb_by_override.tconst IS NULL
   AND imdb_by_key.tconst IS NULL

WHERE raw.frame_timestamp_raw IS NOT NULL

ON CONFLICT (source, source_frame_id) DO NOTHING;