CREATE SCHEMA IF NOT EXISTS core;

DROP TABLE IF EXISTS core.frames;

CREATE TABLE core.frames (
    id bigserial PRIMARY KEY,

    source text NOT NULL DEFAULT 'shotdeck',
    source_frame_id text NOT NULL,

    movie_key text NOT NULL,

    imdb_tconst text,
    imdb_primary_title text,
    imdb_original_title text,
    imdb_display_title text,
    imdb_year integer,

    runtime_minutes integer,
    runtime_seconds integer,

    imdb_average_rating numeric,
    imdb_num_votes integer,
    imdb_match_source text NOT NULL DEFAULT 'unmatched'
        CHECK (imdb_match_source IN (
            'override',
            'movie_key',
            'original_movie_key',
            'unmatched'
        )),

    movie_title_normalized text NOT NULL,

    frame_timestamp_raw text,
    frame_timestamp_minutes integer,
    frame_timestamp_seconds integer,

    imported_at timestamptz,
    updated_at timestamptz,

    CONSTRAINT uq_core_frames_source_frame
        UNIQUE (source, source_frame_id)
);

CREATE INDEX idx_core_frames_movie_key
ON core.frames(movie_key);

CREATE INDEX idx_core_frames_imdb_tconst
ON core.frames(imdb_tconst);

