
CREATE TABLE app.session_rounds (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id bigint NOT NULL REFERENCES app.game_sessions(id) ON DELETE CASCADE,
    round_number integer NOT NULL CHECK (round_number BETWEEN 1 AND 5),
    frame_id bigint NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    guessed_timestamp_seconds integer,
    actual_timestamp_seconds integer,
    runtime_seconds integer,
    score integer,
    answered_at timestamptz,
    UNIQUE (session_id, round_number),
    UNIQUE (session_id, frame_id),
    CHECK (
        (answered_at IS NULL AND guessed_timestamp_seconds IS NULL
            AND actual_timestamp_seconds IS NULL AND runtime_seconds IS NULL AND score IS NULL)
        OR
        (answered_at IS NOT NULL AND guessed_timestamp_seconds IS NOT NULL
            AND actual_timestamp_seconds IS NOT NULL AND runtime_seconds IS NOT NULL
            AND score IS NOT NULL AND runtime_seconds > 0
            AND guessed_timestamp_seconds BETWEEN 0 AND runtime_seconds
            AND actual_timestamp_seconds BETWEEN 0 AND runtime_seconds
            AND score BETWEEN 0 AND 1000)
    )
);