-- View: core.frames_unmatched

DROP VIEW core.frames_unmatched;

CREATE OR REPLACE VIEW core.frames_unmatched
 AS
 SELECT movie_key,
    movie_title_normalized,
    count(*) AS frames_count
   FROM core.frames
  WHERE imdb_tconst IS NULL
  GROUP BY movie_key, movie_title_normalized
  ORDER BY (count(*)) DESC;

ALTER TABLE core.frames_unmatched
    OWNER TO postgres;

