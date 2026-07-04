import logging
import os
import threading
from pathlib import Path
from dotenv import dotenv_values
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"


# Loads and validates the PostgreSQL connection URL.
def read_db_url() -> str:
    db_url = dotenv_values(ENV_FILE).get("DATABASE_URL")
    if not isinstance(db_url, str) or not db_url.strip():
        raise ValueError(f"DATABASE_URL is missing or empty in {ENV_FILE}")

    db_url = db_url.strip()
    if db_url.startswith("postgres://"):
        db_url = f"postgresql://{db_url.removeprefix('postgres://')}"
    return db_url

DB_URL = read_db_url()

class ColoredFormatter(logging.Formatter):
    """Цветной форматтер для консоли."""

    COLORS = {
        'DEBUG': '\033[35m',  # Magenta
        'INFO': '\033[36m',  # Cyan
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',  # Red
        'CRITICAL': '\033[41m',  # Red background
    }
    RESET = '\033[0m'

    # Adds a level-specific color to a log message.
    def format(self, record):
        formatted = super().format(record)
        color = self.COLORS.get(record.levelname, '')
        return f'{color}{formatted}{self.RESET}'


class DatabaseLogHandler(logging.Handler):

    CREATE_TABLE_SQL = text(
        """
        CREATE TABLE IF NOT EXISTS core.log (
            id bigserial PRIMARY KEY,
            created_at timestamp NOT NULL DEFAULT now(),
            level text NOT NULL,
            message text NOT NULL
        );
        """
    )
    INSERT_SQL = text(
        """
        INSERT INTO core.log (
            level,
            message
        )
        VALUES (
            :level,
            :message
        );
        """
    )

    # Initializes database logging state.
    def __init__(self, db_url: str | None):
        super().__init__()
        self.db_url = db_url
        self._engine = None
        self._table_ready = False
        self._disabled = not bool(db_url)
        self._lock = threading.RLock()
        self._local = threading.local()

    # Creates and caches the SQLAlchemy engine.
    def _get_engine(self):
        if self._engine is None:
            self._engine = create_engine(self.db_url, pool_pre_ping=True)
        return self._engine

    # Creates the log table once when needed.
    def _ensure_table(self):
        if self._table_ready or self._disabled:
            return

        with self._lock:
            if self._table_ready or self._disabled:
                return

            with self._get_engine().begin() as conn:
                conn.execute(self.CREATE_TABLE_SQL)
            self._table_ready = True

    # Writes one log record to the database.
    def emit(self, record):
        if self._disabled or getattr(self._local, 'is_emitting', False):
            return

        self._local.is_emitting = True
        try:
            self._ensure_table()
            if self._disabled:
                return

            payload = {
                'level': record.levelname,
                'message': record.getMessage(),
            }
            with self._get_engine().begin() as conn:
                conn.execute(self.INSERT_SQL, payload)
        except Exception:
            self._disabled = True
        finally:
            self._local.is_emitting = False


# Configures console and database handlers.
def setup_logger(name=__name__):
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger  # Уже настроен

    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    date_format = '%Y-%m-%d %H:%M:%S'

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColoredFormatter(log_format, datefmt=date_format))

    db_handler = DatabaseLogHandler(DB_URL)

    logger.addHandler(console_handler)
    logger.addHandler(db_handler)
    return logger


# Logs a message using its requested level.
def log_message(message_type, message):
    logger = setup_logger()

    match message_type:
        case 'info':
            logger.info(message)
        case 'error':
            logger.error(message)
        case 'warning':
            logger.warning(message)
        case _:
            logger.warning(f'Неизвестный тип сообщения: {message_type} - {message}')
