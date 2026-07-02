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
```

`FRAMES_ORIGINAL_DIR` must be accessible from the machine running PostgreSQL.

## Run

```powershell
python scripts/psql_data_update.py
```

    
