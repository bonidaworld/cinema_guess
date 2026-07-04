# Database update script

## Requirements

- Python 3
- PostgreSQL `psql` available in `PATH`
- Python package `python-dotenv`

## Configuration

Add these values to the project root `.env`:

```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=cinemaguess
PGUSER=postgres
PGPASSWORD="your-password"
SQL_DIR=C:/Kurage/CinemaGuess/db
FRAMES_ORIGINAL_DIR=C:/Kurage/CinemaGuess/data/frames/original
FRAMES_WEBP_DIR=C:/Kurage/CinemaGuess/data/frames/webp
```

Both frame directories must be accessible from the machine running PostgreSQL.

## Run

```powershell
python scripts/psql_data_update.py
```

## Process frame image assets

The script reads `DATABASE_URL`, or the five `PG*` values above, from the
project root `.env`.

Install the image-processing dependencies:

```powershell
pip install Pillow python-dotenv psycopg2-binary
```

Then update the original asset metadata and create the WebP assets:

```powershell
python scripts/process_frame_assets.py
```

    
