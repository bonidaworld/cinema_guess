import os
import shutil
import subprocess
import sys
from pathlib import Path
from dotenv import dotenv_values

if __package__:
    from .logging_config import log_message
else:
    from logging_config import log_message

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
SQL_DIR = Path(dotenv_values(ENV_FILE)["SQL_DIR"])

SQL_FILES = (
    SQL_DIR / "insert_core_frames.sql",
    SQL_DIR / "insert_core.frame_assets.sql",
    SQL_DIR / "update_core.frame_assets_original_file_exists.sql",
    SQL_DIR / "update_core.frame_assets_webp_file_exists.sql",
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


def read_frames_webp_dir() -> str:
    frames_dir = dotenv_values(ENV_FILE).get("FRAMES_WEBP_DIR")
    if not frames_dir:
        raise ValueError(f"FRAMES_WEBP_DIR is missing or empty in {ENV_FILE}")
    return frames_dir


def main() -> int:
    try:
        postgres_environment = read_postgres_environment()

        frames_original_dir = read_frames_original_dir()
        frames_webp_dir = read_frames_webp_dir()

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
        f"frames_original_dir={frames_original_dir}",
        "--set",
        f"frames_webp_dir={frames_webp_dir}",
        "--single-transaction",
    ]
    completion_markers = tuple(
        f"__SQL_COMPLETED_{index}__" for index in range(len(SQL_FILES))
    )
    for sql_file, marker in zip(SQL_FILES, completion_markers):
        command.extend(
            ["--file", str(sql_file), "--command", rf"\echo {marker}"]
        )

    try:
        result = subprocess.run(
            command,
            env=environment,
            check=False,
            stdout=subprocess.PIPE,
            text=True,
        )

        completed = set()
        query_results = {}
        remaining_output = result.stdout
        for sql_file, marker in zip(SQL_FILES, completion_markers):
            query_output, separator, remaining_output = remaining_output.partition(
                marker
            )
            output_lines = [
                line.strip() for line in query_output.splitlines() if line.strip()
            ]
            query_results[sql_file] = output_lines[-1] if output_lines else None
            if not separator:
                break
            completed.add(marker)

        failed_query_found = False
        for sql_file, marker in zip(SQL_FILES, completion_markers):
            query_result = query_results.get(sql_file)
            result_suffix = f" ({query_result})" if query_result else ""
            if result.returncode == 0:
                log_message(
                    "info",
                    f"SQL succeeded: {sql_file.name}{result_suffix}",
                )
            elif marker in completed:
                log_message(
                    "warning",
                    f"SQL rolled back: {sql_file.name}{result_suffix}",
                )
            elif not failed_query_found:
                log_message(
                    "error",
                    f"SQL failed: {sql_file.name}{result_suffix}",
                )
                failed_query_found = True
            else:
                log_message("warning", f"SQL skipped: {sql_file.name}")

        return result.returncode
    except OSError as error:
        print(f"error: failed to start psql: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("error: interrupted", file=sys.stderr)
        return 130

if __name__ == "__main__":
    raise SystemExit(main())
