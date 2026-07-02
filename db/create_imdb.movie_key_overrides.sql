CREATE TABLE IF NOT EXISTS imdb.movie_key_overrides (
    movie_key text PRIMARY KEY,
    tconst text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);