"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MenuWebGLBackground } from "@/src/components/MenuWebGLBackground";

const ROUNDS_PER_GAME = 5;
const GAME_TOKEN_KEY = "cinemaguesser.gameToken";

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
  const startingGame = useRef(false);
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

  function gameHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async function restoreGame(token: string) {
    const response = await fetch("/api/session", { headers: gameHeaders(token), cache: "no-store" });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (error.error === "FRAME_UNAVAILABLE") throw new Error("Игра или кадр недоступны. Начните новую игру.");
      if (response.status === 404 || response.status === 401) {
        sessionStorage.removeItem(GAME_TOKEN_KEY);
        throw new Error("Игра или кадр недоступны. Начните новую игру.");
      }
      throw new Error("Не удалось восстановить игру. Попробуйте снова.");
    }
    const data: { totalScore: number; round: (PublicRound & { roundNumber: number; result: GuessResult | null; guessedTimestampSeconds: number | null }) | null } = await response.json();
    setSessionScore(data.totalScore);
    if (data.round) {
      setRound(data.round);
      setRoundNumber(data.round.roundNumber);
      setGuessResult(data.round.result);
      setGuessedTimestampSeconds(data.round.guessedTimestampSeconds ?? Math.round(data.round.runtimeSeconds / 2));
    } else {
      await createRound(token);
    }
  }

  async function createRound(token: string) {
    const response = await fetch("/api/round", { method: "POST", headers: gameHeaders(token) });
    if (!response.ok) throw new Error("Не удалось загрузить раунд. Попробуйте снова.");
    const next: PublicRound & { roundNumber: number } = await response.json();
    setRound(next);
    setRoundNumber(next.roundNumber);
    setGuessResult(null);
    setGuessedTimestampSeconds(Math.round(next.runtimeSeconds / 2));
  }

  async function loadGame() {
    const token = sessionStorage.getItem(GAME_TOKEN_KEY);
    if (!token) { setScreen("menu"); return; }
    setScreen("game");
    setIsLoading(true);
    setErrorMessage(null);
    try { await restoreGame(token); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить игру."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGame(), 0);
    return () => window.clearTimeout(timer);
    // Restore only once when this tab opens or reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStartGame() {
    if (startingGame.current) return;
    startingGame.current = true;
    setScreen("game");
    setRound(null);
    setGuessResult(null);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const previous = sessionStorage.getItem(GAME_TOKEN_KEY);
      if (previous) {
        const ended = await fetch("/api/session", { method: "PATCH", headers: gameHeaders(previous) });
        if (!ended.ok && ended.status !== 404) throw new Error("Не удалось завершить предыдущую игру.");
        sessionStorage.removeItem(GAME_TOKEN_KEY);
      }
      const response = await fetch("/api/session", { method: "POST" });
      if (!response.ok) throw new Error("Не удалось начать игру. Попробуйте снова.");
      const { token }: { token: string } = await response.json();
      sessionStorage.setItem(GAME_TOKEN_KEY, token);
      setSessionScore(0);
      await createRound(token);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не удалось начать игру.");
    } finally { setIsLoading(false); startingGame.current = false; }
  }

  async function handleCheckGuess() {
    if (!round || isResultShown || isSubmitting) return;
    const token = sessionStorage.getItem(GAME_TOKEN_KEY);
    if (!token) { setErrorMessage("Игра или кадр недоступны. Начните новую игру."); return; }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/guess", {
        method: "POST", headers: { ...gameHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ roundNumber, guessedTimestampSeconds }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error === "FRAME_UNAVAILABLE" ? "Игра или кадр недоступны. Начните новую игру." : "Не удалось загрузить раунд. Попробуйте снова.");
      }
      await restoreGame(token);
    } catch (error) { setErrorMessage(error instanceof TypeError ? "Не удалось проверить ответ. Попробуйте снова." : error instanceof Error ? error.message : "Не удалось проверить ответ."); }
    finally { setIsSubmitting(false); }
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
    if (roundNumber === ROUNDS_PER_GAME) { setScreen("results"); return; }
    const token = sessionStorage.getItem(GAME_TOKEN_KEY);
    if (!token || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try { await createRound(token); }
    catch {
      // The server may have created the round even if the response was lost.
      try { await restoreGame(token); }
      catch (error) { setErrorMessage(error instanceof TypeError ? "Не удалось проверить ответ. Попробуйте снова." : error instanceof Error ? error.message : "Не удалось проверить ответ."); }
    } finally { setIsSubmitting(false); }
  }

  async function handleReturnToMenu() {
    if (screen === "game" && !window.confirm("Выйти из игры? Матч завершится, а счёт не перенесётся в новую игру.")) return;
    const token = sessionStorage.getItem(GAME_TOKEN_KEY);
    if (token) {
      try {
        const response = await fetch("/api/session", { method: "PATCH", headers: gameHeaders(token) });
        if (!response.ok && response.status !== 404) throw new Error();
      } catch { setErrorMessage("Не удалось завершить игру. Попробуйте снова."); return; }
      sessionStorage.removeItem(GAME_TOKEN_KEY);
    }
    setRound(null);
    setSessionScore(0);
    setErrorMessage(null);
    setScreen("menu");
  }

    if (screen === "menu") {
    return (
        // <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
        // <div className="crt-bg">
        //     <img
        //     src="/5DEQH87W.jpg" 
        //     alt=""
        //     className="crt-bg-image"
        //     />
        // </div>

        // <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">

        //     <h1 className="text-6xl font-bold tracking-tight text-emerald-950 text-shadow-lg text-shadow-amber-400/20">
        //         CinemaGuesser
        //     </h1>

        //     <p className="mt-5 text-zinc-300">
        //     Угадайте, на какой минуте фильма сделан этот кадр.
        //     </p>

        //     <button
        //     type="button"
        //     onClick={handleStartGame}
        //     className="mt-10 rounded-lg bg-amber-400 px-8 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
        //     >
        //     Играть
        //     </button>
        // </div>
        // </main>

        <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
            
             <div className="crt-bg">
                <img
                    src="/5DEQH87W.jpg"
                    alt=""
                    className="crt-bg-image"
                />
            </div>

            <MenuWebGLBackground />
            
            <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">
             
                <h1 className="text-6xl font-bold tracking-tight">
                CinemaGuesser
                </h1>

                <p className="mt-2 text-zinc-300">
                Угадайте, на какой минуте фильма сделан кадр
                </p>

                <button
                type="button"
                onClick={handleStartGame}
                className="mt-10 rounded-lg bg-emerald-400 px-6 py-3 font-large text-emerald-950 transition hover:bg-emerald-300"
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
        <h1 className="fixed right-6 top-6 z-10 text-4xl font-bold tracking-tight sm:text-2xl">
            CinemaGuesser
        </h1>

        <div className="results-enter flex w-full max-w-xl flex-col items-center text-center">
          
            <p className="text-5xl font-medium text-amber-400">Игра завершена</p>
            <p className="mt-5 text-zinc-400">Набрано очков:</p>
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
            onClick={() => sessionStorage.getItem(GAME_TOKEN_KEY) ? void loadGame() : void handleStartGame()}
            className="mt-6 rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
          >
            Попробовать снова
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center bg-zinc-950 px-4 py-4 text-zinc-100 sm:px-6">
      <header className="flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReturnToMenu}
          className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          Выйти в главное меню
        </button>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          CinemaGuesser
        </h1>
      </header>

      <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center pt-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm font-medium">
          <p className="text-amber-400">
            Раунд {roundNumber} / {ROUNDS_PER_GAME}
          </p>
          <p className="text-zinc-400">Общий счёт: {sessionScore}</p>
        </div>

        <div className="game-frame relative mt-3 aspect-video w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <Image
            src={round.frameImage}
            alt={`Frame from ${round.title}`}
            fill
            priority
            className="object-contain"
          />
        </div>

        <p className="mt-2 text-sm text-zinc-400">
          {round.title} ({round.year})
        </p>

        <div className="mt-3 w-full max-w-4xl">
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>0:00</span>
            <span>{formatTime(round.runtimeSeconds)}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAdjustGuess(-1)}
              disabled={isResultShown || guessedTimestampSeconds === 0}
              className="h-11 w-11 shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="h-11 min-w-0 flex-1 cursor-pointer accent-amber-400 disabled:cursor-not-allowed"
              aria-label="Выбор момента на таймлайне фильма"
            />

            <button
              type="button"
              onClick={() => handleAdjustGuess(1)}
              disabled={
                isResultShown ||
                guessedTimestampSeconds === round.runtimeSeconds
              }
              className="h-11 w-11 shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Сдвинуть выбор на одну секунду вперёд"
              title="На секунду вперёд"
            >
              →
            </button>
          </div>

          <div className="mt-1 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-zinc-400">
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
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1" aria-live="polite">
            {differenceSeconds === 0 ? (
              <p className="text-sm font-semibold text-emerald-400">
                HEADSHOT
              </p>
            ) : (
              <p className="text-sm font-semibold text-zinc-100">
                Ошиблись на: {formatTime(differenceSeconds)}
              </p>
            )}
            <p className="text-sm text-zinc-400">
              Счёт: {guessResult.score}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">
            Передвинь маркер туда, где, по твоему мнению, находится этот кадр.
          </p>
        )}

        {errorMessage && (
          <p className="mt-2 text-sm text-red-400" role="alert">{errorMessage}</p>
        )}

        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {guessResult ? (
            <button
              type="button"
              onClick={handleNextRound}
              disabled={isSubmitting}
              className="min-h-11 rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300"
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
              className="min-h-11 rounded-lg bg-amber-400 px-6 py-3 font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {isSubmitting ? "Проверка..." : "Ответить"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
