import os
import subprocess
import zipfile
from datetime import datetime
from pathlib import Path

from dotenv import dotenv_values

if __package__:
    from .logging_config import log_message
else:
    from logging_config import log_message


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"


def read_env() -> dict[str, str]:
    return {
        name: value
        for name, value in dotenv_values(ENV_FILE).items()
        if value is not None
    }


def resolve_project_path(path_value: str) -> Path:
    path = Path(path_value)
    return path if path.is_absolute() else PROJECT_ROOT / path


def create_db_backup(env_values: dict[str, str], output_path: Path) -> None:
    environment = os.environ.copy()
    environment["PGPASSWORD"] = env_values["PGPASSWORD"]

    command = [
        "pg_dump",
        "--format=custom",
        "--host",
        env_values["PGHOST"],
        "--port",
        env_values["PGPORT"],
        "--username",
        env_values["PGUSER"],
        "--dbname",
        env_values["PGDATABASE"],
        "--exclude-table=imdb.imdb_title_akas",
        "--exclude-table=imdb.imdb_title_basics",
        "--exclude-table=imdb.imdb_title_crew",
        "--exclude-table=imdb.imdb_title_ratings",
        "--file",
        str(output_path),
    ]

    subprocess.run(
        command,
        env=environment,
        check=True,
    )
    log_message("info", f"Database backup created: {output_path}")


def create_images_backup(source_dir: Path, output_path: Path) -> None:
    with zipfile.ZipFile(
        output_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=6,
    ) as zip_file:
        for path in source_dir.rglob("*"):
            if path.is_file():
                zip_file.write(path, path.relative_to(source_dir))
    log_message("info", f"Images backup created: {output_path}")


def main() -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    env_values = read_env()
    backup_dir = resolve_project_path(env_values["DB_BACKUP_PATH"])
    backup_dir.mkdir(parents=True, exist_ok=True)

    create_db_backup(
        env_values,
        backup_dir / f"database_{timestamp}.dump",
    )
    create_images_backup(
        resolve_project_path(env_values["FRAMES_ORIGINAL_DIR"]),
        backup_dir / f"original_{timestamp}.zip",
    )
    create_images_backup(
        resolve_project_path(env_values["FRAMES_WEBP_DIR"]),
        backup_dir / f"webp_{timestamp}.zip",
    )


if __name__ == "__main__":
    main()
