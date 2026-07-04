-- Table: core.frames

-- DROP TABLE IF EXISTS core.frames;

CREATE TABLE IF NOT EXISTS core.frames
(
    id bigint NOT NULL DEFAULT nextval('core.frames_id_seq'::regclass),
    source text COLLATE pg_catalog."default" NOT NULL DEFAULT 'shotdeck'::text,
    source_frame_id text COLLATE pg_catalog."default" NOT NULL,
    movie_key text COLLATE pg_catalog."default" NOT NULL,
    imdb_tconst text COLLATE pg_catalog."default",
    imdb_primary_title text COLLATE pg_catalog."default",
    imdb_original_title text COLLATE pg_catalog."default",
    imdb_display_title text COLLATE pg_catalog."default",
    imdb_year integer,
    runtime_minutes integer,
    runtime_seconds integer,
    imdb_average_rating numeric,
    imdb_num_votes integer,
    imdb_match_source text COLLATE pg_catalog."default" NOT NULL DEFAULT 'unmatched'::text,
    movie_title_normalized text COLLATE pg_catalog."default" NOT NULL,
    frame_timestamp_raw text COLLATE pg_catalog."default",
    frame_timestamp_minutes integer,
    frame_timestamp_seconds integer,
    imported_at timestamp with time zone,
    updated_at timestamp with time zone,
    frame_public_key text COLLATE pg_catalog."default" GENERATED ALWAYS AS (('cg_'::text || "left"(encode(core.digest(((source || ':'::text) || source_frame_id), 'sha256'::text), 'hex'::text), 16))) STORED,
    CONSTRAINT frames_pkey PRIMARY KEY (id),
    CONSTRAINT uq_core_frames_public_key UNIQUE (frame_public_key),
    CONSTRAINT uq_core_frames_source_frame UNIQUE (source, source_frame_id),
    CONSTRAINT uq_core_frames_source_frame_id UNIQUE (source_frame_id),
    CONSTRAINT frames_imdb_match_source_check CHECK (imdb_match_source = ANY (ARRAY['override'::text, 'movie_key'::text, 'original_movie_key'::text, 'unmatched'::text]))
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS core.frames
    OWNER to postgres;
-- Index: idx_core_frames_imdb_tconst

-- DROP INDEX IF EXISTS core.idx_core_frames_imdb_tconst;

CREATE INDEX IF NOT EXISTS idx_core_frames_imdb_tconst
    ON core.frames USING btree
    (imdb_tconst COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_core_frames_movie_key

-- DROP INDEX IF EXISTS core.idx_core_frames_movie_key;

CREATE INDEX IF NOT EXISTS idx_core_frames_movie_key
    ON core.frames USING btree
    (movie_key COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;