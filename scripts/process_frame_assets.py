import hashlib
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
load_dotenv(ENV_FILE)
WEBP_OUTPUT_DIR = Path(os.environ["FRAMES_WEBP_DIR"]).resolve()
WEBP_QUALITY = 85

def connect_to_database():
     return psycopg2.connect(os.environ["DATABASE_URL"])


def calculate_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as image_file:
        for chunk in iter(lambda: image_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def resolve_storage_path(storage_path: str) -> Path:
    path = Path(storage_path)
    return path if path.is_absolute() else PROJECT_ROOT / path


def save_webp(image: Image.Image, output_path: Path) -> None:
    mode = "RGBA" if image.mode in {"RGBA", "LA"} else "RGB"
    image.convert(mode).save(
        output_path,
        format="WEBP",
        quality=WEBP_QUALITY,
    )


def select_conversion_candidates(cursor) -> list[tuple[str, str, str]]:
    cursor.execute(
        """
        SELECT 
            original.source_frame_id,
            F.frame_public_key, 
            original.storage_path
        FROM core.frame_assets AS original
        JOIN core.frames F ON original.source_frame_id = F.source_frame_id
        WHERE original.asset_type = 'original'
          AND original.file_exists = true
          AND (
                NOT EXISTS (  
                            SELECT 1
                            FROM core.frame_assets AS webp
                            WHERE webp.source_frame_id = original.source_frame_id
                                AND webp.asset_type = 'webp'
                        )
                OR 
                EXISTS      (
                            SELECT 1 
                            FROM core.frame_assets AS webp
                            WHERE webp.source_frame_id = original.source_frame_id
                                AND webp.asset_type = 'webp'
                                AND webp.file_exists = false
                        )
            )
        """
    )
    return cursor.fetchall()


def create_wepb_asset(cursor, source_frame_id: str, frame_public_key: str, storage_path: str) -> None:
    original_path = resolve_storage_path(storage_path)
    webp_output_path = (WEBP_OUTPUT_DIR / f"{frame_public_key}.webp").resolve()

    with Image.open(original_path) as image:
        image.load()
        width, height = image.size
        save_webp(image, webp_output_path)

    # WEBP
    cursor.execute(
        """
        INSERT INTO core.frame_assets (
            source_frame_id,
            asset_type,
            storage_path,
            file_exists,
            width,
            height,
            file_size_bytes,
            mime_type,
            image_sha256
        )
        VALUES (%s, 'webp', %s, true, %s, %s, %s, 'image/webp', %s)
        ON CONFLICT (source_frame_id, asset_type) DO UPDATE
        SET
            storage_path = EXCLUDED.storage_path,
            file_exists = EXCLUDED.file_exists,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            file_size_bytes = EXCLUDED.file_size_bytes,
            mime_type = EXCLUDED.mime_type,
            image_sha256 = EXCLUDED.image_sha256
        """,
        (
            source_frame_id,
            webp_output_path.as_posix(),
            width,
            height,
            webp_output_path.stat().st_size,
            calculate_sha256(webp_output_path),
        ),
    )


def main() -> None:
    WEBP_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    connection = connect_to_database()

    try:
        with connection:
            with connection.cursor() as cursor:
                candidates = select_conversion_candidates(cursor)
                print(f"Selected {len(candidates)} conversion candidates.")

                for source_frame_id, frame_public_key, storage_path in candidates:
                    create_wepb_asset(
                        cursor,
                        source_frame_id,
                        frame_public_key,
                        storage_path,
                    )
                    print(f"Processed {frame_public_key}")
    finally:
        connection.close()

    print(f"Processed {len(candidates)} frame assets.")

if __name__ == "__main__":
    main()
