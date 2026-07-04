CREATE TABLE IF NOT EXISTS core.log (
            id bigserial PRIMARY KEY,
            created_at timestamp NOT NULL DEFAULT now(),
            logger_name text NOT NULL,
            level text NOT NULL,
            message text NOT NULL,
            module text,
            func_name text,
            line_no integer
        );