import { NextResponse } from "next/server";
import { redis, ROOM_TTL_SECONDS } from "@/lib/redis";
import { emptyBoard, calcWinner } from "@/lib/game";

export async function GET(request, { params }) {
  const code = params.code.toUpperCase();
  const state = await redis.get(`room:${code}`);

  if (!state) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ state });
}

export async function POST(request, { params }) {
  const code = params.code.toUpperCase();
  const body = await request.json();
  const state = await redis.get(`room:${code}`);

  if (!state) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body.action === "join") {
    if (state.players.O) {
      return NextResponse.json({ error: "room_full" }, { status: 409 });
    }
    state.players.O = true;
    await redis.set(`room:${code}`, state, { ex: ROOM_TTL_SECONDS });
    return NextResponse.json({ state, symbol: "O" });
  }

  if (body.action === "move") {
    const { index, symbol } = body;
    const valid =
      typeof index === "number" &&
      (symbol === "X" || symbol === "O") &&
      !state.winner &&
      !state.draw &&
      state.turn === symbol &&
      !state.board[index] &&
      state.players.X &&
      state.players.O;

    if (!valid) {
      return NextResponse.json({ state });
    }

    const board = [...state.board];
    board[index] = symbol;
    const result = calcWinner(board);
    const isFull = board.every((c) => c);

    const next = {
      ...state,
      board,
      turn: symbol === "X" ? "O" : "X",
      winner: result ? result.winner : null,
      line: result ? result.line : null,
      draw: !result && isFull,
    };

    await redis.set(`room:${code}`, next, { ex: ROOM_TTL_SECONDS });
    return NextResponse.json({ state: next });
  }

  if (body.action === "reset") {
    const next = {
      ...state,
      board: emptyBoard(),
      winner: null,
      line: null,
      draw: false,
      turn: "X",
      round: (state.round || 1) + 1,
    };
    await redis.set(`room:${code}`, next, { ex: ROOM_TTL_SECONDS });
    return NextResponse.json({ state: next });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
