import os
import shutil
import subprocess
import sys
from pathlib import Path
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
SQL_DIR = Path(dotenv_values(ENV_FILE)["SQL_DIR"])

SQL_FILES = (
    SQL_DIR / "insert_core_frames.sql",
    SQL_DIR / "insert_core.frame_assets.sql",
    SQL_DIR / "update_core.frame_assets_file_exists.sql",
)


def read_postgres_environment() -> dict[str, str]:
    values = dotenv_values(ENV_FILE)
    required_variables = (
        "PGHOST",
        "PGPORT",
        "PGDATABASE",
        "PGUSER",
        "PGPASSWORD",
    )
    missing_variables = [
        name for name in required_variables if not values.get(name)
    ]
    if missing_variables:
        raise ValueError(
            f"Missing or empty variables in {ENV_FILE}: "
            + ", ".join(missing_variables)
        )
    return {name: str(values[name]) for name in required_variables}


def read_frames_original_dir() -> str:
    frames_dir = dotenv_values(ENV_FILE).get("FRAMES_ORIGINAL_DIR")
    if not frames_dir:
        raise ValueError(f"FRAMES_ORIGINAL_DIR is missing or empty in {ENV_FILE}")
    return frames_dir


def main() -> int:
    try:
        postgres_environment = read_postgres_environment()
        frames_dir = read_frames_original_dir()
        missing_files = [path for path in SQL_FILES if not path.is_file()]
        if missing_files:
            raise FileNotFoundError(
                "Required SQL file not found: "
                + ", ".join(str(path) for path in missing_files)
            )

        psql = shutil.which("psql")
        if psql is None:
            raise FileNotFoundError(
                "psql was not found. Install PostgreSQL client tools "
                "or add psql to PATH."
            )
    except (FileNotFoundError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    environment = os.environ.copy()
    environment.update(postgres_environment)
    command = [
        psql,
        "--no-psqlrc",
        "--set",
        "ON_ERROR_STOP=1",
        "--set",
        f"frames_dir={frames_dir}",
        "--single-transaction",
        "--file",
        str(SQL_FILES[0]),
        "--file",
        str(SQL_FILES[1]),
        "--file",
        str(SQL_FILES[2]),
    ]

    try:
        return subprocess.run(command, env=environment, check=False).returncode
    except OSError as error:
        print(f"error: failed to start psql: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("error: interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
