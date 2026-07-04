"use client";

import Image from "next/image";
import { useState } from "react";

const ROUNDS_PER_GAME = 5;

type GameScreen = "menu" | "game" | "results";

type PublicRound = {
  frameId: number;
  framePublicKey: string;
  imdbTconst: string | null;
  title: string;
  year: number;
  runtimeSeconds: number;
  frameImage: string;
  imageWidth: number;
  imageHeight: number;
};

type GuessResult = {
  actualTimestampSeconds: number;
  differenceSeconds: number;
  score: number;
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// This component runs in the browser and only stores public round data.
export default function Home() {
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [round, setRound] = useState<PublicRound | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [usedFrameIds, setUsedFrameIds] = useState<number[]>([]);
  const [guessedTimestampSeconds, setGuessedTimestampSeconds] = useState(0);
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isResultShown = guessResult !== null;
  const targetTimestampSeconds =
    guessResult?.actualTimestampSeconds ?? 0;
  const differenceSeconds = guessResult?.differenceSeconds ?? 0;

  // The browser asks the server for a round without the correct answer.
  async function loadRandomRound(excludedFrameIds: number[]) {
    setIsLoading(true);
    setErrorMessage(null);
    setRound(null);
    setGuessResult(null);

    try {
      const searchParams = new URLSearchParams();

      for (const frameId of excludedFrameIds) {
        searchParams.append("exclude", frameId.toString());
      }

      const query = searchParams.toString();
      const endpoint = query ? `/api/round?${query}` : "/api/round";
      const response = await fetch(endpoint, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to load round");
      }

      const nextRound = (await response.json()) as PublicRound;

      setRound(nextRound);
      setUsedFrameIds([...excludedFrameIds, nextRound.frameId]);
      setGuessedTimestampSeconds(
        Math.round(nextRound.runtimeSeconds / 2),
      );
    } catch {
      setErrorMessage("Failed to load the round.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartGame() {
    setRoundNumber(1);
    setUsedFrameIds([]);
    setSessionScore(0);
    setScreen("game");
    await loadRandomRound([]);
  }

  // Only frameId and the selected timestamp are sent to the server.
  async function handleCheckGuess() {
    if (!round || isResultShown || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frameId: round.frameId,
          guessedTimestampSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check guess");
      }

      const result = (await response.json()) as GuessResult;

      setGuessResult(result);
      setSessionScore((currentScore) => currentScore + result.score);
    } catch {
      setErrorMessage("Failed to check the answer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAdjustGuess(seconds: number) {
    if (!round) {
      return;
    }

    setGuessedTimestampSeconds((currentTimestamp) =>
      Math.min(
        round.runtimeSeconds,
        Math.max(0, currentTimestamp + seconds),
      ),
    );
  }

  async function handleNextRound() {
    if (roundNumber === ROUNDS_PER_GAME) {
      setScreen("results");
      return;
    }

    setRoundNumber((currentRound) => currentRound + 1);
    await loadRandomRound(usedFrameIds);
  }

  function handleReturnToMenu() {
    setScreen("menu");
  }

  if (screen === "menu") {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            CinemaGuesser
          </h1>
          <p className="mt-5 text-zinc-400">
            Угадайте, на какой минуте фильма сделан этот кадр.
          </p>
          <button
            type="button"
            onClick={handleStartGame}
            className="mt-10 rounded-lg bg-amber-400 px-8 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
          >
            Играть
          </button>
        </div>
      </main>
    );
  }

  if (screen === "results") {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
        <div className="flex w-full max-w-xl flex-col items-center text-center">
          <p className="text-sm font-medium text-amber-400">Игра завершена</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            CinemaGuesser
          </h1>
          <p className="mt-10 text-zinc-400">Набрано очков</p>
          <p className="mt-3 text-6xl font-bold text-emerald-400">
            {sessionScore}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleStartGame}
              className="rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              Начать игру заново
            </button>
            <button
              type="button"
              onClick={handleReturnToMenu}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3 font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              Вернуться в главное меню
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 text-zinc-100">
        <p className="text-zinc-400">Загрузка раунда...</p>
      </main>
    );
  }

  if (!round) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 text-zinc-100">
        <div className="text-center">
          <p className="text-zinc-400">
            {errorMessage ?? "Round unavailable."}
          </p>
          <button
            type="button"
            onClick={() => loadRandomRound(usedFrameIds)}
            className="mt-6 rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
          >
            Попробовать снова
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-950 px-6 py-10 text-zinc-100">
      <button
        type="button"
        onClick={handleReturnToMenu}
        className="fixed left-6 top-6 z-10 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
      >
        Выйти в главное меню
      </button>

      <div className="flex w-full max-w-4xl flex-col items-center text-center">
        <div className="mb-3 flex items-center gap-6 text-sm font-medium">
          <p className="text-amber-400">
            Раунд {roundNumber} / {ROUNDS_PER_GAME}
          </p>
          <p className="text-zinc-400">Общий счёт: {sessionScore}</p>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          CinemaGuesser
        </h1>

        <p className="mt-4 text-base text-zinc-400 sm:text-lg">
          Угадайте, на какой минуте фильма сделан этот кадр.
        </p>

        <div className="relative mt-10 aspect-video w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <Image
            src={round.frameImage}
            alt={`Frame from ${round.title}`}
            fill
            priority
            className="object-contain"
          />
        </div>

        <p className="mt-4 text-zinc-500">
          {round.title} ({round.year})
        </p>

        <div className="mt-8 w-full">
          <div className="mb-3 flex justify-between text-xs text-zinc-500">
            <span>0:00</span>
            <span>{formatTime(round.runtimeSeconds)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAdjustGuess(-1)}
              disabled={isResultShown || guessedTimestampSeconds === 0}
              className="h-10 w-10 shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Сдвинуть выбор на одну секунду назад"
              title="На секунду назад"
            >
              ←
            </button>

            <input
              type="range"
              min="0"
              max={round.runtimeSeconds}
              step="1"
              value={guessedTimestampSeconds}
              disabled={isResultShown}
              onChange={(event) =>
                setGuessedTimestampSeconds(Number(event.target.value))
              }
              className="min-w-0 flex-1 cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
              aria-label="Выбор момента на таймлайне фильма"
            />

            <button
              type="button"
              onClick={() => handleAdjustGuess(1)}
              disabled={
                isResultShown ||
                guessedTimestampSeconds === round.runtimeSeconds
              }
              className="h-10 w-10 shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Сдвинуть выбор на одну секунду вперёд"
              title="На секунду вперёд"
            >
              →
            </button>
          </div>

          <div className="mt-3 flex justify-center gap-6 text-xs text-zinc-500">
            <span>
              Твой выбор: {formatTime(guessedTimestampSeconds)}
            </span>

            {guessResult && (
              <span className="text-emerald-400">
                Верно: {formatTime(targetTimestampSeconds)}
              </span>
            )}
          </div>
        </div>

        {guessResult ? (
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-5">
            {differenceSeconds === 0 ? (
              <p className="text-lg font-semibold text-emerald-400">
                HEADSHOT
              </p>
            ) : (
              <p className="text-lg font-semibold text-zinc-100">
                Ошиблись на: {formatTime(differenceSeconds)}
              </p>
            )}
            <p className="mt-2 text-sm text-zinc-400">
              Счёт: {guessResult.score}
            </p>
          </div>
        ) : (
          <p className="mt-8 text-sm text-zinc-500">
            Передвинь маркер туда, где, по твоему мнению, находится этот кадр.
          </p>
        )}

        {errorMessage && (
          <p className="mt-5 text-sm text-red-400">{errorMessage}</p>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {guessResult ? (
            <button
              type="button"
              onClick={handleNextRound}
              className="rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              {roundNumber === ROUNDS_PER_GAME
                ? "Завершить игру"
                : "Следующий фильм"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckGuess}
              disabled={isSubmitting}
              className="rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {isSubmitting ? "Проверка..." : "Ответить"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
