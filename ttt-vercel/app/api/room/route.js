import { NextResponse } from "next/server";
import { redis, ROOM_TTL_SECONDS } from "@/lib/redis";
import { genCode, initialState } from "@/lib/game";

export async function POST() {
  let code = null;

  // try a few times in case of a rare collision
  for (let i = 0; i < 5; i++) {
    const candidate = genCode();
    const existing = await redis.get(`room:${candidate}`);
    if (!existing) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return NextResponse.json({ error: "could_not_allocate_code" }, { status: 500 });
  }

  const state = initialState();
  await redis.set(`room:${code}`, state, { ex: ROOM_TTL_SECONDS });

  return NextResponse.json({ code, state });
}
