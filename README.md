# CinemaGuesser

CinemaGuesser is a browser game about placing a movie frame at the right point on the film timeline. The current prototype has a WebGL menu and a five-round single-player game. It loads playable frames from PostgreSQL, keeps the answer on the server until the player submits a guess, and calculates a score for each round.

## Run locally

Requirements: Node.js, npm, a PostgreSQL database with the CinemaGuesser schemas and `app.v_frames_ready` view, and the local WebP frame assets referenced by the database.

Install dependencies and start Next.js from the repository root:

```powershell
npm install
npm.cmd run dev
```

Use `npm.cmd` in PowerShell if the execution policy blocks `npm.ps1`. Open [http://localhost:3000](http://localhost:3000) after the server starts.

The app reads `DATABASE_URL` for PostgreSQL and `FRAMES_WEBP_DIR` for the local WebP asset directory. Configure these in the root `.env` file for your environment. Do not commit credentials. Database setup and the frame data pipeline are documented in [`docs/db_pipeline.md`](docs/db_pipeline.md), [`supabase/README.md`](supabase/README.md), and [`scripts/README.md`](scripts/README.md).

## Game flow

1. `POST /api/session` creates a game and returns a token stored in the browser tab. `POST /api/round` selects a random ready frame not yet used in that game. The response includes public movie details but not the correct timestamp.
2. The player chooses a timestamp between zero and the movie runtime.
3. `POST /api/guess` reads the correct timestamp from PostgreSQL and returns the result and score.
4. `GET /api/frame-image/[framePublicKey]` resolves the image through the database and serves it only from the configured WebP directory.
5. After five rounds, the browser displays the game total. Progress is stored on the server and restored after a page refresh; the tab token is normally discarded when the tab closes.

The database connection is pooled in [`src/lib/db.ts`](src/lib/db.ts). The game-facing view is [`app.v_frames_ready`](db/create_app.v_frames_ready.sql). The application currently uses PostgreSQL; the older TypeScript movie and frame arrays are retained in the repository but are not used by the game API.

## Scoring

The server normalizes the guessed and actual timestamps by the movie runtime and passes their positions to [`lib/scoring.ts`](lib/scoring.ts). A perfect answer earns up to 1,000 points; the score decreases with distance from the correct position.

## Current limits

- There are no accounts, player-accessible game history, or leaderboard. Closed tabs do not reliably notify the server, and abandoned records are not automatically cleaned up.
- The database and WebP image files are environment dependencies; the WebP collection is stored locally outside Git, not in a hosted object store.
- There is no automated test suite or production deployment workflow.
- Rights to use the movie frames have not been established. The prototype content is not cleared for public distribution.

See [`docs/project_status.md`](docs/project_status.md) for the implementation status and [`docs/slice.md`](docs/slice.md) for remaining work relative to the research plan.
