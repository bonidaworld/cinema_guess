-- Table: core.log

-- DROP TABLE IF EXISTS core.log;

CREATE TABLE IF NOT EXISTS core.log
(
    id bigint NOT NULL DEFAULT nextval('core.log_id_seq'::regclass),
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    level text COLLATE pg_catalog."default" NOT NULL,
    message text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT log_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS core.log
    OWNER to postgres;