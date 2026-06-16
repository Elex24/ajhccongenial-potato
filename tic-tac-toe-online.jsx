import { useState, useEffect, useRef } from "react";
import { X, Circle, Copy, Check, RotateCcw, LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function emptyBoard() {
  return Array(9).fill(null);
}

function calcWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function roomKey(code) {
  return `ttt-room:${code}`;
}

export default function TicTacToeOnline() {
  const [screen, setScreen] = useState("home");
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [mySymbol, setMySymbol] = useState(null);
  const [game, setGame] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (screen !== "room" || !roomCode) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await window.storage.get(roomKey(roomCode), true);
        if (res && !cancelled) {
          const state = JSON.parse(res.value);
          setGame((prev) =>
            JSON.stringify(prev) === JSON.stringify(state) ? prev : state
          );
        }
      } catch (e) {
        // room may not exist yet between writes; ignore transient errors
      }
    }
    poll();
    pollRef.current = setInterval(poll, 1400);
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [screen, roomCode]);

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const code = genCode();
      const initial = {
        board: emptyBoard(),
        turn: "X",
        players: { X: true, O: false },
        winner: null,
        line: null,
        draw: false,
        round: 1,
      };
      const result = await window.storage.set(roomKey(code), JSON.stringify(initial), true);
      if (!result) throw new Error("write failed");
      setRoomCode(code);
      setMySymbol("X");
      setGame(initial);
      setScreen("room");
    } catch (e) {
      setError("Не удалось создать комнату. Попробуйте ещё раз.");
    }
    setBusy(false);
  }

  async function joinRoom() {
    const code = joinInput.trim().toUpperCase();
    if (!code) {
      setError("Введите код комнаты");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await window.storage.get(roomKey(code), true);
      if (!res) {
        setError("Комната не найдена. Проверьте код.");
        setBusy(false);
        return;
      }
      const state = JSON.parse(res.value);
      if (state.players.O) {
        setError("В этой комнате уже два игрока.");
        setBusy(false);
        return;
      }
      state.players.O = true;
      await window.storage.set(roomKey(code), JSON.stringify(state), true);
      setRoomCode(code);
      setMySymbol("O");
      setGame(state);
      setScreen("room");
    } catch (e) {
      setError("Комната не найдена. Проверьте код.");
    }
    setBusy(false);
  }

  async function makeMove(i) {
    if (!game || game.winner || game.draw) return;
    if (game.turn !== mySymbol) return;
    if (game.board[i]) return;
    if (!game.players.X || !game.players.O) return;

    const board = [...game.board];
    board[i] = mySymbol;
    const result = calcWinner(board);
    const isFull = board.every((c) => c);
    const next = {
      ...game,
      board,
      turn: mySymbol === "X" ? "O" : "X",
      winner: result ? result.winner : null,
      line: result ? result.line : null,
      draw: !result && isFull,
    };
    setGame(next);
    try {
      await window.storage.set(roomKey(roomCode), JSON.stringify(next), true);
    } catch (e) {
      // optimistic update stays; next poll will reconcile
    }
  }

  async function newRound() {
    if (!game) return;
    const next = {
      ...game,
      board: emptyBoard(),
      winner: null,
      line: null,
      draw: false,
      turn: "X",
      round: (game.round || 1) + 1,
    };
    setGame(next);
    try {
      await window.storage.set(roomKey(roomCode), JSON.stringify(next), true);
    } catch (e) {}
  }

  function leaveRoom() {
    clearInterval(pollRef.current);
    setScreen("home");
    setRoomCode("");
    setMySymbol(null);
    setGame(null);
    setJoinInput("");
    setError("");
  }

  function copyCode() {
    try {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  }

  const bothOnline = game && game.players.X && game.players.O;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 font-sans"
      style={{
        background:
          "radial-gradient(circle at 20% 15%, #132036 0%, #0a0e1a 45%, #060810 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
            Онлайн · Любая точка мира
          </p>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight mt-1">
            Крестики-Нолики
          </h1>
        </div>

        {screen === "home" && (
          <div className="space-y-4">
            <button
              onClick={createRoom}
              disabled={busy}
              className="w-full rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold py-4 px-5 transition-colors flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Создать комнату
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
                или
              </span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <label className="text-sm text-slate-400">
                Есть код от друга? Введите его:
              </label>
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="НАПР. K7QX"
                maxLength={4}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-lg tracking-widest text-center py-3 px-3 outline-none focus:border-cyan-500"
              />
              <button
                onClick={joinRoom}
                disabled={busy}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 font-semibold py-3 transition-colors"
              >
                Присоединиться
              </button>
            </div>

            {error && (
              <p className="text-rose-400 text-sm text-center">{error}</p>
            )}
          </div>
        )}

        {screen === "room" && game && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">
                  Код комнаты
                </p>
                <p className="text-2xl font-mono font-bold text-slate-100 tracking-widest">
                  {roomCode}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 transition-colors"
                aria-label="Скопировать код"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {!bothOnline ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto" />
                <p className="text-slate-300 font-medium">Ждём соперника…</p>
                <p className="text-slate-500 text-sm">
                  Отправьте код <span className="font-mono text-slate-300">{roomCode}</span> другу
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    Оба онлайн
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Вы:</span>
                    {mySymbol === "X" ? (
                      <X className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-pink-400" />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  {game.winner ? (
                    <p className="text-lg font-semibold text-slate-100">
                      {game.winner === mySymbol ? "Вы победили! 🎉" : "Соперник победил"}
                    </p>
                  ) : game.draw ? (
                    <p className="text-lg font-semibold text-slate-300">Ничья</p>
                  ) : (
                    <p className="text-lg font-medium text-slate-300">
                      {game.turn === mySymbol ? "Ваш ход" : "Ход соперника"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {game.board.map((cell, i) => {
                    const isWinning = game.line && game.line.includes(i);
                    const canPlay =
                      !cell && !game.winner && !game.draw && game.turn === mySymbol;
                    return (
                      <button
                        key={i}
                        onClick={() => makeMove(i)}
                        disabled={!canPlay}
                        className={`aspect-square rounded-2xl border flex items-center justify-center transition-colors ${
                          isWinning
                            ? "border-amber-400 bg-amber-400/10"
                            : "border-slate-800 bg-slate-900"
                        } ${canPlay ? "hover:border-slate-600" : ""}`}
                        style={isWinning ? { backgroundColor: "rgba(251,191,36,0.12)" } : undefined}
                      >
                        {cell === "X" && <X className="w-10 h-10 text-cyan-400" strokeWidth={2.5} />}
                        {cell === "O" && <Circle className="w-9 h-9 text-pink-400" strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>

                {(game.winner || game.draw) && (
                  <button
                    onClick={newRound}
                    className="w-full rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3.5 flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Играть ещё раз
                  </button>
                )}
              </>
            )}

            <button
              onClick={leaveRoom}
              className="w-full rounded-2xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выйти из комнаты
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
